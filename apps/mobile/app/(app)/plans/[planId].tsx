import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { AddDaySheet } from "@/components/plans/AddDaySheet";
import { DayCard } from "@/components/plans/DayCard";
import { ExercisePickerSheet } from "@/components/plans/ExercisePickerSheet";
import { ExerciseTargetsSheet } from "@/components/plans/ExerciseTargetsSheet";

type EditTargetState = {
  planExerciseId: string;
  exerciseName: string;
  category: "strength" | "cardio";
  targets: {
    targetSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    targetWeight?: number;
    targetDurationSec?: number;
    targetDistanceM?: number;
  };
};

export default function PlanEditorScreen() {
  const router = useRouter();
  const { planId: rawPlanId } = useLocalSearchParams<{ planId: string }>();
  const planId = rawPlanId as string;

  const planDetail = useQuery(api.plans.getPlan, {
    planId: planId as never,
  });

  const updatePlan = useMutation(api.plans.updatePlan);
  const deletePlan = useMutation(api.plans.deletePlan);
  const addDay = useMutation(api.plans.addDay);
  const updateDay = useMutation(api.plans.updateDay);
  const moveDay = useMutation(api.plans.moveDay);
  const removeDay = useMutation(api.plans.removeDay);
  const addExerciseToDay = useMutation(api.plans.addExerciseToDay);
  const removePlanExercise = useMutation(api.plans.removePlanExercise);

  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [pickerForDayId, setPickerForDayId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTargetState | null>(null);
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [planNameDraft, setPlanNameDraft] = useState("");

  if (planDetail === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  if (planDetail === null) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-neutral-700 dark:text-neutral-300">
            Plan not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { plan, days } = planDetail;

  const handlePromptRename = () => {
    setPlanNameDraft(plan.name);
    setEditingPlanName(true);
  };

  const handleCommitRename = async () => {
    const trimmed = planNameDraft.trim();
    if (trimmed.length === 0 || trimmed === plan.name) {
      setEditingPlanName(false);
      return;
    }
    await updatePlan({ planId: planId as never, name: trimmed });
    setEditingPlanName(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete plan?",
      `"${plan.name}" and its days will be deleted. Past workout sessions stay in your history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlan({ planId: planId as never });
            router.back();
          },
        },
      ],
    );
  };

  const handleAddDay = async (name: string) => {
    await addDay({ planId: planId as never, name });
    setIsAddDayOpen(false);
  };

  const handleRemoveDay = (dayId: string, dayName: string) => {
    Alert.alert(
      "Remove day?",
      `"${dayName}" and all its exercises will be removed from this plan.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeDay({ planDayId: dayId as never });
          },
        },
      ],
    );
  };

  const handlePickExercise = async (
    exerciseId: string,
  ) => {
    if (!pickerForDayId) return;
    await addExerciseToDay({
      planDayId: pickerForDayId as never,
      exerciseId: exerciseId as never,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
    });
    setPickerForDayId(null);
  };

  const handleRemoveExercise = (planExerciseId: string) => {
    Alert.alert(
      "Remove exercise?",
      "This exercise will be removed from the day.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removePlanExercise({
              planExerciseId: planExerciseId as never,
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <View className="flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="p-1 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={26} color="#0ea5e9" />
        </Pressable>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Edit plan
        </Text>
        <Pressable
          onPress={handleDelete}
          hitSlop={8}
          className="p-1 active:opacity-60"
        >
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          {editingPlanName ? (
            <TextInput
              value={planNameDraft}
              onChangeText={setPlanNameDraft}
              onBlur={handleCommitRename}
              onSubmitEditing={handleCommitRename}
              autoFocus
              className="text-2xl font-bold text-neutral-900 dark:text-neutral-50"
            />
          ) : (
            <Pressable onPress={handlePromptRename}>
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {plan.name}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Tap to rename
              </Text>
            </Pressable>
          )}
          {plan.description ? (
            <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {plan.description}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          {days.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10">
              <Text className="text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
                No days yet
              </Text>
              <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Add a day below to start building this plan.
              </Text>
            </View>
          ) : (
            days.map((day, index) => (
              <DayCard
                key={day._id}
                name={day.name}
                exercises={day.exercises.map((entry) => ({
                  _id: entry._id,
                  exerciseId: entry.exerciseId,
                  category: entry.exercise?.category ?? "strength",
                  exerciseName: entry.exercise?.name ?? "Unknown exercise",
                  muscleGroup: entry.exercise?.muscleGroup,
                  targetSets: entry.targetSets,
                  targetRepsMin: entry.targetRepsMin,
                  targetRepsMax: entry.targetRepsMax,
                  targetWeight: entry.targetWeight,
                  targetDurationSec: entry.targetDurationSec,
                  targetDistanceM: entry.targetDistanceM,
                }))}
                canMoveUp={index > 0}
                canMoveDown={index < days.length - 1}
                onMoveUp={() =>
                  moveDay({ planDayId: day._id as never, direction: "up" })
                }
                onMoveDown={() =>
                  moveDay({ planDayId: day._id as never, direction: "down" })
                }
                onSaveName={async (newName) => {
                  await updateDay({
                    planDayId: day._id as never,
                    name: newName,
                  });
                }}
                onRemove={() => handleRemoveDay(day._id, day.name)}
                onAddExercise={() => setPickerForDayId(day._id)}
                onEditExercise={(planExerciseId) => {
                  const entry = day.exercises.find(
                    (e) => e._id === planExerciseId,
                  );
                  if (!entry || !entry.exercise) return;
                  setEditTarget({
                    planExerciseId,
                    exerciseName: entry.exercise.name,
                    category: entry.exercise.category,
                    targets: {
                      targetSets: entry.targetSets,
                      targetRepsMin: entry.targetRepsMin,
                      targetRepsMax: entry.targetRepsMax,
                      targetWeight: entry.targetWeight,
                      targetDurationSec: entry.targetDurationSec,
                      targetDistanceM: entry.targetDistanceM,
                    },
                  });
                }}
                onRemoveExercise={handleRemoveExercise}
              />
            ))
          )}
        </View>

        <Pressable
          onPress={() => setIsAddDayOpen(true)}
          className="mt-4 flex-row items-center justify-center rounded-xl border border-dashed border-brand-500 bg-brand-50 dark:bg-brand-950/30 px-4 py-3 active:opacity-80"
        >
          <Ionicons name="add" size={20} color="#0284c7" />
          <Text className="ml-2 text-base font-semibold text-brand-700 dark:text-brand-300">
            Add day
          </Text>
        </Pressable>
      </ScrollView>

      <AddDaySheet
        visible={isAddDayOpen}
        onClose={() => setIsAddDayOpen(false)}
        onSubmit={handleAddDay}
      />

      <ExercisePickerSheet
        visible={pickerForDayId !== null}
        onClose={() => setPickerForDayId(null)}
        onPick={(exerciseId) => handlePickExercise(exerciseId)}
      />

      <ExerciseTargetsSheet
        visible={editTarget !== null}
        onClose={() => setEditTarget(null)}
        planExerciseId={editTarget?.planExerciseId ?? null}
        exerciseName={editTarget?.exerciseName ?? ""}
        category={editTarget?.category ?? "strength"}
        initialTargets={editTarget?.targets ?? {}}
      />
    </SafeAreaView>
  );
}
