import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { warningFeedback } from "@/lib/haptics";
import {
  cancelRestTimerNotification,
  scheduleRestTimerNotification,
} from "@/lib/notifications";

type Props = {
  initialSeconds: number;
  onDismiss: () => void;
};

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RestTimer({ initialSeconds, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const firedHapticRef = useRef(false);
  const notificationIdRef = useRef<string | null>(null);

  // Schedule a lock-screen notification for the initial countdown. If the
  // user adjusts the timer (±15s), or dismisses it, we cancel + reschedule.
  useEffect(() => {
    let isMounted = true;
    scheduleRestTimerNotification(initialSeconds).then((id) => {
      if (isMounted) {
        notificationIdRef.current = id;
      } else {
        // Component unmounted before the schedule resolved — clean up.
        cancelRestTimerNotification(id);
      }
    });
    return () => {
      isMounted = false;
      cancelRestTimerNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (remaining === 0 && !firedHapticRef.current) {
      firedHapticRef.current = true;
      warningFeedback();
    }
  }, [remaining]);

  const reschedule = async (newSeconds: number) => {
    await cancelRestTimerNotification(notificationIdRef.current);
    if (newSeconds <= 0) {
      notificationIdRef.current = null;
      return;
    }
    notificationIdRef.current = await scheduleRestTimerNotification(newSeconds);
  };

  const handleAdjust = (deltaSeconds: number) => {
    const next = Math.max(0, remaining + deltaSeconds);
    setRemaining(next);
    if (next > 0) {
      firedHapticRef.current = false;
    }
    reschedule(next);
  };

  const handleDismiss = () => {
    cancelRestTimerNotification(notificationIdRef.current);
    notificationIdRef.current = null;
    onDismiss();
  };

  const isDone = remaining === 0;

  return (
    <View
      className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${
        isDone ? "bg-green-500" : "bg-brand-500"
      }`}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={isDone ? "checkmark-circle-outline" : "time-outline"}
          size={22}
          color="white"
        />
        <Text className="ml-2 text-base font-semibold text-white">
          {isDone ? "Rest complete" : "Rest"}
        </Text>
      </View>

      <Text className="text-2xl font-bold text-white tabular-nums">
        {formatSeconds(remaining)}
      </Text>

      <View className="flex-row items-center gap-2">
        {!isDone ? (
          <Pressable
            onPress={() => handleAdjust(-15)}
            hitSlop={6}
            className="rounded-full bg-white/20 px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-white">-15</Text>
          </Pressable>
        ) : null}
        {!isDone ? (
          <Pressable
            onPress={() => handleAdjust(15)}
            hitSlop={6}
            className="rounded-full bg-white/20 px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-white">+15</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleDismiss}
          hitSlop={6}
          className="ml-1 p-1 active:opacity-70"
        >
          <Ionicons name="close" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
