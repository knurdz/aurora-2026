import tempfile
import time
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
from core.storage import SQLiteStore


class AuthStorageTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.store = SQLiteStore(f"{self.tmpdir.name}/test.sqlite3")
        self.store.connect()
        auth.set_store(self.store)
        self.old_session_secret = auth.settings.session_secret
        self.old_api_key_pepper = auth.settings.api_key_pepper
        auth.settings.session_secret = "test-session-secret"
        auth.settings.api_key_pepper = "test-api-key-pepper"

    def tearDown(self):
        auth.settings.session_secret = self.old_session_secret
        auth.settings.api_key_pepper = self.old_api_key_pepper
        self.store.close()
        self.tmpdir.cleanup()

    def create_user(self, sub="google-123", email="user@example.com"):
        return self.store.create_or_update_user(
            {
                "sub": sub,
                "email": email,
                "email_verified": True,
                "name": "Test User",
                "picture": "https://example.com/avatar.png",
            }
        )

    def test_oauth_state_is_single_use(self):
        state = "state-token"
        state_hash = auth.hash_oauth_state(state)
        self.store.create_oauth_state(state_hash, "nonce-token", "/dashboard", ttl_seconds=60)

        consumed = self.store.consume_oauth_state(state_hash)
        self.assertIsNotNone(consumed)
        self.assertEqual(consumed["nonce"], "nonce-token")
        self.assertIsNone(self.store.consume_oauth_state(state_hash))

    def test_session_lookup_and_revocation(self):
        user = self.create_user()
        raw_token = "session-token"
        token_hash = auth.hash_session_token(raw_token)
        self.store.create_session(
            token_hash=token_hash,
            user_id=user["id"],
            expires_at=int(time.time()) + 60,
            user_agent="unit-test",
            ip_address="127.0.0.1",
        )

        session_user = self.store.get_user_for_session(token_hash)
        self.assertEqual(session_user["email"], "user@example.com")

        self.store.revoke_session(token_hash)
        self.assertIsNone(self.store.get_user_for_session(token_hash))

    def test_api_keys_are_hashed_and_revocable(self):
        user = self.create_user()
        raw_key = auth.generate_api_key()
        key_hash = auth.hash_api_key(raw_key)
        created = self.store.create_api_key(user["id"], "CI key", raw_key[:18], key_hash)

        self.assertTrue(raw_key.startswith("vs_live_"))
        self.assertNotIn(raw_key, str(created))
        self.assertEqual(self.store.get_api_key_by_hash(key_hash)["api_key_id"], created["id"])

        self.assertTrue(self.store.revoke_api_key(user["id"], created["id"]))
        self.assertIsNone(self.store.get_api_key_by_hash(key_hash))

    def test_verify_api_key_returns_context_and_touches_usage(self):
        user = self.create_user()
        raw_key = auth.generate_api_key()
        created = self.store.create_api_key(user["id"], "MCP key", raw_key[:18], auth.hash_api_key(raw_key))

        context = auth.verify_api_key(raw_key)

        self.assertEqual(context["api_key_id"], created["id"])
        self.assertEqual(context["user_id"], user["id"])
        touched = self.store.get_api_key_for_user(user["id"], created["id"])
        self.assertEqual(touched["usage_total"], 1)

    def test_verify_api_key_rejects_missing_malformed_and_revoked_keys(self):
        user = self.create_user()
        raw_key = auth.generate_api_key()
        created = self.store.create_api_key(user["id"], "MCP key", raw_key[:18], auth.hash_api_key(raw_key))

        self.assertIsNone(auth.verify_api_key(None))
        self.assertIsNone(auth.verify_api_key("not-a-verischolar-key"))

        self.assertTrue(self.store.revoke_api_key(user["id"], created["id"]))
        self.assertIsNone(auth.verify_api_key(raw_key))

    def test_analysis_ownership_is_enforced_by_queries(self):
        owner = self.create_user("owner-sub", "owner@example.com")
        other = self.create_user("other-sub", "other@example.com")
        self.store.create_analysis("analysis-1", owner["id"], None, "paper.pdf", "dashboard", "hash")

        self.assertIsNotNone(self.store.get_analysis_for_user(owner["id"], "analysis-1"))
        self.assertIsNone(self.store.get_analysis_for_user(other["id"], "analysis-1"))

    def test_fixed_window_rate_limit_denies_after_limit(self):
        first = self.store.check_and_increment_limits("api_key:1", [("reads", 60, 2)], now_ts=120)
        second = self.store.check_and_increment_limits("api_key:1", [("reads", 60, 2)], now_ts=121)
        third = self.store.check_and_increment_limits("api_key:1", [("reads", 60, 2)], now_ts=122)

        self.assertTrue(first["allowed"])
        self.assertTrue(second["allowed"])
        self.assertFalse(third["allowed"])
        self.assertEqual(third["remaining"], 0)
        self.assertGreaterEqual(third["retry_after"], 1)


if __name__ == "__main__":
    unittest.main()
