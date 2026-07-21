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
    """Fallback used whenever SUPABASE_DB_URL is unset. Never persists anything."""

    async def get_contact_history(self, contact_id: str) -> list[MemoryRecord]:
        return []

    async def upsert_interaction(self, contact_id: str, result: SynthesisResult) -> None:
        return None

    async def list_contacts(self) -> list[ContactSummary]:
        return []


class MemoryStore:
    """Real pgvector-backed store. Requires `asyncpg` and SUPABASE_DB_URL."""

    def __init__(self, db_url: str) -> None:
        self._db_url = db_url

    async def get_contact_history(self, contact_id: str, limit: int = 5) -> list[MemoryRecord]:
        import asyncpg  # local import: keeps asyncpg an optional dependency for mock-only runs

        conn = await asyncpg.connect(self._db_url)
        try:
            rows = await conn.fetch(
                """
                select contact_id, session_id, summary, created_at
                from memory_embeddings
                where contact_id = $1
                order by created_at desc
                limit $2
                """,
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

    async def upsert_interaction(self, contact_id: str, result: SynthesisResult) -> None:
        import asyncpg

        summary = f"[{result.attraction_level}/10] {result.dynamic_analysis} -> {result.coaching_lesson}"
        vector = await embed_summary(summary)

        conn = await asyncpg.connect(self._db_url)
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    insert into memory_embeddings (contact_id, summary, embedding, created_at)
                    values ($1, $2, $3, $4)
                    """,
                    contact_id,
                    summary,
                    vector,
                    datetime.now(timezone.utc),
                )
                await conn.execute(
                    "update contacts set last_interaction_at = $2 where id = $1",
                    contact_id,
                    datetime.now(timezone.utc),
                )
        finally:
            await conn.close()

    async def list_contacts(self) -> list[ContactSummary]:
        import asyncpg

        conn = await asyncpg.connect(self._db_url)
        try:
            rows = await conn.fetch(
                """
                select c.id, c.display_name, c.last_interaction_at, count(m.id) as session_count
                from contacts c
                left join memory_embeddings m on m.contact_id = c.id
                group by c.id
                order by c.last_interaction_at desc nulls last
                """
            )
        finally:
            await conn.close()

        return [
            ContactSummary(
                id=str(row["id"]),
                display_name=row["display_name"],
                session_count=row["session_count"],
                last_interaction_at=row["last_interaction_at"],
            )
            for row in rows
        ]


def get_memory_store() -> NoOpMemoryStore | MemoryStore:
    """Factory used by `main.py`'s DI: real store if configured, safe no-op otherwise."""
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        return NoOpMemoryStore()
    return MemoryStore(db_url)
