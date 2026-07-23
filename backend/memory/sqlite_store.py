"""SQLite-backed Relationship Memory - the zero-config default.

Makes contact memory and personas actually work out of the box (no Supabase
credentials needed). Same surface as the pgvector store; swap to Postgres by
setting SUPABASE_DB_URL (see memory/store.py::get_memory_store). No vector
search here - history is recency-based, and the persona document carries the
distilled knowledge, which is what the prompts consume anyway.
"""

from __future__ import annotations

import asyncio
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from models.schemas import ContactSummary, MemoryRecord, SynthesisResult

_SCHEMA = """
create table if not exists contacts (
  device_id text not null,
  id text not null,
  display_name text not null,
  persona text,
  read_count integer not null default 0,
  last_interaction_at text,
  primary key (device_id, id)
);
create table if not exists reads (
  id integer primary key autoincrement,
  device_id text not null,
  contact_id text not null,
  summary text not null,
  created_at text not null
);
create index if not exists idx_reads_contact on reads(device_id, contact_id, created_at desc);
-- Per-device (not per-contact): the app's own user's texting voice, learned
-- from his "user"-sender messages across every read. One row per device -
-- see main.py::get_device_id for why this can't be a single global row.
create table if not exists user_style (
  device_id text primary key,
  style text
);
"""


class SQLiteMemoryStore:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            self._migrate_pre_device_scoping_schema(conn)
            conn.executescript(_SCHEMA)

    @staticmethod
    def _migrate_pre_device_scoping_schema(conn: sqlite3.Connection) -> None:
        """One-time self-heal for a database created before device_id scoping
        existed (see main.py::get_device_id) - drops the old global tables so
        `_SCHEMA` above can recreate them with the new columns/keys. This app
        has no auth system, so pre-existing rows in the old schema were never
        attributable to a specific device in the first place (that's the bug
        being fixed) - there's nothing safe to migrate forward, only to
        discard. No-ops if the tables don't exist yet, or already have
        device_id (fresh install, or already migrated)."""
        existing = {
            row[0]
            for row in conn.execute(
                "select name from sqlite_master where type='table' and name in "
                "('contacts', 'reads', 'user_style')"
            ).fetchall()
        }
        if not existing:
            return
        for table in existing:
            columns = {row[1] for row in conn.execute(f"pragma table_info({table})").fetchall()}
            if "device_id" not in columns:
                conn.execute(f"drop table {table}")

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_contact(self, conn: sqlite3.Connection, device_id: str, contact_id: str) -> None:
        conn.execute(
            "insert or ignore into contacts (device_id, id, display_name) values (?, ?, ?)",
            (device_id, contact_id, contact_id),
        )

    # -- async surface (sync sqlite work pushed off the event loop) --

    async def get_contact_history(self, device_id: str, contact_id: str, limit: int = 5) -> list[MemoryRecord]:
        def work() -> list[MemoryRecord]:
            with self._connect() as conn:
                rows = conn.execute(
                    "select contact_id, summary, created_at from reads "
                    "where device_id = ? and contact_id = ? order by created_at desc limit ?",
                    (device_id, contact_id, limit),
                ).fetchall()
            return [
                MemoryRecord(
                    contact_id=row["contact_id"],
                    summary=row["summary"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                )
                for row in rows
            ]

        return await asyncio.to_thread(work)

    async def upsert_interaction(self, device_id: str, contact_id: str, result: SynthesisResult) -> None:
        def work() -> None:
            now = datetime.now(timezone.utc).isoformat()
            summary = (
                f"[{result.attraction_level}/10] {result.dynamic_analysis} "
                f"-> {result.coaching_lesson}"
            )
            with self._connect() as conn:
                self._ensure_contact(conn, device_id, contact_id)
                conn.execute(
                    "insert into reads (device_id, contact_id, summary, created_at) values (?, ?, ?, ?)",
                    (device_id, contact_id, summary, now),
                )
                conn.execute(
                    "update contacts set read_count = read_count + 1, last_interaction_at = ? "
                    "where device_id = ? and id = ?",
                    (now, device_id, contact_id),
                )

        await asyncio.to_thread(work)

    async def get_persona(self, device_id: str, contact_id: str) -> str | None:
        def work() -> str | None:
            with self._connect() as conn:
                row = conn.execute(
                    "select persona from contacts where device_id = ? and id = ?",
                    (device_id, contact_id),
                ).fetchone()
            return row["persona"] if row else None

        return await asyncio.to_thread(work)

    async def upsert_persona(self, device_id: str, contact_id: str, persona: str) -> None:
        def work() -> None:
            with self._connect() as conn:
                self._ensure_contact(conn, device_id, contact_id)
                conn.execute(
                    "update contacts set persona = ? where device_id = ? and id = ?",
                    (persona, device_id, contact_id),
                )

        await asyncio.to_thread(work)

    async def get_read_count(self, device_id: str, contact_id: str) -> int:
        def work() -> int:
            with self._connect() as conn:
                row = conn.execute(
                    "select read_count from contacts where device_id = ? and id = ?",
                    (device_id, contact_id),
                ).fetchone()
            return row["read_count"] if row else 0

        return await asyncio.to_thread(work)

    async def get_user_style(self, device_id: str) -> str | None:
        def work() -> str | None:
            with self._connect() as conn:
                row = conn.execute(
                    "select style from user_style where device_id = ?", (device_id,)
                ).fetchone()
            return row["style"] if row else None

        return await asyncio.to_thread(work)

    async def upsert_user_style(self, device_id: str, style: str) -> None:
        def work() -> None:
            with self._connect() as conn:
                conn.execute(
                    "insert into user_style (device_id, style) values (?, ?) "
                    "on conflict(device_id) do update set style = excluded.style",
                    (device_id, style),
                )

        await asyncio.to_thread(work)

    async def list_contacts(self, device_id: str) -> list[ContactSummary]:
        def work() -> list[ContactSummary]:
            with self._connect() as conn:
                rows = conn.execute(
                    "select id, display_name, read_count, last_interaction_at from contacts "
                    "where device_id = ? order by last_interaction_at desc",
                    (device_id,),
                ).fetchall()
            return [
                ContactSummary(
                    id=row["id"],
                    display_name=row["display_name"],
                    session_count=row["read_count"],
                    last_interaction_at=(
                        datetime.fromisoformat(row["last_interaction_at"])
                        if row["last_interaction_at"]
                        else None
                    ),
                )
                for row in rows
            ]

        return await asyncio.to_thread(work)
