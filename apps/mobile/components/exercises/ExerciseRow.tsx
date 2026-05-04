import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatMuscleGroup } from "@fitness/shared";

type ExerciseRowProps = {
  name: string;
  category: "strength" | "cardio";
  muscleGroup?: string;
  equipment?: string;
  isCustom: boolean;
  onArchive?: () => void;
};

const cardStyles =
  "flex-row items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3";
const nameStyles =
  "text-base font-semibold text-neutral-900 dark:text-neutral-50";
const subtitleStyles = "mt-0.5 text-xs text-neutral-500 dark:text-neutral-400";
const customBadgeStyles =
  "ml-2 rounded-full bg-brand-100 dark:bg-brand-900/40 px-2 py-0.5";
const customBadgeTextStyles =
  "text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300";

export function ExerciseRow({
  name,
  category,
  muscleGroup,
  equipment,
  isCustom,
  onArchive,
}: ExerciseRowProps) {
  const subtitleParts = [
    formatMuscleGroup(muscleGroup),
    equipment ? equipment.charAt(0).toUpperCase() + equipment.slice(1) : "",
  ].filter((part) => part.length > 0);
  const subtitle = subtitleParts.join(" · ");

  return (
    <View className={cardStyles}>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className={nameStyles} numberOfLines={1}>
            {name}
          </Text>
          {isCustom ? (
            <View className={customBadgeStyles}>
              <Text className={customBadgeTextStyles}>Custom</Text>
            </View>
          ) : null}
        </View>
        <Text className={subtitleStyles}>
          {category === "cardio" ? "Cardio" : "Strength"}
          {subtitle ? ` · ${subtitle}` : ""}
        </Text>
      </View>

      {isCustom && onArchive ? (
        <Pressable
          onPress={onArchive}
          hitSlop={8}
          className="ml-3 p-2 active:opacity-60"
        >
          <Ionicons name="trash-outline" size={18} color="#9ca3af" />
        </Pressable>
      ) : null}
    </View>
  );
}
