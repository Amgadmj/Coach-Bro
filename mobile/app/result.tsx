import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AttractionGauge } from "@/components/AttractionGauge";
import { useAnalysisStore } from "@/state/analysisStore";

export default function ResultScreen() {
  const router = useRouter();
  const result = useAnalysisStore((s) => s.result);
  const reset = useAnalysisStore((s) => s.reset);

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No result yet - go back and upload a screenshot.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AttractionGauge level={result.attraction_level} />

        <Section title="What's actually happening">
          <Text style={styles.body}>{result.dynamic_analysis}</Text>
        </Section>

        <Section title="What they're likely thinking">
          {result.what_they_are_thinking.map((thought, i) => (
            <Text key={i} style={styles.bullet}>
              • {thought}
            </Text>
          ))}
        </Section>

        <Section title="Best response">
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{result.best_response}</Text>
          </View>
        </Section>

        <Section title="Alternatives">
          <ResponseOption label="Playful" text={result.alternative_responses.playful} />
          <ResponseOption label="Direct" text={result.alternative_responses.direct} />
        </Section>

        <Section title="Coaching lesson">
          <Text style={styles.body}>{result.coaching_lesson}</Text>
        </Section>

        <Pressable style={styles.shareLink} onPress={() => router.push("/story-card")}>
          <Text style={styles.shareLinkText}>Export as a shareable card →</Text>
        </Pressable>

        <Pressable
          style={styles.newAnalysisButton}
          onPress={() => {
            reset();
            router.replace("/");
          }}
        >
          <Text style={styles.newAnalysisButtonText}>Analyze another screenshot</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ResponseOption({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.optionCard}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" },
  body: { fontSize: 15, color: "#111827", lineHeight: 21 },
  bullet: { fontSize: 15, color: "#111827", lineHeight: 21 },
  responseCard: { backgroundColor: "#111827", borderRadius: 16, padding: 16 },
  responseText: { color: "white", fontSize: 16, fontWeight: "600" },
  optionCard: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, gap: 4, marginBottom: 8 },
  optionLabel: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  shareLink: { paddingVertical: 12 },
  shareLinkText: { color: "#db2777", fontWeight: "700" },
  newAnalysisButton: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  newAnalysisButtonText: { fontWeight: "700" },
});
