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
  id text primary key,
  display_name text not null,
  persona text,
  read_count integer not null default 0,
  last_interaction_at text
);
create table if not exists reads (
  id integer primary key autoincrement,
  contact_id text not null references contacts(id),
  summary text not null,
  created_at text not null
);
create index if not exists idx_reads_contact on reads(contact_id, created_at desc);
-- Global (not per-contact): the app's own user's texting voice, learned from
-- his "user"-sender messages across every read. Single-row table.
create table if not exists user_style (
  id integer primary key check (id = 1),
  style text
);
"""


class SQLiteMemoryStore:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_contact(self, conn: sqlite3.Connection, contact_id: str) -> None:
        conn.execute(
            "insert or ignore into contacts (id, display_name) values (?, ?)",
            (contact_id, contact_id),
        )

    # -- async surface (sync sqlite work pushed off the event loop) --

    async def get_contact_history(self, contact_id: str, limit: int = 5) -> list[MemoryRecord]:
        def work() -> list[MemoryRecord]:
            with self._connect() as conn:
                rows = conn.execute(
                    "select contact_id, summary, created_at from reads "
                    "where contact_id = ? order by created_at desc limit ?",
                    (contact_id, limit),
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

    async def upsert_interaction(self, contact_id: str, result: SynthesisResult) -> None:
        def work() -> None:
            now = datetime.now(timezone.utc).isoformat()
            summary = (
                f"[{result.attraction_level}/10] {result.dynamic_analysis} "
                f"-> {result.coaching_lesson}"
            )
            with self._connect() as conn:
                self._ensure_contact(conn, contact_id)
                conn.execute(
                    "insert into reads (contact_id, summary, created_at) values (?, ?, ?)",
                    (contact_id, summary, now),
                )
                conn.execute(
                    "update contacts set read_count = read_count + 1, last_interaction_at = ? "
                    "where id = ?",
                    (now, contact_id),
                )

        await asyncio.to_thread(work)

    async def get_persona(self, contact_id: str) -> str | None:
        def work() -> str | None:
            with self._connect() as conn:
                row = conn.execute(
                    "select persona from contacts where id = ?", (contact_id,)
                ).fetchone()
            return row["persona"] if row else None

        return await asyncio.to_thread(work)

    async def upsert_persona(self, contact_id: str, persona: str) -> None:
        def work() -> None:
            with self._connect() as conn:
                self._ensure_contact(conn, contact_id)
                conn.execute("update contacts set persona = ? where id = ?", (persona, contact_id))

        await asyncio.to_thread(work)

    async def get_read_count(self, contact_id: str) -> int:
        def work() -> int:
            with self._connect() as conn:
                row = conn.execute(
                    "select read_count from contacts where id = ?", (contact_id,)
                ).fetchone()
            return row["read_count"] if row else 0

        return await asyncio.to_thread(work)

    async def get_user_style(self) -> str | None:
        def work() -> str | None:
            with self._connect() as conn:
                row = conn.execute("select style from user_style where id = 1").fetchone()
            return row["style"] if row else None

        return await asyncio.to_thread(work)

    async def upsert_user_style(self, style: str) -> None:
        def work() -> None:
            with self._connect() as conn:
                conn.execute(
                    "insert into user_style (id, style) values (1, ?) "
                    "on conflict(id) do update set style = excluded.style",
                    (style,),
                )

        await asyncio.to_thread(work)

    async def list_contacts(self) -> list[ContactSummary]:
        def work() -> list[ContactSummary]:
            with self._connect() as conn:
                rows = conn.execute(
                    "select id, display_name, read_count, last_interaction_at from contacts "
                    "order by last_interaction_at desc"
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
