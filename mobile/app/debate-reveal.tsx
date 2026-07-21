import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebateAvatarStack } from "@/components/DebateAvatarStack";
import { useAnalysisStore } from "@/state/analysisStore";
import type { AgentName } from "@/types/schemas";

export default function DebateRevealScreen() {
  const router = useRouter();
  const status = useAnalysisStore((s) => s.status);
  const agentStatus = useAnalysisStore((s) => s.agentStatus);
  const events = useAnalysisStore((s) => s.events);

  useEffect(() => {
    if (status === "done") {
      router.replace("/result");
    }
  }, [status, router]);

  const analysisByAgent = useMemo(() => {
    const map: Partial<Record<AgentName, string>> = {};
    for (const event of events) {
      if (event.type === "agent_done" && event.agent && event.payload) {
        map[event.agent] = (event.payload as { analysis?: string }).analysis;
      }
    }
    return map;
  }, [events]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Arthur, Clara, and Leo are debating…</Text>
        <DebateAvatarStack agentStatus={agentStatus} analysisByAgent={analysisByAgent} />
        {status === "error" && <Text style={styles.error}>Something went wrong. Try again.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 20 },
  heading: { fontSize: 18, fontWeight: "700" },
  error: { color: "#b91c1c", fontSize: 14 },
});
