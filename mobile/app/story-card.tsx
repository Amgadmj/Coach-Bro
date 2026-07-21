import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StoryCardExport } from "@/components/StoryCardExport";
import { useAnalysisStore } from "@/state/analysisStore";

export default function StoryCardScreen() {
  const result = useAnalysisStore((s) => s.result);

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No result to share yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StoryCardExport result={result} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
});
