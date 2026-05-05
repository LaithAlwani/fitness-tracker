import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";
import { formatWeight } from "@fitness/shared";

import { BodyweightSparkline } from "@/components/metrics/BodyweightSparkline";
import { ExercisePicker } from "@/components/progress/ExercisePicker";
import { PrCard } from "@/components/progress/PrCard";
import { WeightProgressChart } from "@/components/progress/WeightProgressChart";
import { useUnits } from "@/lib/useUnits";

const HORIZONTAL_PADDING = 24;

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function ProgressTab() {
  const units = useUnits();
  const exercises = useQuery(api.progress.listExercisesWithHistory);
  const metrics = useQuery(api.metrics.list);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select the first exercise once data loads.
  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedId === null) {
      setSelectedId(exercises[0]!._id as unknown as string);
    }
  }, [exercises, selectedId]);

  const history = useQuery(
    api.progress.exerciseHistory,
    selectedId ? { exerciseId: selectedId as never } : "skip",
  );
  const records = useQuery(
    api.progress.personalRecords,
    selectedId ? { exerciseId: selectedId as never } : "skip",
  );

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - HORIZONTAL_PADDING * 2;
  const sparklineWidth = chartWidth - 32;

  const isLoadingExercises = exercises === undefined;
  const hasExercises = exercises && exercises.length > 0;

  const sparklineData = (metrics ?? [])
    .filter(
      (
        metric,
      ): metric is (NonNullable<typeof metrics>)[number] & { bodyweight: number } =>
        metric.bodyweight !== undefined,
    )
    .map((metric) => ({
      recordedAt: metric.recordedAt,
      bodyweightKg: metric.bodyweight,
    }));

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Progress
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Per-exercise progress */}
        {!hasExercises ? (
          <View className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10">
            <View className="items-center">
              <Ionicons
                name="trending-up-outline"
                size={48}
                color="#9ca3af"
              />
              <Text className="mt-4 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
                {isLoadingExercises ? "Loading…" : "No exercise data yet"}
              </Text>
              {!isLoadingExercises ? (
                <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Finish a workout with logged sets to see progress here.
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <ExercisePicker
              exercises={exercises.map((e) => ({
                _id: e._id as unknown as string,
                name: e.name,
                category: e.category,
                muscleGroup: e.muscleGroup,
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <View className="mt-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Top weight per session
              </Text>
              <WeightProgressChart
                data={(history ?? []).map((point) => ({
                  finishedAt: point.finishedAt,
                  topWeight: point.topWeight,
                  topReps: point.topReps,
                }))}
                units={units}
                width={chartWidth - 32}
                height={220}
              />
            </View>

            {records ? (
              <View className="mt-3 gap-3">
                <View className="flex-row gap-3">
                  <PrCard
                    label="Top weight"
                    primary={
                      records.topByWeight
                        ? `${formatWeight(records.topByWeight.weight, units)} × ${records.topByWeight.reps}`
                        : "—"
                    }
                    secondary={
                      records.topByWeight
                        ? formatDate(records.topByWeight.finishedAt)
                        : undefined
                    }
                    iconName="trophy-outline"
                  />
                  <PrCard
                    label="Top 1RM est."
                    primary={
                      records.topBy1RM
                        ? formatWeight(records.topBy1RM.estimate1RM, units)
                        : "—"
                    }
                    secondary={
                      records.topBy1RM
                        ? `${formatWeight(records.topBy1RM.weight, units)} × ${records.topBy1RM.reps}`
                        : undefined
                    }
                    iconName="flash-outline"
                  />
                </View>
                <View className="flex-row gap-3">
                  <PrCard
                    label="Top set volume"
                    primary={
                      records.topByVolume
                        ? formatWeight(records.topByVolume.volume, units)
                        : "—"
                    }
                    secondary={
                      records.topByVolume
                        ? `${formatWeight(records.topByVolume.weight, units)} × ${records.topByVolume.reps}`
                        : undefined
                    }
                    iconName="barbell-outline"
                  />
                  <PrCard
                    label="Top session volume"
                    primary={
                      records.topSessionVolume
                        ? formatWeight(records.topSessionVolume.volume, units)
                        : "—"
                    }
                    secondary={
                      records.topSessionVolume
                        ? formatDate(records.topSessionVolume.finishedAt)
                        : undefined
                    }
                    iconName="bar-chart-outline"
                  />
                </View>
              </View>
            ) : null}
          </>
        )}

        {/* Bodyweight section */}
        {sparklineData.length >= 2 ? (
          <View className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Bodyweight trend
            </Text>
            <BodyweightSparkline
              data={sparklineData}
              units={units}
              width={sparklineWidth}
              height={70}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
