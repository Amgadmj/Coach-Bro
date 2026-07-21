-- RESET AI initial schema. Not applied to any live project by this scaffold -
-- run against a real Supabase project with `supabase db push` or the SQL editor.
-- Mirrors docs/architecture.md §5; keep both in sync if you change this file.

create extension if not exists vector;
create extension if not exists "pgcrypto"; -- gen_random_uuid()

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  last_interaction_at timestamptz
);
create index idx_contacts_user_id on contacts(user_id);

-- image_storage_path is intentionally nullable and unused by default: raw
-- screenshots are processed in-memory and discarded, never persisted, per
-- the privacy default in CLAUDE.md. Only wire it up behind an explicit,
-- separate opt-in "view original" feature.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  image_storage_path text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index idx_sessions_user_contact on sessions(user_id, contact_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  sender text not null check (sender in ('user','match')),
  text text not null,
  ts timestamptz,
  bubble_color text,
  response_lag_seconds numeric,
  order_index int not null
);
create index idx_messages_session_id on messages(session_id);

create table analysis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  attraction_level int not null check (attraction_level between 1 and 10),
  dynamic_analysis text not null,
  what_she_is_thinking jsonb not null,
  best_response text not null,
  alternative_responses jsonb not null,
  coaching_lesson text not null,
  created_at timestamptz not null default now()
);
create index idx_analysis_results_session_id on analysis_results(session_id);

-- embedding dimension matches Voyage AI voyage-3-lite (512 dims) - see
-- backend/memory/embeddings.py. Change this if you swap embedding providers.
create table memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  summary text not null,
  embedding vector(512),
  created_at timestamptz not null default now()
);
create index idx_memory_embeddings_contact_id on memory_embeddings(contact_id);
create index idx_memory_embeddings_vector on memory_embeddings
  using hnsw (embedding vector_cosine_ops);
