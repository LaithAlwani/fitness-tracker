import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type PlanRowProps = {
  name: string;
  description?: string;
  dayCount: number;
  onPress: () => void;
};

const cardStyles =
  "flex-row items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-4 active:bg-neutral-50 dark:active:bg-neutral-800";
const nameStyles =
  "text-base font-semibold text-neutral-900 dark:text-neutral-50";
const descriptionStyles = "mt-0.5 text-sm text-neutral-500 dark:text-neutral-400";

export function PlanRow({ name, description, dayCount, onPress }: PlanRowProps) {
  const meta = `${dayCount} ${dayCount === 1 ? "day" : "days"}`;

  return (
    <Pressable className={cardStyles} onPress={onPress}>
      <View className="flex-1">
        <Text className={nameStyles} numberOfLines={1}>
          {name}
        </Text>
        <Text className={descriptionStyles} numberOfLines={1}>
          {description ? `${description} · ${meta}` : meta}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </Pressable>
  );
}
