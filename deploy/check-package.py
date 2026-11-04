#!/usr/bin/env python3
"""Fail before publishing if the existing GHCR package is not private."""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--allow-missing", action="store_true")
args = parser.parse_args()
result = subprocess.run(
    ["gh", "api", "/users/quanh712/packages/container/cipher-workbench"],
    capture_output=True, text=True,
)
if result.returncode:
    if args.allow_missing and "(HTTP 404)" in result.stderr:
        print("Package does not exist; GHCR creates new packages private by default")
    else:
        raise SystemExit("Unable to verify GHCR package privacy; publishing blocked")
elif json.loads(result.stdout).get("visibility") != "private":
    raise SystemExit("GHCR package is not private; publishing blocked")
else:
    print("Verified private GHCR package")
