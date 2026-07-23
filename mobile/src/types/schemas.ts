/**
 * Hand-mirrors backend/models/schemas.py. Keep both in sync when either changes -
 * see CLAUDE.md.
 */

export type AgentName = "arthur" | "clara" | "leo";
export type SocialMode = "hype" | "chill" | "romantic" | "direct";
// See backend/models/schemas.py::Gender - the app user's own gender and,
// separately, a specific contact's gender (ContactSummary.match_gender
// below). Mobile has no onboarding/session-store surface to set or use
// these yet (see mobile/README.md's known gaps) - kept in sync per
// CLAUDE.md's mirroring rule for when that lands.
export type Gender = "male" | "female" | "non_binary";
// "auto" = match whatever language the screenshot/scenario is actually in;
// see backend/models/schemas.py::SupportedLanguage.
export type SupportedLanguage = "auto" | "en" | "es" | "ar" | "fr" | "pt" | "hi";

export interface Message {
  sender: "user" | "match";
  text: string;
  timestamp?: string | null;
  bubble_color?: string | null;
  response_lag_seconds?: number | null;
  message_type?: "text" | "voice_note" | "image" | "sticker" | "gif" | "video" | "other";
  duration_seconds?: number | null;
  reactions?: string[];
}

export interface ConversationContext {
  contact_id?: string | null;
  detected_language?: string | null;
  messages: Message[];
  extracted_at: string;
  // Only set when the user attached free-text commentary alongside screenshot(s) -
  // see backend/models/schemas.py::ConversationContext.scenario_notes. Null for a
  // text-only read (the text itself becomes `messages`, not this field) or a
  // screenshot-only read.
  scenario_notes?: string | null;
}

export interface AgentOpinion {
  agent: AgentName;
  headline: string; // one short sentence, always visible in the debate feed
  analysis: string; // 2-3 sentences of supporting detail, shown on expand
}

export interface AlternativeResponses {
  playful: string;
  direct: string;
}

export interface SynthesisResult {
  attraction_level: number; // 1-10
  dynamic_summary: string; // one short sentence, always visible under the gauge
  dynamic_analysis: string; // 2-3 sentences, shown only on expand
  what_they_are_thinking: string[];
  best_response: string;
  alternative_responses: AlternativeResponses;
  coaching_lesson: string;
}

export type DebateEventType =
  | "extraction_started"
  | "extraction_done"
  | "agent_started"
  | "agent_done"
  | "agent_reply"
  | "synthesis_started"
  | "synthesis_done"
  | "memory_updated"
  | "error";

export interface MemoryUpdate {
  contact_id: string;
  read_count: number;
  persona: string;
}

export interface DebateEvent {
  type: DebateEventType;
  agent?: AgentName | null;
  payload?: Record<string, unknown> | null;
}

// Product-facing mission chips ("Icebreaker" / "Vibe Shift" / "Exit Strategy") plus the
// default cold-open case - see backend/agents/prompts.py::_SUGGEST_CATEGORY_INSTRUCTIONS.
export type SuggestCategory = "opener" | "icebreaker" | "vibe_shift" | "exit_strategy";

export interface SuggestRequest {
  scenario: string;
  mode: SocialMode;
  language: SupportedLanguage;
  category: SuggestCategory;
  // Incremented each time the user asks for a fresh batch for the same scenario -
  // see backend/models/schemas.py::SuggestRequest.seed.
  seed: number;
}

export interface Suggestion {
  label: string;
  text: string;
}

export interface SuggestResponse {
  language: string;
  suggestions: Suggestion[];
}

export interface MemoryRecord {
  contact_id: string;
  session_id?: string | null;
  summary: string;
  created_at: string;
}

export interface ContactSummary {
  id: string;
  display_name: string;
  session_count: number;
  last_interaction_at?: string | null;
  match_gender?: Gender | null;
}
