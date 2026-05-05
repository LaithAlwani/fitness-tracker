import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { lightTap, successFeedback } from "@/lib/haptics";

type Props = {
  defaultReps?: number;
  defaultWeight?: number;
  onLog: (reps: number, weight: number) => Promise<void>;
};

const numericInputStyles =
  "rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50";
const labelStyles =
  "mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 text-center";

export function SetInputRow({ defaultReps, defaultWeight, onLog }: Props) {
  const [reps, setReps] = useState(defaultReps?.toString() ?? "");
  const [weight, setWeight] = useState(defaultWeight?.toString() ?? "");
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    const repsNumber = Number(reps.trim());
    const weightNumber = Number(weight.trim());
    if (!Number.isFinite(repsNumber) || repsNumber <= 0) return;
    if (!Number.isFinite(weightNumber) || weightNumber < 0) return;

    setIsLogging(true);
    lightTap();
    try {
      await onLog(repsNumber, weightNumber);
      successFeedback();
      setReps(defaultReps?.toString() ?? "");
      setWeight(defaultWeight?.toString() ?? "");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View className="flex-row items-end gap-2">
      <View className="flex-1">
        <Text className={labelStyles}>Reps</Text>
        <TextInput
          className={`${numericInputStyles} h-12`}
          value={reps}
          onChangeText={setReps}
          placeholder={defaultReps?.toString() ?? "0"}
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          returnKeyType="next"
        />
      </View>
      <View className="flex-1">
        <Text className={labelStyles}>Weight (kg)</Text>
        <TextInput
          className={`${numericInputStyles} h-12`}
          value={weight}
          onChangeText={setWeight}
          placeholder={defaultWeight?.toString() ?? "0"}
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>
      <Pressable
        onPress={handleLog}
        disabled={isLogging || reps.length === 0 || weight.length === 0}
        className={`h-12 w-12 items-center justify-center rounded-xl ${
          isLogging || reps.length === 0 || weight.length === 0
            ? "bg-neutral-300 dark:bg-neutral-700"
            : "bg-brand-500 active:bg-brand-600"
        }`}
      >
        <Ionicons name="checkmark" size={22} color="white" />
      </Pressable>
    </View>
  );
}
