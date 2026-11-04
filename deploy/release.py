#!/usr/bin/env python3
"""Deploy immutable images and verify staging evidence. Standard library only."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request

IMAGE = re.compile(r"ghcr\.io/quanh712/cipher-workbench@sha256:[0-9a-f]{64}\Z")
REVISION = re.compile(r"[0-9a-f]{40}\Z")
TERMINAL_FAILURES = {"build_failed", "update_failed", "canceled", "pre_deploy_failed", "deactivated"}


def request(url, *, token=None, body=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None if body is None else json.dumps(body).encode()
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        # Never include request headers, token, or provider error bodies in CI logs.
        raise RuntimeError(f"HTTP {exc.code} from {req.host}") from None


def validate_candidate(image, revision):
    if not IMAGE.fullmatch(image) or not REVISION.fullmatch(revision):
        raise ValueError("Expected the private project image pinned by digest and a full Git SHA")


def smoke(base_url, revision):
    if not base_url.startswith("https://") or "@" in base_url or "?" in base_url:
        raise ValueError("Service URL must be HTTPS without credentials or query")
    base_url = base_url.rstrip("/")
    health = request(base_url + "/api/health")
    if health.get("success") is not True or health.get("result", {}).get("database") != "disabled":
        raise RuntimeError("Free deployment must report database disabled")
    if health.get("result", {}).get("history") != "disabled":
        raise RuntimeError("Server history must be disabled")
    if request(base_url + "/api/release").get("revision") != revision:
        raise RuntimeError("Running release does not match the tested Git revision")
    result = request(base_url + "/api/caesar/encrypt", body={"text": "ABC", "key": 3})
    if result.get("success") is not True or result.get("result") != "DEF":
        raise RuntimeError("Caesar API smoke failed")
    with urllib.request.urlopen(base_url + "/", timeout=30) as response:
        if b'<div id="root">' not in response.read():
            raise RuntimeError("Built frontend is not being served")
    return {"health": "passed", "release": "passed", "caesar": "passed", "frontend": "passed"}


def deploy(image, revision, service_id, url, *, output=None):
    validate_candidate(image, revision)
    if not re.fullmatch(r"srv-[a-zA-Z0-9]+", service_id):
        raise ValueError("Invalid Render service ID")
    token = os.environ.get("RENDER_API_KEY")
    if not token:
        raise ValueError("RENDER_API_KEY is required")
    endpoint = f"https://api.render.com/v1/services/{service_id}/deploys"
    created = request(endpoint, token=token, body={"imageUrl": image})
    deploy_id = created["id"]
    if not re.fullmatch(r"dep-[a-zA-Z0-9]+", deploy_id):
        raise RuntimeError("Render returned an invalid deployment ID")
    print(f"Waiting for deployment {deploy_id}", flush=True)
    deadline = time.monotonic() + 1200
    while time.monotonic() < deadline:
        current = request(f"{endpoint}/{deploy_id}", token=token)
        status = current["status"]
        if status in TERMINAL_FAILURES:
            raise RuntimeError(f"Render deployment ended with {status}")
        if status == "live":
            if current.get("image", {}).get("ref") != image:
                raise RuntimeError("Render deployment image does not match requested digest")
            break
        time.sleep(10)
    else:
        raise RuntimeError("Timed out waiting for Render deployment")
    # Poll smoke separately: a successful deploy is not sufficient release evidence.
    deadline = time.monotonic() + 180
    while True:
        try:
            checks = smoke(url, revision)
            break
        except (RuntimeError, OSError, ValueError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(10)
    evidence = {"schema": 1, "image": image, "revision": revision,
                "deploy_id": deploy_id, "service_id": service_id,
                "url": url, "checks": checks,
                "run_id": os.environ.get("GITHUB_RUN_ID"),
                "repository": os.environ.get("GITHUB_REPOSITORY")}
    if output:
        Path(output).write_text(json.dumps(evidence, indent=2) + "\n")
    print(f"Verified deployment {deploy_id} at revision {revision}", flush=True)


def gh_json(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


def verify_evidence(path, run_id):
    if not str(run_id).isdigit():
        raise ValueError("Staging run ID must be numeric")
    repo = os.environ["GITHUB_REPOSITORY"]
    run = gh_json(f"repos/{repo}/actions/runs/{run_id}")
    if (run.get("conclusion") != "success" or run.get("event") != "workflow_dispatch"
            or run.get("head_branch") != "staging"
            or run.get("path") != ".github/workflows/staging.yml"
            or run.get("repository", {}).get("full_name") != repo):
        raise ValueError("Run must be this repository's successful manual staging-branch workflow")
    evidence = json.loads(Path(path).read_text())
    validate_candidate(evidence["image"], evidence["revision"])
    if (evidence.get("schema") != 1 or evidence.get("repository") != repo
            or str(evidence.get("run_id")) != str(run_id)
            or evidence["revision"] != run["head_sha"]
            or evidence.get("service_id") != os.environ["RENDER_STAGING_SERVICE_ID"]
            or evidence.get("url") != os.environ["RENDER_STAGING_URL"]
            or evidence.get("checks") != {"health": "passed", "release": "passed", "caesar": "passed", "frontend": "passed"}):
        raise ValueError("Staging evidence does not match trusted workflow metadata")
    subprocess.run(["git", "merge-base", "--is-ancestor", evidence["revision"], "HEAD"], check=True)
    # A newer main with extra source changes has NOT been tested by this artifact.
    subprocess.run(["git", "diff", "--quiet", evidence["revision"], "HEAD", "--"], check=True)
    smoke(evidence["url"], evidence["revision"])
    print("Verified staging evidence, main ancestry, identical source tree, and live staging")
    return evidence


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    stage = commands.add_parser("deploy")
    for arg in ("image", "revision", "service-id", "url"):
        stage.add_argument("--" + arg, required=True)
    stage.add_argument("--output")
    promote = commands.add_parser("promote")
    promote.add_argument("--evidence", required=True)
    promote.add_argument("--run-id", required=True)
    args = parser.parse_args()
    if args.command == "deploy":
        deploy(args.image, args.revision, args.service_id, args.url, output=args.output)
    else:
        evidence = verify_evidence(args.evidence, args.run_id)
        deploy(evidence["image"], evidence["revision"], os.environ["RENDER_PRODUCTION_SERVICE_ID"],
               os.environ["RENDER_PRODUCTION_URL"], output="production-release.json")


if __name__ == "__main__":
    main()
