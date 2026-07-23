-- Per-contact gender, set via PATCH /contacts/{contact_id} (see main.py) -
-- separate from the app user's own gender (which lives client-side in
-- web/src/lib/session.ts, sent per-request, not stored server-side). A
-- single user may be dating people of more than one gender, so this lives on
-- the contact, not as a single global default - see agents/prompts.py's
-- pronoun/pairing logic for how it's consumed.
alter table contacts add column if not exists match_gender text;
