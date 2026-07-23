"""Embedding provider seam for Relationship Memory.

Default provider is Voyage AI (`voyage-3-lite`, 512 dims) - see CLAUDE.md
routing notes and backend/.env.example. `embed_summary` is the seam a real
implementation plugs into without touching `memory/store.py`.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = 512

_warned_missing_key = False


async def embed_summary(summary: str) -> list[float] | None:
    """Returns an embedding vector for `summary`, or None if no embeddings
    provider is configured.

    No query in memory/store.py currently does vector similarity search
    (get_contact_history is recency-based, same as SQLiteMemoryStore) - the
    embedding column is write-side plumbing for a future semantic-search
    feature. So a missing VOYAGE_API_KEY is a supported, non-fatal state: log
    once and store NULL for the embedding, rather than failing every read
    (MemoryStore.upsert_interaction) just because that future feature isn't
    wired up yet.
    """
    global _warned_missing_key

    if not os.environ.get("VOYAGE_API_KEY"):
        if not _warned_missing_key:
            logger.warning(
                "VOYAGE_API_KEY not set - Relationship Memory will persist without "
                "embeddings (recency-based history only, same as the SQLite store)."
            )
            _warned_missing_key = True
        return None

    raise NotImplementedError(
        "VOYAGE_API_KEY is set but no real embeddings call is wired up yet - "
        "implement the Voyage AI voyage-3-lite call here."
    )
