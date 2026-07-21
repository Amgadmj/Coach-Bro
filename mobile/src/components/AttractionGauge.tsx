import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  level: number; // 1-10
}

/**
 * The single most "slot-machine" moment in the app (docs/ux_hook_blueprint.md): the
 * gauge fills and locks with a distinct, heavier haptic than the per-agent card ticks.
 */
export function AttractionGauge({ level }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.max(1, Math.min(10, level));
    Animated.timing(progress, {
      toValue: clamped / 10,
      duration: 900,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, [level, progress]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Attraction Gauge</Text>
        <Text style={styles.level}>{level}/10</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolated }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 14, fontWeight: "600", color: "#374151" },
  level: { fontSize: 20, fontWeight: "800" },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 7,
    backgroundColor: "#db2777",
  },
});
