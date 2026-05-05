import { Text, View } from "react-native";

type Props = {
  ratio: number; // 0..1
  xpIntoLevel: number;
  xpForLevel: number;
  compact?: boolean;
};

export function XpBar({ ratio, xpIntoLevel, xpForLevel, compact }: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const widthPercent = `${Math.round(clamped * 100)}%`;

  return (
    <View>
      <View
        className={`overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ${compact ? "h-1.5" : "h-2.5"}`}
      >
        <View
          className="h-full rounded-full bg-brand-500"
          style={{ width: widthPercent as `${number}%` }}
        />
      </View>
      {!compact ? (
        <Text className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {xpIntoLevel} / {xpForLevel} XP to next level
        </Text>
      ) : null}
    </View>
  );
}
