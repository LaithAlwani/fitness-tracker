import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  startedAt: number;
  durationSec: number;
  planName?: string;
  dayName?: string;
  exerciseCount: number;
  totalSets: number;
  totalCardioLogs: number;
  onPress: () => void;
};

const cardStyles =
  "flex-row items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-4 active:bg-neutral-50 dark:active:bg-neutral-800";

const formatDate = (ms: number): string => {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins === 0 ? `${hours}h` : `${hours}h ${remainingMins}m`;
};

const formatTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export function SessionRow({
  startedAt,
  durationSec,
  planName,
  dayName,
  exerciseCount,
  totalSets,
  totalCardioLogs,
  onPress,
}: Props) {
  const title = dayName && planName ? `${planName} · ${dayName}` : "Freeform workout";

  const statParts: string[] = [];
  if (exerciseCount > 0) {
    statParts.push(
      `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`,
    );
  }
  if (totalSets > 0) {
    statParts.push(`${totalSets} ${totalSets === 1 ? "set" : "sets"}`);
  }
  if (totalCardioLogs > 0) {
    statParts.push(
      `${totalCardioLogs} cardio ${totalCardioLogs === 1 ? "log" : "logs"}`,
    );
  }
  const stats = statParts.length > 0 ? statParts.join(" · ") : "Empty session";

  return (
    <Pressable className={cardStyles} onPress={onPress}>
      <View className="flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-base font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="ml-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {formatDate(startedAt)}
          </Text>
        </View>
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {stats} · {formatDuration(durationSec)} · {formatTime(startedAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </Pressable>
  );
}
