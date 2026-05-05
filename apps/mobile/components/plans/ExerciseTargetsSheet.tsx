import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { api } from "@fitness/convex";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

type Props = {
  visible: boolean;
  onClose: () => void;
  planExerciseId: string | null;
  exerciseName: string;
  category: "strength" | "cardio";
  initialTargets: {
    targetSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    targetWeight?: number;
    targetDurationSec?: number;
    targetDistanceM?: number;
  };
};

export function ExerciseTargetsSheet({
  visible,
  onClose,
  planExerciseId,
  exerciseName,
  category,
  initialTargets,
}: Props) {
  const updatePlanExercise = useMutation(api.plans.updatePlanExercise);

  const [sets, setSets] = useState("");
  const [repsMin, setRepsMin] = useState("");
  const [repsMax, setRepsMax] = useState("");
  const [weight, setWeight] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSets(initialTargets.targetSets?.toString() ?? "");
    setRepsMin(initialTargets.targetRepsMin?.toString() ?? "");
    setRepsMax(initialTargets.targetRepsMax?.toString() ?? "");
    setWeight(initialTargets.targetWeight?.toString() ?? "");
    setDurationMin(
      initialTargets.targetDurationSec
        ? Math.round(initialTargets.targetDurationSec / 60).toString()
        : "",
    );
    setDistanceKm(
      initialTargets.targetDistanceM
        ? (initialTargets.targetDistanceM / 1000).toString()
        : "",
    );
  }, [visible, initialTargets]);

  const parseNumeric = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleSave = async () => {
    if (!planExerciseId) return;
    setIsSubmitting(true);

    try {
      const durationMinutes = parseNumeric(durationMin);
      const distanceKilometers = parseNumeric(distanceKm);

      await updatePlanExercise({
        planExerciseId: planExerciseId as never,
        targetSets: parseNumeric(sets),
        targetRepsMin: parseNumeric(repsMin),
        targetRepsMax: parseNumeric(repsMax),
        targetWeight: parseNumeric(weight),
        targetDurationSec:
          durationMinutes !== undefined
            ? Math.round(durationMinutes * 60)
            : undefined,
        targetDistanceM:
          distanceKilometers !== undefined
            ? Math.round(distanceKilometers * 1000)
            : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="rounded-t-3xl bg-white dark:bg-neutral-950">
            <View className="items-center pt-3">
              <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </View>

            <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {exerciseName}
              </Text>
              <Text className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Targets are suggestions for the day &mdash; you can override
                them while logging.
              </Text>

              {category === "strength" ? (
                <>
                  <AuthInput
                    label="Target sets"
                    value={sets}
                    onChangeText={setSets}
                    placeholder="3"
                    keyboardType="number-pad"
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <AuthInput
                        label="Reps (min)"
                        value={repsMin}
                        onChangeText={setRepsMin}
                        placeholder="8"
                        keyboardType="number-pad"
                      />
                    </View>
                    <View className="flex-1">
                      <AuthInput
                        label="Reps (max)"
                        value={repsMax}
                        onChangeText={setRepsMax}
                        placeholder="12"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <AuthInput
                    label="Target weight"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="60"
                    keyboardType="decimal-pad"
                  />
                </>
              ) : (
                <>
                  <AuthInput
                    label="Duration (minutes)"
                    value={durationMin}
                    onChangeText={setDurationMin}
                    placeholder="30"
                    keyboardType="decimal-pad"
                  />
                  <AuthInput
                    label="Distance (km)"
                    value={distanceKm}
                    onChangeText={setDistanceKm}
                    placeholder="5"
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <View className="mb-4 mt-2 gap-3">
                <AuthButton
                  label="Save targets"
                  loading={isSubmitting}
                  onPress={handleSave}
                />
                <AuthButton label="Cancel" variant="secondary" onPress={onClose} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
