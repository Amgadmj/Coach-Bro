import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchContacts } from "@/api/client";
import type { ContactSummary } from "@/types/schemas";

/**
 * Relationship Memory list. Copy is deliberately loss-aversion framed per
 * docs/ux_hook_blueprint.md "Investment" section.
 */
export default function ContactsScreen() {
  const [contacts, setContacts] = useState<ContactSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts()
      .then(setContacts)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!contacts) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No reads yet - analyze a screenshot to start building memory.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.meta}>
              You have {item.session_count} {item.session_count === 1 ? "read" : "reads"} on{" "}
              {item.display_name} — the next one gets sharper.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, gap: 12 },
  row: { backgroundColor: "#f9fafb", borderRadius: 16, padding: 16, gap: 4 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, color: "#6b7280" },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 40 },
  error: { color: "#b91c1c", padding: 20 },
});
