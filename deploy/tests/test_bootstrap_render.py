import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock
import urllib.error

spec = importlib.util.spec_from_file_location("bootstrap_render", Path(__file__).parents[1] / "bootstrap-render.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
IMAGE = "ghcr.io/quanh712/cipher-workbench@sha256:" + "c" * 64


class BootstrapRenderTests(unittest.TestCase):
    def test_payload_is_explicitly_free_and_no_storage(self):
        payload = bootstrap.service_payload(IMAGE, "usr-test", "rgy-test")
        self.assertEqual(payload["serviceDetails"], {
            "runtime": "image", "plan": "free", "region": "singapore",
            "numInstances": 1, "healthCheckPath": "/api/health",
        })
        self.assertEqual(payload["type"], "web_service")
        self.assertNotIn("repo", payload)
        env = {row["key"]: row["value"] for row in payload["envVars"]}
        self.assertEqual(env["DATABASE_URL"], "")
        self.assertEqual(env["HISTORY_API_ENABLED"], "false")

    def test_dry_run_needs_neither_credentials_nor_network(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            bootstrap.main(["--image", IMAGE, "--env-file", "/no-such-file"])
        result = json.loads(output.getvalue())
        self.assertTrue(result["dry_run"])
        self.assertFalse(result["network_requests"])
        self.assertFalse(result["production"])

    def test_ambiguous_owner_never_guessed(self):
        with self.assertRaisesRegex(ValueError, "owner-id"):
            bootstrap.select_owner([{"id": "usr-one"}, {"id": "tea-two"}])
        self.assertEqual(bootstrap.select_owner([{"id": "usr-one"}], "usr-one"), "usr-one")

    def test_service_discovery_conflict_cannot_create_registry_or_service(self):
        api = MagicMock()
        api.items.side_effect = [[{"id": "usr-test"}], [{"name": bootstrap.NAME, "ownerId": "usr-test", "type": "web_service", "serviceDetails": {"plan": "starter"}}]]
        with self.assertRaisesRegex(ValueError, "no changes made"):
            bootstrap.bootstrap(api, IMAGE, {"GHCR_READ_TOKEN": "secret-unit-test"})
        api.request.assert_not_called()

    def test_existing_free_service_is_reused_without_any_write(self):
        api = MagicMock()
        details = bootstrap.service_payload(IMAGE, "usr-test", "rgy-test")["serviceDetails"]
        details["url"] = "https://staging.example.com"
        existing = {"id": "srv-test", "name": bootstrap.NAME, "ownerId": "usr-test",
                    "type": "web_service", "imagePath": IMAGE, "registryCredential": {"id": "rgy-test"},
                    "serviceDetails": details}
        api.items.side_effect = [[{"id": "usr-test"}], [existing], [
            {"key": "DATABASE_URL", "value": ""},
            {"key": "PUBLIC_MODE", "value": "true"},
            {"key": "HISTORY_API_ENABLED", "value": "false"},
        ]]
        result = bootstrap.bootstrap(api, IMAGE, {})
        self.assertFalse(result["created"])
        self.assertEqual(result["service_id"], "srv-test")
        api.request.assert_not_called()

    def test_creation_passes_token_only_to_registry_request_without_printing_it(self):
        api = MagicMock()
        api.items.side_effect = [[{"id": "usr-test"}], [], []]
        api.request.side_effect = [{"id": "rgy-test"}, {"service": {"id": "srv-test", "serviceDetails": {"url": "https://staging.example.com"}}, "deployId": "dep-test"}]
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            result = bootstrap.bootstrap(api, IMAGE, {"GHCR_READ_TOKEN": "secret-unit-test"})
        self.assertTrue(result["created"])
        self.assertNotIn("secret-unit-test", output.getvalue())
        registry = api.request.call_args_list[0]
        self.assertEqual(registry.args[0], "/registrycredentials")
        self.assertEqual(registry.kwargs["body"]["authToken"], "secret-unit-test")
        self.assertEqual(api.request.call_args_list[1].kwargs["body"]["serviceDetails"]["plan"], "free")

    def test_provider_error_body_is_not_exposed(self):
        api = bootstrap.RenderAPI("secret-unit-test")
        api.opener = MagicMock()
        api.opener.open.side_effect = urllib.error.HTTPError("https://api.render.com/v1/services", 400, "bad request", {}, io.BytesIO(b"secret-unit-test"))
        with self.assertRaises(RuntimeError) as raised:
            api.request("/services", body={"authToken": "secret-unit-test"})
        self.assertNotIn("secret-unit-test", str(raised.exception))

    def test_credential_file_is_literal_and_quoting_errors_do_not_expose_values(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "render.env"
            path.write_text("export RENDER_API_KEY='secret-unit-test'\nGHCR_READ_TOKEN=read-unit-test # comment\n")
            self.assertEqual(bootstrap.load_credentials(path)["RENDER_API_KEY"], "secret-unit-test")
            path.write_text("RENDER_API_KEY='secret-unit-test\n")
            with self.assertRaises(ValueError) as raised:
                bootstrap.load_credentials(path)
            self.assertNotIn("secret-unit-test", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
