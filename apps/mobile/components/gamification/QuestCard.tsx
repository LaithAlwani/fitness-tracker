import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  progress: number;
  target: number;
  completed: boolean;
};

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";

const completedCardStyles =
  "rounded-2xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 p-4";

const formatProgressLabel = (
  progress: number,
  target: number,
  completed: boolean,
): string => {
  if (completed) return "Done!";
  const cappedProgress = Math.max(0, Math.min(target, progress));
  // For volume quests (target > 1000) format with thousands separator.
  if (target >= 1000) {
    return `${Math.round(cappedProgress).toLocaleString()} / ${target.toLocaleString()}`;
  }
  return `${Math.round(cappedProgress)} / ${target}`;
};

export function QuestCard({
  name,
  description,
  icon,
  progress,
  target,
  completed,
}: Props) {
  const ratio = Math.max(0, Math.min(1, target > 0 ? progress / target : 0));
  const widthPercent = `${Math.round(ratio * 100)}%`;

  return (
    <View className={completed ? completedCardStyles : cardStyles}>
      <View className="flex-row items-center">
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${
            completed
              ? "bg-green-200 dark:bg-green-900/50"
              : "bg-brand-100 dark:bg-brand-900/40"
          }`}
        >
          <Ionicons
            name={icon}
            size={18}
            color={completed ? "#15803d" : "#0ea5e9"}
          />
        </View>
        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {description}
          </Text>
        </View>
        <Text
          className={`ml-2 text-xs font-semibold ${
            completed
              ? "text-green-700 dark:text-green-300"
              : "text-neutral-700 dark:text-neutral-200"
          }`}
        >
          {formatProgressLabel(progress, target, completed)}
        </Text>
      </View>

      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <View
          className={`h-full rounded-full ${completed ? "bg-green-500" : "bg-brand-500"}`}
          style={{ width: widthPercent as `${number}%` }}
        />
      </View>
    </View>
  );
}
