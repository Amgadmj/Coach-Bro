/**
 * Hand-mirrors backend/models/schemas.py. Keep both in sync when either changes -
 * see CLAUDE.md.
 */

export type AgentName = "arthur" | "clara" | "leo";

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
}

export interface AgentOpinion {
  agent: AgentName;
  analysis: string;
  key_points: string[];
  suggested_response?: string | null;
}

export interface AlternativeResponses {
  playful: string;
  direct: string;
}

export interface SynthesisResult {
  attraction_level: number; // 1-10
  dynamic_analysis: string;
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
  | "synthesis_started"
  | "synthesis_done"
  | "error";

export interface DebateEvent {
  type: DebateEventType;
  agent?: AgentName | null;
  payload?: Record<string, unknown> | null;
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
