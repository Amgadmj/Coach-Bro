import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

interface Props {
  height?: number;
}

export function SkeletonLoader({ height = 16 }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.bar, { height, opacity }]} />;
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    width: "100%",
  },
});
