import { Text, View } from "react-native";

const lineStyles = "flex-1 h-px bg-neutral-300 dark:bg-neutral-700";
const labelStyles = "mx-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <View className="my-5 flex-row items-center">
      <View className={lineStyles} />
      <Text className={labelStyles}>{label}</Text>
      <View className={lineStyles} />
    </View>
  );
}
