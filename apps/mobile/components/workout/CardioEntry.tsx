import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { successFeedback } from "@/lib/haptics";

type Props = {
  cardioLogId: string | null;
  durationSec?: number;
  distanceM?: number;
  onLog: (durationSec: number, distanceM?: number) => Promise<void>;
  onUpdate: (durationSec: number, distanceM?: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

const numericInputStyles =
  "rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50";
const labelStyles =
  "mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 text-center";

export function CardioEntry({
  cardioLogId,
  durationSec,
  distanceM,
  onLog,
  onUpdate,
  onRemove,
}: Props) {
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDurationMin(
      durationSec ? Math.round(durationSec / 60).toString() : "",
    );
    setDistanceKm(distanceM ? (distanceM / 1000).toString() : "");
  }, [durationSec, distanceM]);

  const handleSave = async () => {
    const durationMinutes = Number(durationMin.trim());
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return;
    const durationSecondsValue = Math.round(durationMinutes * 60);

    const distanceKilometers = Number(distanceKm.trim());
    const distanceMetersValue = Number.isFinite(distanceKilometers) && distanceKilometers > 0
      ? Math.round(distanceKilometers * 1000)
      : undefined;

    setIsSaving(true);
    try {
      if (cardioLogId) {
        await onUpdate(durationSecondsValue, distanceMetersValue);
      } else {
        await onLog(durationSecondsValue, distanceMetersValue);
      }
      successFeedback();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Text className={labelStyles}>Duration (min)</Text>
          <TextInput
            className={`${numericInputStyles} h-12`}
            value={durationMin}
            onChangeText={setDurationMin}
            placeholder="30"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
        </View>
        <View className="flex-1">
          <Text className={labelStyles}>Distance (km)</Text>
          <TextInput
            className={`${numericInputStyles} h-12`}
            value={distanceKm}
            onChangeText={setDistanceKm}
            placeholder="—"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
        </View>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || durationMin.length === 0}
          className={`h-12 w-12 items-center justify-center rounded-xl ${
            isSaving || durationMin.length === 0
              ? "bg-neutral-300 dark:bg-neutral-700"
              : "bg-brand-500 active:bg-brand-600"
          }`}
        >
          <Ionicons name="checkmark" size={22} color="white" />
        </Pressable>
      </View>
      {cardioLogId ? (
        <Pressable
          onPress={onRemove}
          className="self-end p-1 active:opacity-60"
          hitSlop={6}
        >
          <Text className="text-xs font-medium text-red-500 dark:text-red-400">
            Remove cardio log
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
