import hashlib
import hmac
import logging
import secrets
import time
from typing import Any, Dict, Optional
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import Depends, Header, HTTPException, Request, Response, status

from core.config import settings
from core.storage import SQLiteStore


logger = logging.getLogger(__name__)
_store: Optional[SQLiteStore] = None


def set_store(store: SQLiteStore) -> None:
    global _store
    _store = store


def get_store() -> SQLiteStore:
    if _store is None:
        raise RuntimeError("Auth storage has not been initialized")
    return _store


def split_csv(value: str) -> list[str]:
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


def validate_security_configuration() -> None:
    if settings.fastapi_env.lower() == "production":
        insecure_session = settings.session_secret.startswith("dev-insecure")
        insecure_pepper = settings.api_key_pepper.startswith("dev-insecure")
        if insecure_session or insecure_pepper:
            raise RuntimeError("SESSION_SECRET and API_KEY_PEPPER must be set in production")


def safe_redirect_path(value: Optional[str]) -> str:
    if not value:
        return "/dashboard"
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc or not value.startswith("/") or value.startswith("//"):
        return "/dashboard"
    return value


def hash_with_secret(value: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def hash_session_token(token: str) -> str:
    return hash_with_secret(token, settings.session_secret)


def hash_api_key(api_key: str) -> str:
    return hash_with_secret(api_key, settings.api_key_pepper)


def hash_oauth_state(state: str) -> str:
    return hashlib.sha256(state.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    return f"vs_live_{secrets.token_urlsafe(32)}"


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture_url": user.get("picture_url"),
    }


def set_session_cookie(response: Response, token: str, expires_at: int) -> None:
    max_age = max(0, expires_at - int(time.time()))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )


def get_request_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def assert_safe_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    origin_to_check = origin or referer
    if not origin_to_check:
        raise HTTPException(status_code=403, detail="Missing origin header")

    parsed = urlparse(origin_to_check)
    request_origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    allowed = set(split_csv(settings.allowed_csrf_origins))
    if request_origin not in allowed:
        raise HTTPException(status_code=403, detail="Invalid request origin")


async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    token_hash = hash_session_token(token)
    return get_store().get_user_for_session(token_hash)


async def require_user(request: Request) -> Dict[str, Any]:
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


async def require_api_key(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key required")

    raw_key = authorization.split(" ", 1)[1].strip()
    if not raw_key.startswith("vs_live_"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    key_hash = hash_api_key(raw_key)
    key_context = get_store().get_api_key_by_hash(key_hash)
    if not key_context:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    get_store().touch_api_key(int(key_context["api_key_id"]))
    return key_context


def rate_limit_headers(result: Dict[str, Any]) -> Dict[str, str]:
    return {
        "X-RateLimit-Limit": str(result["limit"]),
        "X-RateLimit-Remaining": str(result["remaining"]),
        "X-RateLimit-Reset": str(result["reset_at"]),
    }


def raise_rate_limited(result: Dict[str, Any], detail: str = "Rate limit exceeded") -> None:
    headers = rate_limit_headers(result)
    headers["Retry-After"] = str(result["retry_after"])
    raise HTTPException(status_code=429, detail=detail, headers=headers)


def enforce_limits(subject: str, specs: list[tuple[str, int, int]]) -> Dict[str, str]:
    result = get_store().check_and_increment_limits(subject, specs)
    if not result["allowed"]:
        raise_rate_limited(result)
    return rate_limit_headers(result)


def oauth_authorization_url(next_path: str) -> str:
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    get_store().create_oauth_state(
        state_hash=hash_oauth_state(state),
        nonce=nonce,
        redirect_path=safe_redirect_path(next_path),
        ttl_seconds=settings.oauth_state_ttl_seconds,
    )

    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


async def exchange_google_code(code: str) -> Dict[str, Any]:
    payload = {
        "code": code,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post("https://oauth2.googleapis.com/token", data=payload)
    if response.status_code >= 400:
        try:
            error_payload = response.json()
        except ValueError:
            error_payload = {"error": response.text[:500]}
        logger.warning(
            "Google OAuth token exchange failed: status=%s error=%s description=%s redirect_uri=%s client_id_suffix=%s",
            response.status_code,
            error_payload.get("error"),
            error_payload.get("error_description"),
            settings.google_oauth_redirect_uri,
            settings.google_oauth_client_id[-12:] if settings.google_oauth_client_id else "",
        )
        raise HTTPException(status_code=401, detail="Google OAuth token exchange failed")
    return response.json()


def verify_google_id_token(id_token_value: str, expected_nonce: str) -> Dict[str, Any]:
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        claims = id_token.verify_oauth2_token(
            id_token_value,
            google_requests.Request(),
            settings.google_oauth_client_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Google ID token verification failed") from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid Google ID token issuer")
    if claims.get("nonce") != expected_nonce:
        raise HTTPException(status_code=401, detail="Invalid Google OAuth nonce")
    if not claims.get("email") or claims.get("email_verified") not in (True, "true", "True", "1", 1):
        raise HTTPException(status_code=401, detail="Google email must be verified")
    return claims


def create_login_session(response: Response, request: Request, user_id: int) -> None:
    token = secrets.token_urlsafe(48)
    expires_at = int(time.time()) + settings.session_ttl_seconds
    get_store().create_session(
        token_hash=hash_session_token(token),
        user_id=user_id,
        expires_at=expires_at,
        user_agent=request.headers.get("user-agent"),
        ip_address=get_request_ip(request),
    )
    set_session_cookie(response, token, expires_at)


def frontend_redirect_url(path: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}{safe_redirect_path(path)}"
