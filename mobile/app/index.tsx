import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ImagePickerDropzone } from "@/components/ImagePickerDropzone";
import { useAnalysisStore } from "@/state/analysisStore";

/**
 * Home screen. Per docs/ux_hook_blueprint.md, the upload dropzone is the entire
 * screen's focus - no onboarding carousel, no login wall in front of it.
 */
export default function HomeScreen() {
  const router = useRouter();
  const runAnalysis = useAnalysisStore((s) => s.runAnalysis);

  function handlePicked(asset: { uri: string; mimeType: string; fileName: string }) {
    router.push("/debate-reveal");
    void runAnalysis({
      imageUri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>What did that text actually mean?</Text>
        <Text style={styles.subtitle}>Upload the screenshot. Get a calibrated read in seconds.</Text>
      </View>
      <ImagePickerDropzone onPicked={handlePicked} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 24 },
  hero: { gap: 8, marginTop: 12 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 15, color: "#6b7280" },
});
