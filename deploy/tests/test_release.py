import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location("release", Path(__file__).parents[1] / "release.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
SHA = "a" * 40
IMAGE = "ghcr.io/quanh712/cipher-workbench@sha256:" + "b" * 64


class ReleaseTests(unittest.TestCase):
    def test_mutable_or_other_registry_image_rejected(self):
        for image in ("ghcr.io/quanh712/cipher-workbench:latest", IMAGE.replace("quanh712", "other")):
            with self.subTest(image=image), self.assertRaises(ValueError):
                release.validate_candidate(image, SHA)

    @patch.object(release, "request")
    def test_wrong_running_release_cannot_pass_smoke(self, request):
        request.side_effect = [
            {"success": True, "result": {"database": "disabled", "history": "disabled"}},
            {"revision": "c" * 40},
        ]
        with self.assertRaisesRegex(RuntimeError, "Running release"):
            release.smoke("https://staging.example.com", SHA)

    @patch.object(release, "request")
    @patch.dict(os.environ, {"RENDER_API_KEY": "unit-test-placeholder"})
    def test_live_deploy_with_wrong_digest_is_rejected(self, request):
        request.side_effect = [{"id": "dep-test"}, {"status": "live", "image": {"ref": IMAGE + "bad"}}]
        with self.assertRaisesRegex(RuntimeError, "image does not match"):
            release.deploy(IMAGE, SHA, "srv-test", "https://staging.example.com")

    @patch.object(release, "smoke")
    @patch.object(release.subprocess, "run")
    @patch.object(release, "gh_json")
    @patch.dict(os.environ, {
        "GITHUB_REPOSITORY": "quanh712/cipher-workbench",
        "RENDER_STAGING_SERVICE_ID": "srv-test",
        "RENDER_STAGING_URL": "https://staging.example.com",
    })
    def test_main_extra_changes_block_promotion(self, gh, run, smoke):
        gh.return_value = {"conclusion": "success", "event": "workflow_dispatch", "head_branch": "staging",
                           "path": ".github/workflows/staging.yml", "head_sha": SHA,
                           "repository": {"full_name": "quanh712/cipher-workbench"}}
        evidence = {"schema": 1, "repository": "quanh712/cipher-workbench", "run_id": "123",
                    "image": IMAGE, "revision": SHA, "service_id": "srv-test",
                    "url": "https://staging.example.com", "checks": {
                        "health": "passed", "release": "passed", "caesar": "passed", "frontend": "passed"}}
        run.side_effect = [MagicMock(returncode=0), subprocess.CalledProcessError(1, "git diff")]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "release.json"
            path.write_text(json.dumps(evidence))
            with self.assertRaises(subprocess.CalledProcessError):
                release.verify_evidence(path, "123")
        smoke.assert_not_called()


if __name__ == "__main__":
    unittest.main()
