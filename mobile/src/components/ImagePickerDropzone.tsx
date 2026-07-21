import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  onPicked: (asset: { uri: string; mimeType: string; fileName: string }) => void;
}

/**
 * The entire Home screen's focal point - per docs/ux_hook_blueprint.md, this must be a
 * single tap from app open to the OS image picker, no intermediate confirmation screen.
 */
export function ImagePickerDropzone({ onPicked }: Props) {
  async function handlePress() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    onPicked({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? "screenshot.jpg",
    });
  }

  return (
    <Pressable onPress={handlePress} style={styles.dropzone}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>+</Text>
      </View>
      <Text style={styles.title}>Upload the screenshot</Text>
      <Text style={styles.subtitle}>Tap to pick a chat screenshot and get your read</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dropzone: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#a3a3a3",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "white",
    fontSize: 32,
    lineHeight: 34,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
