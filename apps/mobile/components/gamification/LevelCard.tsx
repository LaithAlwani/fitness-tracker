import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { XpBar } from "@/components/gamification/XpBar";

type Props = {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  ratio: number;
};

const cardStyles =
  "rounded-2xl bg-brand-500 dark:bg-brand-600 p-5";

export function LevelCard({ level, xp, xpIntoLevel, xpForLevel, ratio }: Props) {
  return (
    <View className={cardStyles}>
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <Ionicons name="star" size={22} color="white" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Level
          </Text>
          <Text className="text-3xl font-bold text-white">{level}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Total XP
          </Text>
          <Text className="text-xl font-bold text-white tabular-nums">{xp}</Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="overflow-hidden rounded-full bg-white/20 h-2">
          <View
            className="h-full rounded-full bg-white"
            style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` as `${number}%` }}
          />
        </View>
        <Text className="mt-1.5 text-xs text-white/80">
          {xpIntoLevel} / {xpForLevel} XP to level {level + 1}
        </Text>
      </View>
    </View>
  );
}
