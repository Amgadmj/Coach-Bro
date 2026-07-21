"""Minimal in-memory sliding-window rate limiter.

Deliberately dependency-free for the single-instance MVP. State is per-process:
if the backend ever runs more than one instance behind a load balancer, replace
with a shared store (Redis) - the FastAPI dependency surface stays the same.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self._max = max_requests
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, request: Request) -> None:
        # Respect proxy headers (Render/Fly terminate TLS in front of us).
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )

        now = time.monotonic()
        hits = self._hits[client_ip]
        while hits and now - hits[0] > self._window:
            hits.popleft()

        if len(hits) >= self._max:
            retry_after = int(self._window - (now - hits[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Slow down - you've hit the hourly limit for this. Try again soon.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
