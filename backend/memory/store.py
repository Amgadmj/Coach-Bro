"""Relationship Memory storage.

`MemoryStore` talks to Supabase Postgres via raw asyncpg (not the
`supabase-py` query builder, which doesn't cleanly express pgvector's `<=>`
operator - see docs/architecture.md §6). When SUPABASE_DB_URL isn't set,
`get_memory_store()` returns `NoOpMemoryStore` so the orchestrator and the
mock pipeline never require Supabase credentials to run.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from memory.embeddings import embed_summary
from models.schemas import ContactSummary, MemoryRecord, SynthesisResult


class NoOpMemoryStore:
    """In-memory-nothing store for tests. Never persists anything."""

    async def get_contact_history(self, device_id: str, contact_id: str) -> list[MemoryRecord]:
        return []

    async def upsert_interaction(self, device_id: str, contact_id: str, result: SynthesisResult) -> None:
        return None

    async def get_persona(self, device_id: str, contact_id: str) -> str | None:
        return None

    async def upsert_persona(self, device_id: str, contact_id: str, persona: str) -> None:
        return None

    async def upsert_match_gender(self, device_id: str, contact_id: str, match_gender: str | None) -> None:
        return None

    async def get_read_count(self, device_id: str, contact_id: str) -> int:
        return 0

    async def get_user_style(self, device_id: str) -> str | None:
        return None

    async def upsert_user_style(self, device_id: str, style: str) -> None:
        return None

    async def list_contacts(self, device_id: str) -> list[ContactSummary]:
        return []


class MemoryStore:
    """Real pgvector-backed store. Requires `asyncpg` and SUPABASE_DB_URL."""

    def __init__(self, db_url: str) -> None:
        self._db_url = db_url

    @staticmethod
    async def _ensure_contact(conn, device_id: str, contact_id: str) -> None:
        """No auth/users system exists yet (see docs/deployment.md "Not covered
        yet") - contact_id is a plain client-generated string (see
        web/src/app/live/page.tsx), not created ahead of time via any signup
        flow. `device_id` (see main.py::get_device_id) scopes it to the device
        that created it, so two devices naming a contact the same thing don't
        collide into one shared row. Auto-create the row on first use, same as
        SQLiteMemoryStore's _ensure_contact, instead of assuming one exists."""
        await conn.execute(
            "insert into contacts (device_id, id, display_name) values ($1, $2, $2) "
            "on conflict (device_id, id) do nothing",
            device_id,
            contact_id,
        )

    async def get_contact_history(self, device_id: str, contact_id: str, limit: int = 5) -> list[MemoryRecord]:
        import asyncpg  # local import: keeps asyncpg an optional dependency for mock-only runs

        conn = await asyncpg.connect(self._db_url)
        try:
            rows = await conn.fetch(
                """
                select contact_id, session_id, summary, created_at
                from memory_embeddings
                where device_id = $1 and contact_id = $2
                order by created_at desc
                limit $3
                """,
                device_id,
                contact_id,
                limit,
            )
        finally:
            await conn.close()

        return [
            MemoryRecord(
                contact_id=str(row["contact_id"]),
                session_id=str(row["session_id"]) if row["session_id"] else None,
                summary=row["summary"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def upsert_interaction(self, device_id: str, contact_id: str, result: SynthesisResult) -> None:
        import asyncpg

        summary = f"[{result.attraction_level}/10] {result.dynamic_analysis} -> {result.coaching_lesson}"
        vector = await embed_summary(summary)

        # asyncpg has no built-in codec for pgvector's `vector` type - hand it
        # pgvector's own bracketed text format and cast explicitly so Postgres
        # parses it via the extension's input function instead of asyncpg
        # trying (and failing) to infer an encoding for an unknown OID.
        embedding_literal = "[" + ",".join(repr(x) for x in vector) + "]" if vector is not None else None

        conn = await asyncpg.connect(self._db_url)
        try:
            async with conn.transaction():
                await self._ensure_contact(conn, device_id, contact_id)
                await conn.execute(
                    """
                    insert into memory_embeddings (device_id, contact_id, summary, embedding, created_at)
                    values ($1, $2, $3, $4::vector, $5)
                    """,
                    device_id,
                    contact_id,
                    summary,
                    embedding_literal,
                    datetime.now(timezone.utc),
                )
                await conn.execute(
                    "update contacts set last_interaction_at = $3 where device_id = $1 and id = $2",
                    device_id,
                    contact_id,
                    datetime.now(timezone.utc),
                )
        finally:
            await conn.close()

    async def get_persona(self, device_id: str, contact_id: str) -> str | None:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            return await conn.fetchval(
                "select persona from contacts where device_id = $1 and id = $2", device_id, contact_id
            )
        finally:
            await conn.close()

    async def upsert_persona(self, device_id: str, contact_id: str, persona: str) -> None:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            await self._ensure_contact(conn, device_id, contact_id)
            await conn.execute(
                "update contacts set persona = $3 where device_id = $1 and id = $2",
                device_id,
                contact_id,
                persona,
            )
        finally:
            await conn.close()

    async def upsert_match_gender(self, device_id: str, contact_id: str, match_gender: str | None) -> None:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            await self._ensure_contact(conn, device_id, contact_id)
            await conn.execute(
                "update contacts set match_gender = $3 where device_id = $1 and id = $2",
                device_id,
                contact_id,
                match_gender,
            )
        finally:
            await conn.close()

    async def get_read_count(self, device_id: str, contact_id: str) -> int:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            return (
                await conn.fetchval(
                    "select count(*) from memory_embeddings where device_id = $1 and contact_id = $2",
                    device_id,
                    contact_id,
                )
                or 0
            )
        finally:
            await conn.close()

    async def get_user_style(self, device_id: str) -> str | None:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            return await conn.fetchval("select style from user_style where device_id = $1", device_id)
        finally:
            await conn.close()

    async def upsert_user_style(self, device_id: str, style: str) -> None:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            await conn.execute(
                "insert into user_style (device_id, style) values ($1, $2) "
                "on conflict (device_id) do update set style = excluded.style",
                device_id,
                style,
            )
        finally:
            await conn.close()

    async def list_contacts(self, device_id: str) -> list[ContactSummary]:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            rows = await conn.fetch(
                """
                select c.id, c.display_name, c.last_interaction_at, c.match_gender,
                       count(m.id) as session_count
                from contacts c
                left join memory_embeddings m on m.device_id = c.device_id and m.contact_id = c.id
                where c.device_id = $1
                group by c.id, c.device_id
                order by c.last_interaction_at desc nulls last
                """,
                device_id,
            )
        finally:
            await conn.close()

        return [
            ContactSummary(
                id=str(row["id"]),
                display_name=row["display_name"],
                session_count=row["session_count"],
                last_interaction_at=row["last_interaction_at"],
                match_gender=row["match_gender"],
            )
            for row in rows
        ]


def get_memory_store():
    """Factory used by `main.py`'s DI.

    SUPABASE_DB_URL set -> Postgres/pgvector store (scale path).
    Otherwise -> local SQLite (backend/data/memory.db by default), so
    Relationship Memory and personas work with zero configuration.
    """
    db_url = os.environ.get("SUPABASE_DB_URL")
    if db_url:
        return MemoryStore(db_url)

    from memory.sqlite_store import SQLiteMemoryStore

    db_path = os.environ.get("MEMORY_DB_PATH", "data/memory.db")
    return SQLiteMemoryStore(db_path)
