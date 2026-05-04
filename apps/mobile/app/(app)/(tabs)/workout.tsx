import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 active:bg-neutral-50 dark:active:bg-neutral-800";

export default function WorkoutTab() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-6 pt-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Workout
        </Text>
        <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
          Phase 4 wires up the workout logger. For now, browse the exercise
          library.
        </Text>
      </View>

      <View className="mt-6 gap-3 px-6">
        <Pressable
          className={cardStyles}
          onPress={() => router.push("/(app)/exercises")}
        >
          <View className="flex-row items-center">
            <Ionicons name="barbell-outline" size={24} color="#0ea5e9" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Browse exercises
              </Text>
              <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                Seeded library + your custom additions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
