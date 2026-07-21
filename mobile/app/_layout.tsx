import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "RESET AI" }} />
      <Stack.Screen name="debate-reveal" options={{ title: "Reading the room…", headerBackVisible: false }} />
      <Stack.Screen name="result" options={{ title: "Your read" }} />
      <Stack.Screen name="contacts" options={{ title: "Relationship Memory" }} />
      <Stack.Screen name="story-card" options={{ title: "Share" }} />
    </Stack>
  );
}
