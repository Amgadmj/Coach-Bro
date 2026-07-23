-- No auth/multi-user system exists yet (see docs/deployment.md "Not covered
-- yet - Auth / per-user memory"). contact_id is a plain client-generated
-- string (see web/src/app/live/page.tsx: `name.toLowerCase()`), not a UUID,
-- and there is no per-user scoping yet - one deployment shares one memory
-- store. Relax the tables backend/memory/store.py::MemoryStore actually uses
-- to match that, instead of requiring a `users` row and a uuid contact id
-- that nothing in the app currently produces.

alter table sessions drop constraint if exists sessions_contact_id_fkey;
alter table memory_embeddings drop constraint if exists memory_embeddings_contact_id_fkey;

alter table contacts alter column id drop default;
alter table contacts alter column id type text using id::text;
alter table contacts alter column user_id drop not null;

alter table memory_embeddings alter column contact_id type text using contact_id::text;
alter table sessions alter column contact_id type text using contact_id::text;

alter table memory_embeddings
  add constraint memory_embeddings_contact_id_fkey
  foreign key (contact_id) references contacts(id) on delete cascade;

-- Embeddings are optional until a real provider is wired into
-- memory/embeddings.py::embed_summary (currently returns None without
-- VOYAGE_API_KEY configured) - MemoryStore falls back to recency-only
-- history in that case, same as SQLiteMemoryStore.
alter table memory_embeddings alter column embedding drop not null;
