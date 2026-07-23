-- Fixes a confirmed cross-user data leak: 0004 documented "no per-user
-- scoping yet - one deployment shares one memory store" as an accepted MVP
-- gap, but in practice this meant two different people naming a contact the
-- same thing collided into one shared row, and GET /contacts returned every
-- contact ever created by anyone. No auth system exists yet, so the fix is a
-- client-generated, persisted device ID (see main.py::get_device_id,
-- web/src/lib/deviceId.ts) rather than a real user_id - `contacts.user_id`
-- (added in 0001, relaxed to nullable in 0004) is left untouched for real
-- auth to use later; device_id is a separate, anonymous-identity column.
--
-- Existing rows can't be safely attributed to any specific device (that's
-- the bug being fixed, not something to migrate forward), so they're
-- corralled into a 'legacy-unscoped' sentinel that no real device_id will
-- ever equal - they become permanently invisible to every device's
-- device_id-scoped queries, without being destructively deleted outright.
-- `contacts`/`user_style` need this backfill because Postgres requires every
-- column in a PRIMARY KEY to be NOT NULL; `memory_embeddings` doesn't need
-- one since device_id there is just a filter column, not part of a key, and
-- a NULL there already never matches any real device's `where device_id = $1`.

-- memory_embeddings_contact_id_fkey (added in 0004) depends on contacts_pkey,
-- so it must go before the old single-column PK can be dropped. Not
-- re-added: contact_id/device_id on memory_embeddings are plain filter
-- columns now (mirrors SQLite's `reads` table, which never had an enforced
-- FK either), not a referential-integrity relationship the app depends on.
alter table memory_embeddings drop constraint if exists memory_embeddings_contact_id_fkey;

alter table contacts add column if not exists device_id text;
update contacts set device_id = 'legacy-unscoped' where device_id is null;
alter table contacts alter column device_id set not null;
alter table contacts drop constraint if exists contacts_pkey;
alter table contacts add primary key (device_id, id);

alter table memory_embeddings add column if not exists device_id text;

alter table user_style add column if not exists device_id text;
update user_style set device_id = 'legacy-unscoped-' || id::text where device_id is null;
alter table user_style alter column device_id set not null;
alter table user_style drop constraint if exists user_style_pkey;
alter table user_style drop constraint if exists user_style_singleton;
alter table user_style drop column if exists id;
alter table user_style add primary key (device_id);
