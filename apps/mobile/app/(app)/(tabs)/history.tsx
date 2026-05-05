import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { SessionRow } from "@/components/history/SessionRow";

export default function HistoryTab() {
  const router = useRouter();
  const sessions = useQuery(api.sessions.listFinishedSessions);
  const [refreshing, setRefreshing] = useState(false);

  // Convex queries are reactive (data is always fresh), so pull-to-refresh
  // is mostly a UX cue. Resolve quickly so the spinner doesn't linger.
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const isLoading = sessions === undefined;

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <View className="px-6 pt-6 pb-4">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          History
        </Text>
        {!isLoading && sessions.length > 0 ? (
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {sessions.length} {sessions.length === 1 ? "workout" : "workouts"} logged
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="time-outline" size={48} color="#9ca3af" />
          <Text className="mt-4 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
            No workouts yet
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Finished sessions will show up here.
          </Text>
          <Pressable
            onPress={() => router.push("/(app)/(tabs)/workout")}
            className="mt-6 rounded-xl bg-brand-500 active:bg-brand-600 px-6 py-3"
          >
            <Text className="text-sm font-semibold text-white">
              Start a workout
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
          }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <SessionRow
              startedAt={item.startedAt}
              durationSec={item.durationSec}
              planName={item.planName}
              dayName={item.dayName}
              exerciseCount={item.exerciseCount}
              totalSets={item.totalSets}
              totalCardioLogs={item.totalCardioLogs}
              onPress={() =>
                router.push({
                  pathname: "/(app)/session/[sessionId]",
                  params: { sessionId: item._id as unknown as string },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
