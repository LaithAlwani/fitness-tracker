import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { LevelCard } from "@/components/gamification/LevelCard";
import { QuestCard } from "@/components/gamification/QuestCard";

const sectionTitleStyles =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";
const placeholderCardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5";
const achievementCardStyles =
  "rounded-2xl border border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-neutral-900 p-4";

export default function DashboardScreen() {
  const currentUser = useQuery(api.users.me);
  const stats = useQuery(api.gamification.myStats);
  const quests = useQuery(api.gamification.myActiveQuests);
  const achievements = useQuery(api.gamification.myAchievements);
  const router = useRouter();

  const greeting = currentUser?.firstName
    ? `Welcome back, ${currentUser.firstName} 👋`
    : "Welcome 👋";

  const recentlyUnlocked = (achievements ?? [])
    .filter((a) => a.unlocked && a.unlockedAt !== undefined)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
    .slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {greeting}
        </Text>

        {/* Level card */}
        <View style={{ marginTop: 20 }}>
          {stats ? (
            <LevelCard
              level={stats.level}
              xp={stats.xp}
              xpIntoLevel={stats.xpIntoLevel}
              xpForLevel={stats.xpForLevel}
              ratio={stats.ratio}
            />
          ) : (
            <View className="h-32 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          )}
        </View>

        {/* Weekly quests section */}
        <View style={{ marginTop: 24 }}>
          <Text className={sectionTitleStyles} style={{ marginBottom: 12 }}>
            Weekly quests
          </Text>

          {quests === undefined ? (
            <View className="h-20 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          ) : quests.length === 0 ? (
            <View className={placeholderCardStyles}>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Quests will appear here at the start of each week.
              </Text>
            </View>
          ) : (
            quests.map((quest, index) => (
              <View
                key={quest.questKey}
                style={{ marginTop: index === 0 ? 0 : 8 }}
              >
                <QuestCard
                  name={quest.name}
                  description={quest.description}
                  icon={quest.icon as keyof typeof Ionicons.glyphMap}
                  progress={quest.progress}
                  target={quest.target}
                  completed={quest.completed}
                />
              </View>
            ))
          )}
        </View>

        {/* Recent achievements section */}
        <View style={{ marginTop: 24 }}>
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 12 }}
          >
            <Text className={sectionTitleStyles}>Recent achievements</Text>
            <Pressable onPress={() => router.push("/(app)/achievements")} hitSlop={8}>
              <Text className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                View all
              </Text>
            </Pressable>
          </View>

          {recentlyUnlocked.length === 0 ? (
            <View className={placeholderCardStyles}>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Finish your first workout to start unlocking badges.
              </Text>
            </View>
          ) : (
            recentlyUnlocked.map((achievement, index) => (
              <View
                key={achievement.key}
                className={achievementCardStyles}
                style={{ marginTop: index === 0 ? 0 : 8 }}
              >
                <View className="flex-row items-start">
                  <Ionicons
                    name={achievement.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color="#0ea5e9"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                      numberOfLines={1}
                    >
                      {achievement.name}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400"
                      numberOfLines={2}
                    >
                      {achievement.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
