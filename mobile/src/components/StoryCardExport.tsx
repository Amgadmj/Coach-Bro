import * as Sharing from "expo-sharing";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ViewShot from "react-native-view-shot";

import type { SynthesisResult } from "@/types/schemas";

interface Props {
  result: SynthesisResult;
}

/**
 * The growth-loop surface: a watermarked, story-shaped summary card (never the raw
 * private conversation) the user can share to Instagram/TikTok. See
 * docs/ux_hook_blueprint.md "Investment" section.
 */
export function StoryCardExport({ result }: Props) {
  const viewShotRef = useRef<ViewShot>(null);

  async function handleShare() {
    const uri = await viewShotRef.current?.capture?.();
    if (!uri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  }

  return (
    <View style={styles.wrapper}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.card}>
          <Text style={styles.gauge}>{result.attraction_level}/10</Text>
          <Text style={styles.lesson}>{result.coaching_lesson}</Text>
          <Text style={styles.watermark}>reset AI</Text>
        </View>
      </ViewShot>
      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share this read</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16, alignItems: "center" },
  card: {
    width: 300,
    aspectRatio: 9 / 16,
    borderRadius: 24,
    backgroundColor: "#111827",
    padding: 24,
    justifyContent: "space-between",
  },
  gauge: { color: "white", fontSize: 48, fontWeight: "800" },
  lesson: { color: "#e5e7eb", fontSize: 18, fontWeight: "600" },
  watermark: { color: "#6b7280", fontSize: 12, alignSelf: "flex-end" },
  shareButton: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  shareButtonText: { color: "white", fontWeight: "700" },
});
