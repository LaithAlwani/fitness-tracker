import { useQuery } from "convex/react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

const placeholderCardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5";
const sectionTitleStyles =
  "mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

export default function DashboardScreen() {
  const currentUser = useQuery(api.users.me);

  const greeting = currentUser?.firstName
    ? `Welcome back, ${currentUser.firstName} 👋`
    : "Welcome 👋";

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-6 pt-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {greeting}
        </Text>
        <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
          Phase 0 done — auth works. Plans, workouts, and gamification land in
          later phases.
        </Text>
      </View>

      <View className="mt-6 gap-3 px-6">
        <Text className={sectionTitleStyles}>Coming soon</Text>

        <View className={placeholderCardStyles}>
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Weekly quests
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Phase 8 unlocks Duolingo-style quests with progress rings.
          </Text>
        </View>

        <View className={placeholderCardStyles}>
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Recent sessions
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Phase 4 turns this into a live workout log.
          </Text>
        </View>

        <View className={placeholderCardStyles}>
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Next level
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Phase 8 wires up XP + levels.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
