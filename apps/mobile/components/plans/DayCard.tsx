import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { formatMuscleGroup, formatWeight, type WeightUnit } from "@fitness/shared";

import { useUnits } from "@/lib/useUnits";

type DayCardExercise = {
  _id: string;
  exerciseId: string;
  category: "strength" | "cardio";
  exerciseName: string;
  muscleGroup?: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeight?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
};

type DayCardProps = {
  name: string;
  exercises: DayCardExercise[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveName: (newName: string) => Promise<void> | void;
  onRemove: () => void;
  onAddExercise: () => void;
  onEditExercise: (planExerciseId: string) => void;
  onRemoveExercise: (planExerciseId: string) => void;
};

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";
const dayNameStyles =
  "text-lg font-bold text-neutral-900 dark:text-neutral-50";
const dayNameEditStyles =
  "text-lg font-bold text-neutral-900 dark:text-neutral-50 border-b border-brand-500 pb-0.5";
const exerciseRowStyles =
  "flex-row items-center justify-between rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5";
const iconButtonStyles = "p-1.5 active:opacity-60";
const addExerciseButtonStyles =
  "mt-2 flex-row items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-3 py-3 active:bg-neutral-50 dark:active:bg-neutral-800";

function formatTargets(exercise: DayCardExercise, units: WeightUnit): string {
  if (exercise.category === "strength") {
    const parts: string[] = [];
    if (exercise.targetSets !== undefined) {
      parts.push(`${exercise.targetSets} sets`);
    }
    if (
      exercise.targetRepsMin !== undefined &&
      exercise.targetRepsMax !== undefined
    ) {
      parts.push(
        exercise.targetRepsMin === exercise.targetRepsMax
          ? `${exercise.targetRepsMin} reps`
          : `${exercise.targetRepsMin}-${exercise.targetRepsMax} reps`,
      );
    } else if (exercise.targetRepsMin !== undefined) {
      parts.push(`${exercise.targetRepsMin} reps`);
    }
    if (exercise.targetWeight !== undefined) {
      parts.push(formatWeight(exercise.targetWeight, units));
    }
    return parts.length > 0 ? parts.join(" · ") : "No targets";
  }

  const parts: string[] = [];
  if (exercise.targetDurationSec !== undefined) {
    const minutes = Math.round(exercise.targetDurationSec / 60);
    parts.push(`${minutes} min`);
  }
  if (exercise.targetDistanceM !== undefined) {
    const km = (exercise.targetDistanceM / 1000).toFixed(1).replace(/\.0$/, "");
    parts.push(`${km} km`);
  }
  return parts.length > 0 ? parts.join(" · ") : "No targets";
}

export function DayCard({
  name,
  exercises,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSaveName,
  onRemove,
  onAddExercise,
  onEditExercise,
  onRemoveExercise,
}: DayCardProps) {
  const units = useUnits();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);

  const handleStartEditing = () => {
    setDraftName(name);
    setIsEditingName(true);
  };

  const handleCommitEditing = async () => {
    const trimmed = draftName.trim();
    setIsEditingName(false);
    if (trimmed.length === 0 || trimmed === name) return;
    await onSaveName(trimmed);
  };

  return (
    <View className={cardStyles}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          {isEditingName ? (
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              onBlur={handleCommitEditing}
              onSubmitEditing={handleCommitEditing}
              autoFocus
              returnKeyType="done"
              className={dayNameEditStyles}
              maxLength={40}
            />
          ) : (
            <Pressable className="active:opacity-70" onPress={handleStartEditing}>
              <Text className={dayNameStyles} numberOfLines={1}>
                {name}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Tap to rename
              </Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            hitSlop={6}
            className={iconButtonStyles}
            style={{ opacity: canMoveUp ? 1 : 0.3 }}
          >
            <Ionicons name="chevron-up" size={20} color="#6b7280" />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            hitSlop={6}
            className={iconButtonStyles}
            style={{ opacity: canMoveDown ? 1 : 0.3 }}
          >
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={6} className={iconButtonStyles}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <View className="gap-1.5">
        {exercises.length === 0 ? (
          <Text className="px-2 py-1.5 text-sm italic text-neutral-500 dark:text-neutral-400">
            No exercises yet.
          </Text>
        ) : (
          exercises.map((exercise) => (
            <View key={exercise._id} className={exerciseRowStyles}>
              <Pressable
                className="flex-1 pr-2"
                onPress={() => onEditExercise(exercise._id)}
              >
                <Text
                  className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                  numberOfLines={1}
                >
                  {exercise.exerciseName}
                </Text>
                <Text
                  className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400"
                  numberOfLines={1}
                >
                  {formatTargets(exercise, units)}
                  {exercise.muscleGroup
                    ? ` · ${formatMuscleGroup(exercise.muscleGroup)}`
                    : ""}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onRemoveExercise(exercise._id)}
                hitSlop={6}
                className={iconButtonStyles}
              >
                <Ionicons name="close" size={18} color="#9ca3af" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable className={addExerciseButtonStyles} onPress={onAddExercise}>
        <Ionicons name="add" size={18} color="#0ea5e9" />
        <Text className="ml-1.5 text-sm font-semibold text-brand-600 dark:text-brand-400">
          Add exercise
        </Text>
      </Pressable>
    </View>
  );
}
