import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import { StartWorkoutSheet } from "@/components/workout/StartWorkoutSheet";

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 active:bg-neutral-50 dark:active:bg-neutral-800";
const primaryStartStyles =
  "rounded-2xl bg-brand-500 active:bg-brand-600 p-5";

export default function WorkoutTab() {
  const router = useRouter();
  const activeSession = useQuery(api.sessions.getActiveSession);
  const [isStartSheetOpen, setIsStartSheetOpen] = useState(false);

  const isActive = activeSession !== null && activeSession !== undefined;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-6 pt-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Workout
        </Text>
      </View>

      <View className="mt-6 gap-3 px-6">
        {isActive ? (
          <Pressable
            className={primaryStartStyles}
            onPress={() =>
              router.push({
                pathname: "/(app)/workout/[sessionId]",
                params: {
                  sessionId: activeSession!._id as unknown as string,
                },
              })
            }
          >
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Ionicons name="play" size={20} color="white" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-white">
                  Continue workout
                </Text>
                <Text className="mt-0.5 text-sm text-white/80">
                  Session in progress
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            className={primaryStartStyles}
            onPress={() => setIsStartSheetOpen(true)}
          >
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Ionicons name="play" size={20} color="white" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-white">
                  Start a workout
                </Text>
                <Text className="mt-0.5 text-sm text-white/80">
                  Pick a plan day or freeform
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
          </Pressable>
        )}

        <Pressable
          className={cardStyles}
          onPress={() => router.push("/(app)/plans")}
        >
          <View className="flex-row items-center">
            <Ionicons name="clipboard-outline" size={24} color="#0ea5e9" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                My plans
              </Text>
              <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                Build custom workout splits with target sets and reps
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </Pressable>

        <Pressable
          className={cardStyles}
          onPress={() => router.push("/(app)/exercises")}
        >
          <View className="flex-row items-center">
            <Ionicons name="barbell-outline" size={24} color="#0ea5e9" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Browse exercises
              </Text>
              <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                Seeded library + your custom additions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </Pressable>
      </View>

      <StartWorkoutSheet
        visible={isStartSheetOpen}
        onClose={() => setIsStartSheetOpen(false)}
      />
    </SafeAreaView>
  );
}
