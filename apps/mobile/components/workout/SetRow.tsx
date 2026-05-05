import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  onRemove: () => void;
};

const rowStyles =
  "flex-row items-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2.5";

export function SetRow({ setNumber, reps, weight, completed, onRemove }: Props) {
  return (
    <View className={rowStyles}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
        <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
          {setNumber}
        </Text>
      </View>
      <Text className="ml-3 flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
        {weight} kg × {reps} reps
      </Text>
      {completed ? (
        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
      ) : (
        <Ionicons name="ellipse-outline" size={20} color="#9ca3af" />
      )}
      <Pressable onPress={onRemove} hitSlop={6} className="ml-2 p-1 active:opacity-60">
        <Ionicons name="close" size={18} color="#9ca3af" />
      </Pressable>
    </View>
  );
}
