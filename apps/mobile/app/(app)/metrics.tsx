import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { BodyweightSparkline } from "@/components/metrics/BodyweightSparkline";
import { LogMetricsSheet } from "@/components/metrics/LogMetricsSheet";
import { MetricsRow } from "@/components/metrics/MetricsRow";

type ExistingMetric = {
  _id: string;
  bodyweight?: number;
  bodyFatPct?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    arm?: number;
  };
};

const SPARKLINE_HORIZONTAL_PADDING = 24;

export default function MetricsScreen() {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const metrics = useQuery(api.metrics.list);
  const removeMetric = useMutation(api.metrics.remove);

  // Single sheet, two modes: null existingMetric = new entry, otherwise edit.
  const [editingMetric, setEditingMetric] = useState<ExistingMetric | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openNewEntry = () => {
    setEditingMetric(null);
    setIsSheetOpen(true);
  };

  const openEditEntry = (metric: ExistingMetric) => {
    setEditingMetric(metric);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    // Defer clearing the existingMetric until after the close animation, so
    // the form doesn't visually reset to "new" while sliding out.
    setTimeout(() => setEditingMetric(null), 250);
  };

  const sparklineWidth =
    Dimensions.get("window").width - SPARKLINE_HORIZONTAL_PADDING * 2;

  const sparklineData = useMemo(() => {
    if (!metrics) return [];
    return metrics
      .filter(
        (
          metric,
        ): metric is (typeof metrics)[number] & { bodyweight: number } =>
          metric.bodyweight !== undefined,
      )
      .map((metric) => ({
        recordedAt: metric.recordedAt,
        bodyweightKg: metric.bodyweight,
      }));
  }, [metrics]);

  const isLoading = metrics === undefined || me === undefined;
  const units = me?.units ?? "kg";

  const handleRemove = (metricId: string, recordedAt: number) => {
    const dateLabel = new Date(recordedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    Alert.alert(
      "Delete entry?",
      `The entry from ${dateLabel} will be removed. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeMetric({ metricId: metricId as never });
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
          Body metrics
        </Text>
        <View className="w-9" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : metrics.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="scale-outline" size={48} color="#9ca3af" />
          <Text className="mt-4 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
            No metrics logged yet
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Tap + to log your bodyweight and optional measurements.
          </Text>
        </View>
      ) : (
        <FlatList
          data={metrics}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 96,
          }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListHeaderComponent={
            sparklineData.length >= 2 ? (
              <View className="mb-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Bodyweight trend
                </Text>
                <BodyweightSparkline
                  data={sparklineData}
                  units={units}
                  width={sparklineWidth - 32}
                  height={70}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MetricsRow
              recordedAt={item.recordedAt}
              bodyweight={item.bodyweight}
              bodyFatPct={item.bodyFatPct}
              measurements={item.measurements}
              units={units}
              onPress={() =>
                openEditEntry({
                  _id: item._id,
                  bodyweight: item.bodyweight,
                  bodyFatPct: item.bodyFatPct,
                  measurements: item.measurements,
                })
              }
              onRemove={() => handleRemove(item._id, item.recordedAt)}
            />
          )}
        />
      )}

      <Pressable
        onPress={openNewEntry}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg active:bg-brand-600"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      <LogMetricsSheet
        visible={isSheetOpen}
        onClose={closeSheet}
        units={units}
        existingMetric={editingMetric}
      />
    </SafeAreaView>
  );
}
