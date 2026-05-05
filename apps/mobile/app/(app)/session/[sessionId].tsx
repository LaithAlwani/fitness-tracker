import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { formatMuscleGroup, formatWeight } from "@fitness/shared";

import { useUnits } from "@/lib/useUnits";

const formatDateTime = (ms: number): string => {
  const date = new Date(ms);
  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins === 0 ? `${hours}h` : `${hours}h ${remainingMins}m`;
};

const formatCardio = (durationSec: number, distanceM?: number): string => {
  const minutes = Math.round(durationSec / 60);
  const parts: string[] = [`${minutes} min`];
  if (distanceM !== undefined) {
    const km = (distanceM / 1000).toFixed(1).replace(/\.0$/, "");
    parts.push(`${km} km`);
  }
  return parts.join(" · ");
};

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId: rawSessionId } = useLocalSearchParams<{
    sessionId: string;
  }>();
  const sessionId = rawSessionId as string;

  const detail = useQuery(api.sessions.getSession, {
    sessionId: sessionId as never,
  });
  const cancelSession = useMutation(api.sessions.cancelSession);
  const units = useUnits();

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
  const headerTitle =
    planDay && plan ? `${plan.name} · ${planDay.name}` : "Freeform workout";
  const durationSec = isFinished
    ? Math.round((session.finishedAt! - session.startedAt) / 1000)
    : 0;

  const totalSets = entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const completedSets = entries.reduce(
    (sum, entry) => sum + entry.sets.filter((set) => set.completed).length,
    0,
  );
  const totalVolumeKg = entries.reduce((sum, entry) => {
    return (
      sum +
      entry.sets
        .filter((set) => set.completed)
        .reduce((s, set) => s + set.weight * set.reps, 0)
    );
  }, 0);
  const totalCardioLogs = entries.reduce(
    (sum, entry) => sum + entry.cardioLogs.length,
    0,
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete workout?",
      "This workout and all its sets will be removed permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await cancelSession({ sessionId: sessionId as never });
            router.back();
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
          Session
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
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            {headerTitle}
          </Text>
          <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {formatDateTime(session.startedAt)}
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-x-6 gap-y-3">
            <View>
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Duration
              </Text>
              <Text className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {isFinished ? formatDuration(durationSec) : "In progress"}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Exercises
              </Text>
              <Text className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {entries.length}
              </Text>
            </View>
            {totalSets > 0 ? (
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Sets
                </Text>
                <Text className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {completedSets}/{totalSets}
                </Text>
              </View>
            ) : null}
            {totalVolumeKg > 0 ? (
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Volume
                </Text>
                <Text className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {formatWeight(totalVolumeKg, units)}
                </Text>
              </View>
            ) : null}
            {totalCardioLogs > 0 ? (
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Cardio
                </Text>
                <Text className="mt-0.5 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {totalCardioLogs}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {entries.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10">
            <Text className="text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
              No exercises in this session
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {entries.map((entry) => (
              <View
                key={entry._id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
              >
                <Text
                  className="text-base font-bold text-neutral-900 dark:text-neutral-50"
                  numberOfLines={1}
                >
                  {entry.exercise?.name ?? "Unknown exercise"}
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {entry.exercise?.category === "cardio" ? "Cardio" : "Strength"}
                  {entry.exercise?.muscleGroup
                    ? ` · ${formatMuscleGroup(entry.exercise.muscleGroup)}`
                    : ""}
                </Text>

                {entry.sets.length > 0 ? (
                  <View className="mt-3 gap-1.5">
                    {entry.sets.map((set) => (
                      <View
                        key={set._id}
                        className="flex-row items-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2.5"
                      >
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                            {set.setNumber}
                          </Text>
                        </View>
                        <Text className="ml-3 flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {formatWeight(set.weight, units)} × {set.reps} reps
                        </Text>
                        {set.completed ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#22c55e"
                          />
                        ) : (
                          <Ionicons
                            name="ellipse-outline"
                            size={18}
                            color="#9ca3af"
                          />
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}

                {entry.cardioLogs.length > 0 ? (
                  <View className="mt-3 gap-1.5">
                    {entry.cardioLogs.map((cardio) => (
                      <View
                        key={cardio._id}
                        className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2.5"
                      >
                        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {formatCardio(cardio.durationSec, cardio.distanceM)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {entry.sets.length === 0 && entry.cardioLogs.length === 0 ? (
                  <Text className="mt-3 text-sm italic text-neutral-500 dark:text-neutral-400">
                    No data logged for this exercise
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {session.notes ? (
          <View className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Notes
            </Text>
            <Text className="mt-1 text-sm text-neutral-900 dark:text-neutral-50">
              {session.notes}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
