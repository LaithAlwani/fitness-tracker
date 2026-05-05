import { Ionicons } from "@expo/vector-icons";
import { findAchievement, findQuest } from "@fitness/shared";
import { useEffect, useRef } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

import { heavyTap, successFeedback } from "@/lib/haptics";

type Props = {
  visible: boolean;
  onClose: () => void;
  outcome: {
    xpDelta: number;
    totalXp: number;
    newLevel: number;
    leveledUp: boolean;
    questsCompleted: string[];
    achievementsUnlocked: string[];
  } | null;
};

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";

export function SessionCelebrationOverlay({ visible, onClose, outcome }: Props) {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (!visible || !outcome) return;
    // Haptic combo: heavy thunk + success ding for level up; just a success
    // ding otherwise.
    if (outcome.leveledUp) {
      heavyTap();
      setTimeout(() => successFeedback(), 200);
    } else if (outcome.achievementsUnlocked.length > 0 || outcome.xpDelta > 0) {
      successFeedback();
    }
  }, [visible, outcome]);

  if (!outcome) return null;

  const hasAnyExtras =
    outcome.questsCompleted.length > 0 ||
    outcome.achievementsUnlocked.length > 0;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View
          className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-950 p-6"
          style={{ maxHeight: "85%" }}
        >
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
              <Ionicons
                name={outcome.leveledUp ? "star" : "trophy-outline"}
                size={32}
                color="#0ea5e9"
              />
            </View>
            <Text className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {outcome.leveledUp ? `Level ${outcome.newLevel}!` : "Workout complete"}
            </Text>
            {outcome.leveledUp ? (
              <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                You leveled up
              </Text>
            ) : null}
          </View>

          <View className="mt-5 items-center rounded-2xl bg-brand-500 dark:bg-brand-600 px-4 py-5">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white/70">
              XP earned
            </Text>
            <Text className="mt-1 text-4xl font-bold text-white tabular-nums">
              +{outcome.xpDelta}
            </Text>
            <Text className="mt-1 text-xs text-white/70">
              Total: {outcome.totalXp} XP
            </Text>
          </View>

          {hasAnyExtras ? (
            <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
              {outcome.achievementsUnlocked.length > 0 ? (
                <View className="mb-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Achievements unlocked
                  </Text>
                  <View className="gap-2">
                    {outcome.achievementsUnlocked.map((key) => {
                      const def = findAchievement(key);
                      if (!def) return null;
                      return (
                        <View key={key} className={cardStyles}>
                          <View className="flex-row items-center">
                            <Ionicons
                              name={def.icon as keyof typeof Ionicons.glyphMap}
                              size={20}
                              color="#0ea5e9"
                            />
                            <View className="ml-2.5 flex-1">
                              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                                {def.name}
                              </Text>
                              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                                {def.description}
                              </Text>
                            </View>
                            <Text className="text-xs font-bold text-brand-600 dark:text-brand-400">
                              +{def.xpReward}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {outcome.questsCompleted.length > 0 ? (
                <View className="mb-2">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Quests completed
                  </Text>
                  <View className="gap-2">
                    {outcome.questsCompleted.map((key) => {
                      const def = findQuest(key);
                      if (!def) return null;
                      return (
                        <View key={key} className={cardStyles}>
                          <View className="flex-row items-center">
                            <Ionicons
                              name={def.icon as keyof typeof Ionicons.glyphMap}
                              size={20}
                              color="#22c55e"
                            />
                            <View className="ml-2.5 flex-1">
                              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                                {def.name}
                              </Text>
                              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                                {def.description}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          <Pressable
            onPress={onClose}
            className="mt-5 rounded-xl bg-brand-500 px-4 py-4 items-center active:bg-brand-600"
          >
            <Text className="text-base font-semibold text-white">Nice!</Text>
          </Pressable>
        </View>

        {visible ? (
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <ConfettiCannon
              ref={confettiRef}
              count={outcome.leveledUp ? 200 : 100}
              origin={{ x: 0, y: 0 }}
              autoStart
              fadeOut
              fallSpeed={2500}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
