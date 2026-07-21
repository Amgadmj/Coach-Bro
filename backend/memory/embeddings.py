"""Embedding provider seam for Relationship Memory.

Default provider is Voyage AI (`voyage-3-lite`, 512 dims) - see CLAUDE.md
routing notes and backend/.env.example. This module intentionally has no
real network call yet; `embed_summary` is the seam a real implementation
plugs into without touching `memory/store.py`.
"""

from __future__ import annotations

EMBEDDING_DIMENSIONS = 512


async def embed_summary(summary: str) -> list[float]:
    """Placeholder embedding call.

    Real implementation: call the Voyage AI embeddings API with `summary`
    and return the returned vector. Left unimplemented in this scaffold -
    `MemoryStore` only calls this when real Supabase credentials are
    configured (see `get_memory_store`), so the mock pipeline never reaches
    this code path.
    """
    raise NotImplementedError(
        "Wire a real embeddings provider (e.g. Voyage AI voyage-3-lite) before enabling "
        "MemoryStore against a live Supabase project."
    )
