import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatWeight, type WeightUnit } from "@fitness/shared";

type Props = {
  recordedAt: number;
  bodyweight?: number;
  bodyFatPct?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    arm?: number;
  };
  units: WeightUnit;
  onPress: () => void;
  onRemove: () => void;
};

const cardStyles =
  "flex-row items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-800";

const formatDate = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function MetricsRow({
  recordedAt,
  bodyweight,
  bodyFatPct,
  measurements,
  units,
  onPress,
  onRemove,
}: Props) {
  const bodyweightDisplay =
    bodyweight !== undefined ? formatWeight(bodyweight, units) : "";
  const bodyFatDisplay = bodyFatPct !== undefined ? `${bodyFatPct}%` : "";

  const measurementParts: string[] = [];
  if (measurements?.chest !== undefined) {
    measurementParts.push(`Chest ${measurements.chest}`);
  }
  if (measurements?.waist !== undefined) {
    measurementParts.push(`Waist ${measurements.waist}`);
  }
  if (measurements?.hips !== undefined) {
    measurementParts.push(`Hips ${measurements.hips}`);
  }
  if (measurements?.thigh !== undefined) {
    measurementParts.push(`Thigh ${measurements.thigh}`);
  }
  if (measurements?.arm !== undefined) {
    measurementParts.push(`Arm ${measurements.arm}`);
  }

  const summaryParts = [bodyweightDisplay, bodyFatDisplay].filter(
    (part) => part.length > 0,
  );
  if (measurementParts.length > 0) {
    summaryParts.push(`${measurementParts.length} measurement${measurementParts.length === 1 ? "" : "s"}`);
  }
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : "—";

  return (
    <Pressable className={cardStyles} onPress={onPress}>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {formatDate(recordedAt)}
        </Text>
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {summary}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        className="ml-2 p-1.5 active:opacity-60"
      >
        <Ionicons name="trash-outline" size={18} color="#9ca3af" />
      </Pressable>
    </Pressable>
  );
}
