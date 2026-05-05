import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { ExercisePickerSheet } from "@/components/plans/ExercisePickerSheet";
import { RestTimer } from "@/components/workout/RestTimer";
import { SessionEntryCard } from "@/components/workout/SessionEntryCard";

const DEFAULT_REST_SECONDS = 90;

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ActiveSessionScreen() {
  useKeepAwake();
  const router = useRouter();
  const { sessionId: rawSessionId } = useLocalSearchParams<{
    sessionId: string;
  }>();
  const sessionId = rawSessionId as string;

  const detail = useQuery(api.sessions.getSession, {
    sessionId: sessionId as never,
  });

  const finishSession = useMutation(api.sessions.finishSession);
  const cancelSession = useMutation(api.sessions.cancelSession);
  const addEntry = useMutation(api.sessions.addEntry);
  const removeEntry = useMutation(api.sessions.removeEntry);
  const logSet = useMutation(api.sessions.logSet);
  const removeSet = useMutation(api.sessions.removeSet);
  const logCardio = useMutation(api.sessions.logCardio);
  const updateCardio = useMutation(api.sessions.updateCardio);
  const removeCardio = useMutation(api.sessions.removeCardio);

  const [now, setNow] = useState(Date.now());
  const [restTimerKey, setRestTimerKey] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = useMemo(() => {
    if (!detail) return 0;
    return now - detail.session.startedAt;
  }, [detail, now]);

  if (detail === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  if (detail === null) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-neutral-700 dark:text-neutral-300">
            Session not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { session, planDay, plan, entries } = detail;
  const isFinished = session.finishedAt !== undefined;
  const headerTitle = planDay && plan ? `${plan.name} · ${planDay.name}` : "Freeform workout";

  const handleFinish = () => {
    Alert.alert(
      "Finish workout?",
      `Logged ${entries.length} ${entries.length === 1 ? "exercise" : "exercises"}. This is final — you can't resume after.`,
      [
        { text: "Keep going", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            await finishSession({ sessionId: sessionId as never });
            router.back();
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard workout?",
      "All sets logged in this session will be deleted. This can't be undone.",
      [
        { text: "Keep going", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            await cancelSession({ sessionId: sessionId as never });
            router.back();
          },
        },
      ],
    );
  };

  const handlePickExercise = async (exerciseId: string) => {
    await addEntry({
      sessionId: sessionId as never,
      exerciseId: exerciseId as never,
    });
    setPickerOpen(false);
  };

  const handleRemoveEntry = (entryId: string, exerciseName: string) => {
    Alert.alert(
      "Remove exercise?",
      `${exerciseName} and all its logged sets will be removed from this session.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeEntry({ sessionEntryId: entryId as never });
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
          onPress={handleCancel}
          hitSlop={8}
          className="p-1 active:opacity-60"
        >
          <Ionicons name="close" size={26} color="#ef4444" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className="text-base font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            {formatElapsed(elapsedMs)}
          </Text>
        </View>
        <Pressable
          onPress={handleFinish}
          hitSlop={8}
          disabled={isFinished}
          className="rounded-full bg-brand-500 px-4 py-2 active:bg-brand-600"
        >
          <Text className="text-sm font-semibold text-white">Finish</Text>
        </Pressable>
      </View>

      {restTimerKey !== null ? (
        <View className="px-4 pt-3">
          <RestTimer
            key={restTimerKey}
            initialSeconds={DEFAULT_REST_SECONDS}
            onDismiss={() => setRestTimerKey(null)}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10">
            <Text className="text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
              No exercises yet
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Add an exercise below to start logging sets.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {entries.map((entry) => (
              <SessionEntryCard
                key={entry._id}
                exerciseName={entry.exercise?.name ?? "Unknown exercise"}
                category={entry.exercise?.category ?? "strength"}
                muscleGroup={entry.exercise?.muscleGroup}
                sets={entry.sets.map((set) => ({
                  _id: set._id,
                  setNumber: set.setNumber,
                  reps: set.reps,
                  weight: set.weight,
                  completed: set.completed,
                }))}
                cardioLogs={entry.cardioLogs.map((log) => ({
                  _id: log._id,
                  durationSec: log.durationSec,
                  distanceM: log.distanceM,
                }))}
                onLogSet={async (reps, weight) => {
                  await logSet({
                    sessionEntryId: entry._id as never,
                    reps,
                    weight,
                    completed: true,
                  });
                  setRestTimerKey(Date.now());
                }}
                onRemoveSet={async (setId) => {
                  await removeSet({ setId: setId as never });
                }}
                onLogCardio={async (durationSec, distanceM) => {
                  await logCardio({
                    sessionEntryId: entry._id as never,
                    durationSec,
                    distanceM,
                  });
                }}
                onUpdateCardio={async (cardioLogId, durationSec, distanceM) => {
                  await updateCardio({
                    cardioLogId: cardioLogId as never,
                    durationSec,
                    distanceM,
                  });
                }}
                onRemoveCardio={async (cardioLogId) => {
                  await removeCardio({ cardioLogId: cardioLogId as never });
                }}
                onRemoveEntry={() =>
                  handleRemoveEntry(
                    entry._id,
                    entry.exercise?.name ?? "Exercise",
                  )
                }
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mt-4 flex-row items-center justify-center rounded-xl border border-dashed border-brand-500 bg-brand-50 dark:bg-brand-950/30 px-4 py-3 active:opacity-80"
        >
          <Ionicons name="add" size={20} color="#0284c7" />
          <Text className="ml-2 text-base font-semibold text-brand-700 dark:text-brand-300">
            Add exercise
          </Text>
        </Pressable>
      </ScrollView>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exerciseId) => handlePickExercise(exerciseId)}
      />
    </SafeAreaView>
  );
}
