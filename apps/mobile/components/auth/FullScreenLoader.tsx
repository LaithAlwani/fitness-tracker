import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  message?: string;
};

// Inline styles (no NativeWind) so this is rock-solid even when rendered above
// or outside the navigation tree where NativeWind's runtime might lag a tick.
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
});

export function FullScreenLoader({ visible, message = "Signing you in..." }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}
