import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

const cardLockedStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";
const cardUnlockedStyles =
  "rounded-2xl border border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-neutral-900 p-4";

const formatUnlockDate = (ms: number): string => {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function AchievementsScreen() {
  const router = useRouter();
  const achievements = useQuery(api.gamification.myAchievements);

  const isLoading = achievements === undefined;
  const unlockedCount = (achievements ?? []).filter((a) => a.unlocked).length;
  const totalCount = (achievements ?? []).length;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-1 active:opacity-60">
          <Ionicons name="chevron-back" size={26} color="#0ea5e9" />
        </Pressable>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Achievements
        </Text>
        <View className="w-9" />
      </View>

      {!isLoading ? (
        <View className="px-6 pt-4">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            {unlockedCount} of {totalCount} unlocked
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={achievements}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <View
              className={`flex-1 ${item.unlocked ? cardUnlockedStyles : cardLockedStyles}`}
              style={{ opacity: item.unlocked ? 1 : 0.55 }}
            >
              <View className="items-start">
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    item.unlocked
                      ? "bg-brand-200 dark:bg-brand-900/50"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  <Ionicons
                    name={
                      item.unlocked
                        ? (item.icon as keyof typeof Ionicons.glyphMap)
                        : "lock-closed-outline"
                    }
                    size={20}
                    color={item.unlocked ? "#0284c7" : "#9ca3af"}
                  />
                </View>
                <Text
                  className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={3}>
                  {item.description}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Text className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                    +{item.xpReward} XP
                  </Text>
                  {item.unlocked && item.unlockedAt !== undefined ? (
                    <Text className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      · {formatUnlockDate(item.unlockedAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
