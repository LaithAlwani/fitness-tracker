import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
} from "react-native";

type AuthButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

const baseStyles =
  "rounded-xl px-4 py-4 items-center justify-center min-h-[52px]";
const primaryStyles = "bg-brand-500 active:bg-brand-600";
const primaryTextStyles = "text-white text-base font-semibold";
const secondaryStyles =
  "bg-transparent border border-neutral-300 dark:border-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-800";
const secondaryTextStyles =
  "text-neutral-900 dark:text-neutral-50 text-base font-semibold";
const disabledStyles = "opacity-50";

export function AuthButton({
  label,
  loading,
  disabled,
  variant = "primary",
  ...pressableProps
}: AuthButtonProps) {
  const isInteractive = !loading && !disabled;
  const variantStyles = variant === "primary" ? primaryStyles : secondaryStyles;
  const variantTextStyles =
    variant === "primary" ? primaryTextStyles : secondaryTextStyles;
  const containerStyles = `${baseStyles} ${variantStyles} ${isInteractive ? "" : disabledStyles}`;

  return (
    <Pressable
      className={containerStyles}
      disabled={!isInteractive}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "white" : "#0ea5e9"}
        />
      ) : (
        <Text className={variantTextStyles}>{label}</Text>
      )}
    </Pressable>
  );
}
