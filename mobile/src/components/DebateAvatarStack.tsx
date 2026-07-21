import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { AgentStatus } from "@/state/analysisStore";
import type { AgentName } from "@/types/schemas";
import { SkeletonLoader } from "./SkeletonLoader";

const AGENT_META: Record<AgentName, { label: string; emoji: string; color: string }> = {
  arthur: { label: "Arthur", emoji: "♟️", color: "#1f2937" }, // frame/status
  clara: { label: "Clara", emoji: "🔍", color: "#9d174d" }, // subtext
  leo: { label: "Leo", emoji: "😏", color: "#b45309" }, // charm
};

interface Props {
  agentStatus: Record<AgentName, AgentStatus>;
  analysisByAgent: Partial<Record<AgentName, string>>;
}

/**
 * Renders the "slot machine" debate reveal: each agent's card animates in when it
 * transitions from pending -> active, and its skeleton resolves into real text on
 * active -> done. Pacing is driven by when the store receives events, not by a fixed
 * timer here - the deliberate pacing floor lives in the store/API layer per
 * docs/ux_hook_blueprint.md.
 */
export function DebateAvatarStack({ agentStatus, analysisByAgent }: Props) {
  return (
    <View style={styles.stack}>
      {(Object.keys(AGENT_META) as AgentName[]).map((agent) => (
        <AgentCard
          key={agent}
          agent={agent}
          status={agentStatus[agent]}
          analysis={analysisByAgent[agent]}
        />
      ))}
    </View>
  );
}

function AgentCard({
  agent,
  status,
  analysis,
}: {
  agent: AgentName;
  status: AgentStatus;
  analysis?: string;
}) {
  const meta = AGENT_META[agent];
  const scale = useRef(new Animated.Value(status === "pending" ? 0.9 : 1)).current;
  const opacity = useRef(new Animated.Value(status === "pending" ? 0 : 1)).current;

  useEffect(() => {
    if (status === "pending") return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [status, scale, opacity]);

  if (status === "pending") return null;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <View style={[styles.avatar, { backgroundColor: meta.color }]}>
        <Text style={styles.avatarEmoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>{meta.label}</Text>
        {status === "active" || !analysis ? (
          <View style={styles.skeletonGroup}>
            <SkeletonLoader />
            <SkeletonLoader />
          </View>
        ) : (
          <Text style={styles.cardText}>{analysis}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 18 },
  cardBody: { flex: 1, gap: 6 },
  cardLabel: { fontWeight: "700", fontSize: 14 },
  cardText: { fontSize: 14, color: "#374151" },
  skeletonGroup: { gap: 6 },
});
