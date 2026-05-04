import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryTab() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-6">
      <Ionicons name="time-outline" size={48} color="#0ea5e9" />
      <Text className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        History
      </Text>
      <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
        Phase 6 shows session history here.
      </Text>
    </SafeAreaView>
  );
}
