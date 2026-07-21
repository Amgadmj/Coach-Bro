-- Adds the evolving per-contact persona document (see agents/prompts.py
-- PERSONA_SYSTEM_PROMPT). Distilled by the LLM after every read; injected
-- into the debate and synthesis prompts of future reads of the same contact.
alter table contacts add column persona text;
