import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { api } from "@fitness/convex";

const cardStyles =
  "flex-row items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4 active:bg-neutral-50 dark:active:bg-neutral-800";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function StartWorkoutSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const planDays = useQuery(api.plans.listAvailablePlanDays);
  const startSession = useMutation(api.sessions.startSession);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async (planDayId?: string) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const sessionId = await startSession({
        planDayId: planDayId as never,
      });
      onClose();
      router.push({
        pathname: "/(app)/workout/[sessionId]",
        params: { sessionId: sessionId as unknown as string },
      });
    } finally {
      setIsStarting(false);
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
        <View
          className="rounded-t-3xl bg-white dark:bg-neutral-950"
          style={{ maxHeight: "85%" }}
        >
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </View>

          <View className="px-6 pt-3 pb-2">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Start a workout
            </Text>
            <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Pick a plan day or start freeform.
            </Text>
          </View>

          <ScrollView
            className="px-6"
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              className={cardStyles}
              onPress={() => handleStart(undefined)}
              disabled={isStarting}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                <Ionicons name="flash-outline" size={20} color="#0ea5e9" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Freeform workout
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  No plan — add exercises as you go
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            {planDays === undefined ? (
              <View className="mt-6 items-center">
                <ActivityIndicator color="#0ea5e9" />
              </View>
            ) : planDays.length === 0 ? (
              <View className="mt-6 items-center px-4">
                <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Build a plan in the &quot;My plans&quot; section to log
                  workouts against pre-set days.
                </Text>
              </View>
            ) : (
              <>
                <Text className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  From your plans
                </Text>
                <View className="gap-2">
                  {planDays.map((day) => (
                    <Pressable
                      key={day.dayId}
                      className={cardStyles}
                      onPress={() => handleStart(day.dayId)}
                      disabled={isStarting}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <Ionicons
                          name="barbell-outline"
                          size={20}
                          color="#0ea5e9"
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                          {day.dayName}
                        </Text>
                        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                          {day.planName} ·{" "}
                          {day.exerciseCount === 1
                            ? "1 exercise"
                            : `${day.exerciseCount} exercises`}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
