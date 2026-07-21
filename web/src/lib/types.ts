/**
 * Hand-mirrors backend/models/schemas.py. Keep both in sync when either changes -
 * see CLAUDE.md.
 */

export type AgentName = "arthur" | "clara" | "leo";
export type SocialMode = "hype" | "chill" | "romantic" | "direct";
// "auto" = match whatever language the screenshot/scenario is actually in;
// see backend/models/schemas.py::SupportedLanguage and lib/i18n.ts::LanguageCode
// (the same set - i18n.ts re-declares it since it also needs UI-dictionary keys).
export type SupportedLanguage = "auto" | "en" | "es" | "ar" | "fr" | "pt" | "hi";

export interface Message {
  sender: "user" | "match";
  text: string;
  timestamp?: string | null;
  bubble_color?: string | null;
  response_lag_seconds?: number | null;
}

export interface ConversationContext {
  contact_id?: string | null;
  messages: Message[];
  extracted_at: string;
  detected_language?: string | null;
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
  what_she_is_thinking: string[];
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

export interface Suggestion {
  label: string;
  text: string;
}

export interface SuggestResponse {
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
}
