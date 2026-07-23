"""Applies backend/supabase/migrations/*.sql, in filename order, against
SUPABASE_DB_URL.

Run with: python scripts/apply_supabase_migrations.py   (from inside backend/)

Not idempotent by design (mirrors a plain `psql -f` migration run) - each
file is meant to run exactly once against a given project. Safe to re-run
against a fresh project with none of the migrations applied yet.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "supabase" / "migrations"


async def main() -> None:
    import asyncpg

    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise SystemExit("SUPABASE_DB_URL is not set (check backend/.env).")

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        raise SystemExit(f"No .sql files found in {MIGRATIONS_DIR}")

    conn = await asyncpg.connect(db_url)
    try:
        for path in migration_files:
            print(f"applying {path.name} ...")
            sql = path.read_text(encoding="utf-8")
            await conn.execute(sql)
            print(f"  ok")
    finally:
        await conn.close()

    print(f"\nApplied {len(migration_files)} migration(s).")


if __name__ == "__main__":
    asyncio.run(main())
