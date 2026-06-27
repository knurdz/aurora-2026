import json
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SQLiteStore:
    def __init__(self, path: str):
        self.path = path
        self._conn: Optional[sqlite3.Connection] = None
        self._lock = threading.RLock()

    def connect(self) -> None:
        parent = os.path.dirname(self.path)
        if parent:
            os.makedirs(parent, exist_ok=True)

        self._conn = sqlite3.connect(
            self.path,
            check_same_thread=False,
            isolation_level=None,
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA busy_timeout = 5000")
        self.migrate()

    def close(self) -> None:
        with self._lock:
            if self._conn is not None:
                self._conn.close()
                self._conn = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            raise RuntimeError("SQLiteStore is not connected")
        return self._conn

    def migrate(self) -> None:
        with self._lock:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_sub TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT,
                    picture_url TEXT,
                    email_verified INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_hash TEXT NOT NULL UNIQUE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL,
                    expires_at INTEGER NOT NULL,
                    revoked_at TEXT,
                    user_agent TEXT,
                    ip_address TEXT
                );

                CREATE TABLE IF NOT EXISTS oauth_states (
                    state_hash TEXT PRIMARY KEY,
                    nonce TEXT NOT NULL,
                    redirect_path TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL,
                    consumed_at INTEGER
                );

                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    prefix TEXT NOT NULL,
                    key_hash TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    revoked_at TEXT,
                    last_used_at TEXT,
                    usage_total INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
                    filename TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    finished_at TEXT,
                    result_json TEXT,
                    error TEXT
                );

                CREATE TABLE IF NOT EXISTS analysis_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS rate_limits (
                    subject TEXT NOT NULL,
                    bucket TEXT NOT NULL,
                    window_start INTEGER NOT NULL,
                    count INTEGER NOT NULL,
                    PRIMARY KEY (subject, bucket, window_start)
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
                CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
                CREATE INDEX IF NOT EXISTS idx_analyses_owner ON analyses(owner_user_id, created_at);
                CREATE INDEX IF NOT EXISTS idx_analyses_content ON analyses(owner_user_id, content_hash, status);
                CREATE INDEX IF NOT EXISTS idx_analysis_logs_analysis ON analysis_logs(analysis_id, id);
                CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);
                """
            )

    def create_or_update_user(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        now = utc_now_iso()
        google_sub = str(claims["sub"])
        email = str(claims["email"]).lower()
        name = claims.get("name") or email
        picture_url = claims.get("picture")
        email_verified = 1 if claims.get("email_verified") in (True, "true", "True", "1", 1) else 0

        with self._lock:
            self.conn.execute(
                """
                INSERT INTO users (
                    google_sub, email, name, picture_url, email_verified,
                    created_at, updated_at, last_login_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(google_sub) DO UPDATE SET
                    email = excluded.email,
                    name = excluded.name,
                    picture_url = excluded.picture_url,
                    email_verified = excluded.email_verified,
                    updated_at = excluded.updated_at,
                    last_login_at = excluded.last_login_at
                """,
                (google_sub, email, name, picture_url, email_verified, now, now, now),
            )
            return self.get_user_by_google_sub(google_sub)

    def get_user_by_google_sub(self, google_sub: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute("SELECT * FROM users WHERE google_sub = ?", (google_sub,)).fetchone()
        return dict(row) if row else None

    def create_session(
        self,
        token_hash: str,
        user_id: int,
        expires_at: int,
        user_agent: Optional[str],
        ip_address: Optional[str],
    ) -> None:
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (token_hash, user_id, utc_now_iso(), expires_at, user_agent, ip_address),
            )

    def get_user_for_session(self, token_hash: str, now_ts: Optional[int] = None) -> Optional[Dict[str, Any]]:
        now_ts = now_ts or int(time.time())
        row = self.conn.execute(
            """
            SELECT
                u.id, u.google_sub, u.email, u.name, u.picture_url, u.email_verified,
                u.created_at, u.updated_at, u.last_login_at,
                s.id AS session_id, s.expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ?
              AND s.revoked_at IS NULL
              AND s.expires_at > ?
            """,
            (token_hash, now_ts),
        ).fetchone()
        return dict(row) if row else None

    def revoke_session(self, token_hash: str) -> None:
        with self._lock:
            self.conn.execute(
                "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
                (utc_now_iso(), token_hash),
            )

    def create_oauth_state(self, state_hash: str, nonce: str, redirect_path: str, ttl_seconds: int) -> None:
        now_ts = int(time.time())
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO oauth_states (state_hash, nonce, redirect_path, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (state_hash, nonce, redirect_path, now_ts, now_ts + ttl_seconds),
            )

    def consume_oauth_state(self, state_hash: str) -> Optional[Dict[str, Any]]:
        now_ts = int(time.time())
        with self._lock:
            row = self.conn.execute(
                """
                SELECT * FROM oauth_states
                WHERE state_hash = ?
                  AND consumed_at IS NULL
                  AND expires_at > ?
                """,
                (state_hash, now_ts),
            ).fetchone()
            if not row:
                return None

            self.conn.execute(
                "UPDATE oauth_states SET consumed_at = ? WHERE state_hash = ?",
                (now_ts, state_hash),
            )
            return dict(row)

    def create_api_key(self, user_id: int, name: str, prefix: str, key_hash: str) -> Dict[str, Any]:
        now = utc_now_iso()
        with self._lock:
            cur = self.conn.execute(
                """
                INSERT INTO api_keys (user_id, name, prefix, key_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, name, prefix, key_hash, now),
            )
            return self.get_api_key_for_user(user_id, cur.lastrowid)

    def get_api_key_for_user(self, user_id: int, key_id: int) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            """
            SELECT id, user_id, name, prefix, created_at, revoked_at, last_used_at, usage_total
            FROM api_keys
            WHERE user_id = ? AND id = ?
            """,
            (user_id, key_id),
        ).fetchone()
        return dict(row) if row else None

    def list_api_keys(self, user_id: int) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT id, user_id, name, prefix, created_at, revoked_at, last_used_at, usage_total
            FROM api_keys
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def count_active_api_keys(self, user_id: int) -> int:
        row = self.conn.execute(
            "SELECT COUNT(*) AS count FROM api_keys WHERE user_id = ? AND revoked_at IS NULL",
            (user_id,),
        ).fetchone()
        return int(row["count"])

    def get_api_key_by_hash(self, key_hash: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            """
            SELECT
                k.id AS api_key_id, k.user_id, k.name AS api_key_name, k.prefix,
                k.created_at AS api_key_created_at, k.last_used_at, k.usage_total,
                u.google_sub, u.email, u.name, u.picture_url, u.email_verified
            FROM api_keys k
            JOIN users u ON u.id = k.user_id
            WHERE k.key_hash = ? AND k.revoked_at IS NULL
            """,
            (key_hash,),
        ).fetchone()
        return dict(row) if row else None

    def touch_api_key(self, api_key_id: int) -> None:
        with self._lock:
            self.conn.execute(
                """
                UPDATE api_keys
                SET last_used_at = ?, usage_total = usage_total + 1
                WHERE id = ?
                """,
                (utc_now_iso(), api_key_id),
            )

    def revoke_api_key(self, user_id: int, key_id: int) -> bool:
        with self._lock:
            cur = self.conn.execute(
                """
                UPDATE api_keys
                SET revoked_at = ?
                WHERE user_id = ? AND id = ? AND revoked_at IS NULL
                """,
                (utc_now_iso(), user_id, key_id),
            )
            return cur.rowcount > 0

    def create_analysis(
        self,
        analysis_id: str,
        owner_user_id: int,
        api_key_id: Optional[int],
        filename: str,
        source: str,
        content_hash: str,
    ) -> Dict[str, Any]:
        now = utc_now_iso()
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO analyses (
                    id, owner_user_id, api_key_id, filename, status, source,
                    content_hash, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, 'processing', ?, ?, ?, ?)
                """,
                (analysis_id, owner_user_id, api_key_id, filename, source, content_hash, now, now),
            )
            return self.get_analysis(analysis_id)

    def find_reusable_analysis(self, owner_user_id: int, content_hash: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            """
            SELECT * FROM analyses
            WHERE owner_user_id = ?
              AND content_hash = ?
              AND status IN ('processing', 'processed')
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (owner_user_id, content_hash),
        ).fetchone()
        return dict(row) if row else None

    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
        return dict(row) if row else None

    def get_analysis_for_user(self, user_id: int, analysis_id: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            "SELECT * FROM analyses WHERE id = ? AND owner_user_id = ?",
            (analysis_id, user_id),
        ).fetchone()
        return dict(row) if row else None

    def list_analyses_for_user(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT * FROM analyses
            WHERE owner_user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        return [dict(row) for row in rows]

    def count_active_analyses(self, user_id: int) -> int:
        row = self.conn.execute(
            "SELECT COUNT(*) AS count FROM analyses WHERE owner_user_id = ? AND status = 'processing'",
            (user_id,),
        ).fetchone()
        return int(row["count"])

    def set_analysis_result(self, analysis_id: str, result: Dict[str, Any]) -> None:
        now = utc_now_iso()
        with self._lock:
            self.conn.execute(
                """
                UPDATE analyses
                SET status = 'processed',
                    updated_at = ?,
                    finished_at = ?,
                    result_json = ?,
                    error = NULL
                WHERE id = ?
                """,
                (now, now, json.dumps(result), analysis_id),
            )

    def set_analysis_failed(self, analysis_id: str, error: str) -> None:
        now = utc_now_iso()
        with self._lock:
            self.conn.execute(
                """
                UPDATE analyses
                SET status = 'failed',
                    updated_at = ?,
                    finished_at = ?,
                    error = ?
                WHERE id = ?
                """,
                (now, now, error, analysis_id),
            )

    def append_analysis_log(self, analysis_id: str, message: str) -> None:
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO analysis_logs (analysis_id, message, created_at)
                VALUES (?, ?, ?)
                """,
                (analysis_id, message, utc_now_iso()),
            )

    def list_analysis_logs(self, analysis_id: str) -> List[str]:
        rows = self.conn.execute(
            "SELECT message FROM analysis_logs WHERE analysis_id = ? ORDER BY id ASC",
            (analysis_id,),
        ).fetchall()
        return [str(row["message"]) for row in rows]

    def mark_stale_processing_failed(self) -> int:
        now = utc_now_iso()
        with self._lock:
            cur = self.conn.execute(
                """
                UPDATE analyses
                SET status = 'failed',
                    updated_at = ?,
                    finished_at = ?,
                    error = 'Analysis was interrupted by a server restart.'
                WHERE status = 'processing'
                """,
                (now, now),
            )
            return cur.rowcount

    def usage_summary(self, user_id: int) -> Dict[str, Any]:
        active_keys = self.count_active_api_keys(user_id)
        active_analyses = self.count_active_analyses(user_id)
        total_row = self.conn.execute(
            "SELECT COUNT(*) AS count FROM analyses WHERE owner_user_id = ?",
            (user_id,),
        ).fetchone()
        processed_row = self.conn.execute(
            "SELECT COUNT(*) AS count FROM analyses WHERE owner_user_id = ? AND status = 'processed'",
            (user_id,),
        ).fetchone()
        return {
            "active_api_keys": active_keys,
            "active_analyses": active_analyses,
            "total_analyses": int(total_row["count"]),
            "processed_analyses": int(processed_row["count"]),
        }

    def check_and_increment_limits(
        self,
        subject: str,
        specs: Sequence[Tuple[str, int, int]],
        now_ts: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Atomically checks and increments fixed-window counters.

        specs are (bucket_name, window_seconds, limit).
        """
        now_ts = now_ts or int(time.time())
        with self._lock:
            current: List[Dict[str, Any]] = []
            for bucket, window_seconds, limit in specs:
                window_start = now_ts - (now_ts % window_seconds)
                row = self.conn.execute(
                    """
                    SELECT count FROM rate_limits
                    WHERE subject = ? AND bucket = ? AND window_start = ?
                    """,
                    (subject, bucket, window_start),
                ).fetchone()
                count = int(row["count"]) if row else 0
                reset_at = window_start + window_seconds
                current.append(
                    {
                        "bucket": bucket,
                        "window_seconds": window_seconds,
                        "window_start": window_start,
                        "limit": limit,
                        "count": count,
                        "reset_at": reset_at,
                    }
                )

            denied = [item for item in current if item["count"] >= item["limit"]]
            if denied:
                item = sorted(denied, key=lambda value: value["reset_at"])[0]
                return {
                    "allowed": False,
                    "bucket": item["bucket"],
                    "limit": item["limit"],
                    "remaining": 0,
                    "reset_at": item["reset_at"],
                    "retry_after": max(1, item["reset_at"] - now_ts),
                }

            for item in current:
                self.conn.execute(
                    """
                    INSERT INTO rate_limits (subject, bucket, window_start, count)
                    VALUES (?, ?, ?, 1)
                    ON CONFLICT(subject, bucket, window_start) DO UPDATE SET
                        count = count + 1
                    """,
                    (subject, item["bucket"], item["window_start"]),
                )
                item["count"] += 1

            representative = sorted(
                current,
                key=lambda item: (item["limit"] - item["count"], item["reset_at"]),
            )[0]
            return {
                "allowed": True,
                "bucket": representative["bucket"],
                "limit": representative["limit"],
                "remaining": max(0, representative["limit"] - representative["count"]),
                "reset_at": representative["reset_at"],
                "retry_after": 0,
            }

    def limit_status(
        self,
        subject: str,
        specs: Sequence[Tuple[str, int, int]],
        now_ts: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        now_ts = now_ts or int(time.time())
        statuses = []
        with self._lock:
            for bucket, window_seconds, limit in specs:
                window_start = now_ts - (now_ts % window_seconds)
                row = self.conn.execute(
                    """
                    SELECT count FROM rate_limits
                    WHERE subject = ? AND bucket = ? AND window_start = ?
                    """,
                    (subject, bucket, window_start),
                ).fetchone()
                count = int(row["count"]) if row else 0
                reset_at = window_start + window_seconds
                statuses.append(
                    {
                        "bucket": bucket,
                        "limit": limit,
                        "used": count,
                        "remaining": max(0, limit - count),
                        "reset_at": reset_at,
                    }
                )
        return statuses

    def cleanup_old_rate_limits(self, older_than_ts: Optional[int] = None) -> None:
        older_than_ts = older_than_ts or (int(time.time()) - 60 * 60 * 24 * 7)
        with self._lock:
            self.conn.execute("DELETE FROM rate_limits WHERE window_start < ?", (older_than_ts,))


def decode_result_json(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not row.get("result_json"):
        return None
    return json.loads(row["result_json"])
