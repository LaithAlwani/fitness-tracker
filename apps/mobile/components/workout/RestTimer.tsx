import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { warningFeedback } from "@/lib/haptics";

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

  const isDone = remaining === 0;

  return (
    <View
      className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${
        isDone
          ? "bg-green-500"
          : "bg-brand-500"
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
            onPress={() => setRemaining((value) => Math.max(0, value - 15))}
            hitSlop={6}
            className="rounded-full bg-white/20 px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-white">-15</Text>
          </Pressable>
        ) : null}
        {!isDone ? (
          <Pressable
            onPress={() => setRemaining((value) => value + 15)}
            hitSlop={6}
            className="rounded-full bg-white/20 px-2 py-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-white">+15</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onDismiss} hitSlop={6} className="ml-1 p-1 active:opacity-70">
          <Ionicons name="close" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
