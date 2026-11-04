#!/usr/bin/env python3
"""One-time FREE staging bootstrap. Dry-run by default; never creates production."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shlex
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.render.com/v1"
NAME = "cipher-workbench-staging"
CREDENTIAL_NAME = "cipher-workbench-ghcr"
IMAGE_PATTERN = re.compile(r"ghcr\.io/quanh712/cipher-workbench@sha256:[0-9a-f]{64}\Z")


def load_credentials(path):
    """Read simple KEY=value configuration without sourcing shell code."""
    allowed = {"RENDER_API_KEY", "GHCR_READ_TOKEN"}
    values = {}
    for number, line in enumerate(Path(path).expanduser().read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, raw = line.partition("=")
        key = key.strip()
        if not separator or not re.fullmatch(r"[A-Z_][A-Z0-9_]*", key):
            raise ValueError(f"Invalid credential file syntax at line {number}")
        if key not in allowed:
            continue
        try:
            parts = shlex.split(raw, comments=True, posix=True)
        except ValueError:
            raise ValueError(f"Invalid credential file quoting at line {number}") from None
        if len(parts) != 1 or not parts[0] or "$" in parts[0] or "`" in parts[0]:
            raise ValueError(f"Credential must be a literal nonempty value at line {number}")
        if key in values:
            raise ValueError(f"Duplicate credential key at line {number}")
        values[key] = parts[0]
    if "RENDER_API_KEY" not in values:
        raise ValueError("Credential file must contain RENDER_API_KEY")
    return values


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class RenderAPI:
    def __init__(self, token):
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect)

    def request(self, path, *, body=None):
        if not path.startswith("/") or path.startswith("//"):
            raise ValueError("Render API path must be relative")
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode()
        req = urllib.request.Request(API + path, headers=headers, data=data)
        try:
            with self.opener.open(req, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            # Provider bodies may reflect credentials; never show them or the payload.
            raise RuntimeError(f"Render API returned HTTP {exc.code}; check account/configuration") from None
        except urllib.error.URLError:
            raise RuntimeError("Could not reach Render API") from None

    def items(self, path, wrapper=None, **filters):
        """Paginate cursor-wrapped owners/services; registry credentials are plain arrays."""
        found = []
        cursor = None
        seen = set()
        while True:
            query = {**filters, "limit": 100}
            if cursor:
                query["cursor"] = cursor
            page = self.request(path + "?" + urllib.parse.urlencode(query))
            if not isinstance(page, list):
                raise RuntimeError("Unexpected Render list response")
            found.extend(item[wrapper] if wrapper else item for item in page)
            if len(page) < 100:
                return found
            cursor = page[-1].get("cursor")
            if not cursor or cursor in seen:
                raise RuntimeError("Cannot safely paginate Render list; refusing ambiguous discovery")
            seen.add(cursor)


def select_owner(owners, explicit=None):
    if explicit:
        if explicit not in {owner["id"] for owner in owners}:
            raise ValueError("Requested owner ID is not available to this API key")
        return explicit
    if len(owners) != 1:
        raise ValueError("Multiple or no Render owners available; pass --owner-id explicitly")
    return owners[0]["id"]


def service_payload(image, owner_id, credential_id):
    if not IMAGE_PATTERN.fullmatch(image):
        raise ValueError("Use the tested project image pinned by full sha256 digest")
    return {
        "type": "web_service", "name": NAME, "ownerId": owner_id,
        "autoDeployTrigger": "off",
        "image": {"imagePath": image, "ownerId": owner_id,
                  "registryCredentialId": credential_id},
        "envVars": [
            {"key": "DATABASE_URL", "value": ""},
            {"key": "HISTORY_API_ENABLED", "value": "false"},
            {"key": "HISTORY_COOKIE_SECURE", "value": "true"},
            {"key": "PUBLIC_MODE", "value": "true"},
        ],
        "serviceDetails": {
            "runtime": "image", "plan": "free", "region": "singapore",
            "numInstances": 1, "healthCheckPath": "/api/health",
        },
    }


def verify_existing(service, owner_id):
    details = service.get("serviceDetails", {})
    runtime = details.get("runtime", details.get("env"))
    if (service.get("name") != NAME or service.get("ownerId") != owner_id
            or service.get("type") != "web_service" or service.get("repo")
            or runtime != "image" or details.get("plan") != "free"
            or details.get("region") != "singapore" or details.get("disk")
            or details.get("numInstances", 1) != 1
            or details.get("healthCheckPath") != "/api/health"
            or not (service.get("registryCredential") or {}).get("id")
            or not IMAGE_PATTERN.fullmatch(service.get("imagePath") or "")):
        raise ValueError("Existing staging service differs from the private FREE image configuration; no changes made")


def bootstrap(api, image, credentials, owner_id=None):
    # Validate image before any API write.
    service_payload(image, "pending-owner", "pending-credential")
    owner_id = select_owner(api.items("/owners", "owner"), owner_id)
    services = [s for s in api.items("/services", "service", ownerId=owner_id, name=NAME)
                if s.get("name") == NAME and s.get("ownerId") == owner_id]
    if len(services) > 1:
        raise ValueError("More than one matching staging service; no changes made")
    if services:
        existing = services[0]
        verify_existing(existing, owner_id)
        env_rows = api.items(f"/services/{existing['id']}/env-vars", "envVar")
        env = {item["key"]: item.get("value", "") for item in env_rows}
        if env.get("DATABASE_URL", "") or env.get("HISTORY_API_ENABLED", "false").lower() != "false":
            raise ValueError("Existing staging database/history configuration is enabled; no changes made")
        if env.get("PUBLIC_MODE", "true").lower() != "true":
            raise ValueError("Existing staging is not in public mode; no changes made")
        if env.get("HISTORY_COOKIE_SECURE", "true").lower() != "true":
            raise ValueError("Existing staging cookie security differs; no changes made")
        return {"service_id": existing["id"], "url": existing["serviceDetails"].get("url"),
                "owner_id": owner_id, "created": False, "image": existing["imagePath"]}

    matches = [c for c in api.items("/registrycredentials", ownerId=owner_id, name=CREDENTIAL_NAME)
               if c.get("name") == CREDENTIAL_NAME]
    if len(matches) > 1:
        raise ValueError("More than one matching registry credential; no changes made")
    if matches:
        credential = matches[0]
        if credential.get("registry") != "GITHUB" or credential.get("username") != "quanh712":
            raise ValueError("Existing registry credential has a different registry/account; no changes made")
    else:
        read_token = credentials.get("GHCR_READ_TOKEN")
        if not read_token:
            raise ValueError("GHCR_READ_TOKEN is required to create the private registry credential")
        credential = api.request("/registrycredentials", body={
            "name": CREDENTIAL_NAME, "ownerId": owner_id, "registry": "GITHUB",
            "username": "quanh712", "authToken": read_token,
        })
    result = api.request("/services", body=service_payload(image, owner_id, credential["id"]))
    service = result["service"]
    return {"service_id": service["id"], "url": service.get("serviceDetails", {}).get("url"),
            "owner_id": owner_id, "deploy_id": result.get("deployId"),
            "created": True, "image": image}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Digest from successful bootstrap CI run")
    parser.add_argument("--owner-id", help="Required when the API key sees multiple owners")
    parser.add_argument("--env-file", default="~/.config/cipher-workbench/render.env")
    parser.add_argument("--apply", action="store_true", help="Create FREE staging resources; starts initial image deploy")
    parser.add_argument("--output", help="Write non-secret service IDs/URL to this JSON file")
    args = parser.parse_args(argv)
    if not args.apply:
        result = {"dry_run": True, "network_requests": False, "production": False,
                  "service": service_payload(args.image, args.owner_id or "<select-owner>", "<private-ghcr-credential>")}
    else:
        credentials = load_credentials(args.env_file)
        result = bootstrap(RenderAPI(credentials["RENDER_API_KEY"]), args.image, credentials, args.owner_id)
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(text)
    print(text, end="")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError) as exc:
        # Do not print paths, provider bodies, exception payloads, or local file contents.
        if isinstance(exc, (ValueError, RuntimeError)):
            print(str(exc), file=sys.stderr)
        else:
            print("Bootstrap failed; check local configuration and Render API response shape", file=sys.stderr)
        raise SystemExit(1) from None
