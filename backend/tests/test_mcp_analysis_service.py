import asyncio
import base64
import tempfile
import unittest
import sys
import types
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

fastapi_module = types.ModuleType("fastapi")


class HTTPException(Exception):
    def __init__(self, status_code, detail=None, headers=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.headers = headers or {}


def passthrough_dependency(*_args, **_kwargs):
    return None


fastapi_module.Depends = passthrough_dependency
fastapi_module.Header = passthrough_dependency
fastapi_module.HTTPException = HTTPException
fastapi_module.Request = object
fastapi_module.Response = object
fastapi_module.UploadFile = object
fastapi_module.status = types.SimpleNamespace(HTTP_401_UNAUTHORIZED=401)
sys.modules.setdefault("fastapi", fastapi_module)
sys.modules.setdefault("httpx", types.ModuleType("httpx"))

pydantic_settings_module = types.ModuleType("pydantic_settings")


class BaseSettings:
    def __init__(self, **kwargs):
        for name, value in self.__class__.__dict__.items():
            if name.startswith("_") or name == "model_config" or callable(value):
                continue
            setattr(self, name, kwargs.get(name, value))


def SettingsConfigDict(**kwargs):
    return kwargs


pydantic_settings_module.BaseSettings = BaseSettings
pydantic_settings_module.SettingsConfigDict = SettingsConfigDict
sys.modules.setdefault("pydantic_settings", pydantic_settings_module)

from core import auth
from core import analysis_service
from core import mcp_server
from core.storage import SQLiteStore


class MCPAnalysisServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.store = SQLiteStore(f"{self.tmpdir.name}/test.sqlite3")
        self.store.connect()
        auth.set_store(self.store)

        self.old_api_key_pepper = auth.settings.api_key_pepper
        self.old_session_secret = auth.settings.session_secret
        self.old_read_limit = auth.settings.rate_limit_reads_per_minute
        self.old_hour_limit = auth.settings.rate_limit_analysis_per_hour
        self.old_day_limit = auth.settings.rate_limit_analysis_per_day
        self.old_active_limit = auth.settings.rate_limit_active_analyses_per_user
        self.old_max_upload_bytes = auth.settings.max_upload_bytes

        auth.settings.api_key_pepper = "test-api-key-pepper"
        auth.settings.session_secret = "test-session-secret"
        auth.settings.rate_limit_reads_per_minute = 100
        auth.settings.rate_limit_analysis_per_hour = 100
        auth.settings.rate_limit_analysis_per_day = 100
        auth.settings.rate_limit_active_analyses_per_user = 5
        auth.settings.max_upload_bytes = 1024

        self.user = self.store.create_or_update_user(
            {
                "sub": "google-mcp-user",
                "email": "mcp@example.com",
                "email_verified": True,
                "name": "MCP User",
                "picture": None,
            }
        )
        self.raw_key = auth.generate_api_key()
        self.api_key = self.store.create_api_key(
            self.user["id"],
            "MCP key",
            self.raw_key[:18],
            auth.hash_api_key(self.raw_key),
        )
        self.api_context = {"user_id": self.user["id"], "api_key_id": self.api_key["id"]}

    def tearDown(self):
        auth.settings.api_key_pepper = self.old_api_key_pepper
        auth.settings.session_secret = self.old_session_secret
        auth.settings.rate_limit_reads_per_minute = self.old_read_limit
        auth.settings.rate_limit_analysis_per_hour = self.old_hour_limit
        auth.settings.rate_limit_analysis_per_day = self.old_day_limit
        auth.settings.rate_limit_active_analyses_per_user = self.old_active_limit
        auth.settings.max_upload_bytes = self.old_max_upload_bytes
        self.store.close()
        self.tmpdir.cleanup()

    def test_mcp_submit_list_get_events_and_wait_use_shared_job_path(self):
        scheduled = []
        content = b"%PDF-1.4\nminimal test fixture\n"
        content_base64 = base64.b64encode(content).decode("ascii")

        payload = asyncio.run(
            mcp_server.submit_analysis_for_api_context(
                self.api_context,
                filename="paper.pdf",
                content_base64=content_base64,
                mime_type="application/pdf",
                schedule_pipeline=lambda analysis_id, filename, body, llm_settings: scheduled.append(
                    (analysis_id, filename, body, llm_settings)
                ),
            )
        )

        self.assertEqual(payload["status"], "processing")
        self.assertEqual(len(scheduled), 1)
        analysis_id, scheduled_filename, scheduled_body, scheduled_llm_settings = scheduled[0]
        self.assertEqual(payload["analysis_id"], analysis_id)
        self.assertEqual(scheduled_filename, "paper.pdf")
        self.assertEqual(scheduled_body, content)
        self.assertIsNone(scheduled_llm_settings)

        record = self.store.get_analysis(analysis_id)
        self.assertEqual(record["source"], "mcp")
        self.assertEqual(record["owner_user_id"], self.user["id"])
        self.assertEqual(record["api_key_id"], self.api_key["id"])

        self.store.append_analysis_log(analysis_id, "Parsing document")
        listing = mcp_server.list_analyses_for_api_context(self.api_context)
        self.assertEqual(listing["analyses"][0]["analysis_id"], analysis_id)

        fetched = mcp_server.get_analysis_for_api_context(self.api_context, analysis_id)
        self.assertEqual(fetched["analysis_id"], analysis_id)
        self.assertEqual(fetched["status"], "processing")

        events = mcp_server.get_analysis_events_for_api_context(self.api_context, analysis_id)
        self.assertEqual(events["events"], [{"index": 0, "message": "Parsing document"}])
        self.assertEqual(events["next_index"], 1)

        self.store.set_analysis_failed(analysis_id, "unit-test failure")
        waited = asyncio.run(
            mcp_server.wait_for_analysis_for_api_context(
                self.api_context,
                analysis_id,
                timeout_seconds=0,
            )
        )
        self.assertEqual(waited["status"], "failed")
        self.assertEqual(waited["analysis"]["error"], "unit-test failure")

    def test_decode_base64_document_rejects_invalid_payload(self):
        with self.assertRaises(Exception) as ctx:
            analysis_service.decode_base64_document("not valid base64")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_submission_schedules_owner_custom_ai_settings(self):
        self.store.upsert_user_ai_settings(
            self.user["id"],
            endpoint="https://models.example.com/v1",
            model_name="private-reviewer",
            api_key="private-key",
        )
        scheduled = []

        submission = analysis_service.create_analysis_job_from_bytes(
            filename="private.pdf",
            content=b"%PDF-1.4\nprivate model route\n",
            owner_user_id=self.user["id"],
            api_key_id=self.api_key["id"],
            source="api",
            rate_subject=f"api_key:{self.api_key['id']}",
            schedule_pipeline=lambda analysis_id, filename, body, llm_settings: scheduled.append(llm_settings),
            mime_type="application/pdf",
        )

        self.assertEqual(submission.payload["status"], "processing")
        self.assertEqual(len(scheduled), 1)
        self.assertEqual(scheduled[0]["endpoint"], "https://models.example.com/v1")
        self.assertEqual(scheduled[0]["model_name"], "private-reviewer")
        self.assertEqual(scheduled[0]["api_key"], "private-key")

    def test_upload_validation_rejects_bad_extension_empty_and_oversized_files(self):
        with self.assertRaises(Exception) as bad_extension:
            analysis_service.validate_upload_bytes("paper.txt", b"content")
        self.assertEqual(bad_extension.exception.status_code, 400)

        with self.assertRaises(Exception) as empty:
            analysis_service.validate_upload_bytes("paper.pdf", b"")
        self.assertEqual(empty.exception.status_code, 400)

        auth.settings.max_upload_bytes = 3
        with self.assertRaises(Exception) as oversized:
            analysis_service.validate_upload_bytes("paper.pdf", b"1234")
        self.assertEqual(oversized.exception.status_code, 413)

    def test_wait_returns_after_new_event_arrives(self):
        self.store.create_analysis("analysis-wait", self.user["id"], self.api_key["id"], "paper.pdf", "mcp", "hash")

        async def append_later():
            await asyncio.sleep(0.01)
            self.store.append_analysis_log("analysis-wait", "New progress")
            analysis_service.progress_manager.emit("analysis-wait", "New progress")

        async def wait_for_event():
            task = asyncio.create_task(append_later())
            result = await mcp_server.wait_for_analysis_for_api_context(
                self.api_context,
                "analysis-wait",
                timeout_seconds=1,
            )
            await task
            return result

        result = asyncio.run(wait_for_event())
        self.assertEqual(result["events"], [{"index": 0, "message": "New progress"}])


if __name__ == "__main__":
    unittest.main()
