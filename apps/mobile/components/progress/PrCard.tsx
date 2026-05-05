import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = {
  label: string;
  primary: string;
  secondary?: string;
  iconName: keyof typeof Ionicons.glyphMap;
};

const cardStyles =
  "flex-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4";

export function PrCard({ label, primary, secondary, iconName }: Props) {
  return (
    <View className={cardStyles}>
      <View className="flex-row items-center">
        <Ionicons name={iconName} size={16} color="#0ea5e9" />
        <Text className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </Text>
      </View>
      <Text className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-50">
        {primary}
      </Text>
      {secondary ? (
        <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {secondary}
        </Text>
      ) : null}
    </View>
  );
}
