-- Global (not per-contact): the app's own user's texting voice, learned from
-- his "user"-sender messages across every read regardless of which contact.
-- See agents/prompts.py::USER_STYLE_SYSTEM_PROMPT. Single-row table.
create table if not exists user_style (
  id int primary key default 1,
  style text,
  constraint user_style_singleton check (id = 1)
);
