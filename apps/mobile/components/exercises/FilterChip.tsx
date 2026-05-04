import { Pressable, Text } from "react-native";

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const baseStyles =
  "h-9 flex-row items-center justify-center rounded-full border px-3.5 mr-2 active:opacity-80";
const selectedStyles = "border-brand-500 bg-brand-500";
const idleStyles =
  "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900";
const labelBaseStyles = "text-sm font-medium";
const labelSelectedStyles = "text-white";
const labelIdleStyles = "text-neutral-700 dark:text-neutral-300";

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const containerStyles = `${baseStyles} ${selected ? selectedStyles : idleStyles}`;
  const labelStyles = `${labelBaseStyles} ${selected ? labelSelectedStyles : labelIdleStyles}`;

  return (
    <Pressable className={containerStyles} onPress={onPress}>
      <Text className={labelStyles}>{label}</Text>
    </Pressable>
  );
}
