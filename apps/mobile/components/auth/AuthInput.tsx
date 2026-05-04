import { forwardRef } from "react";
import {
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type AuthInputProps = TextInputProps & {
  label: string;
  errorMessage?: string;
};

const baseInputStyles =
  "rounded-xl border bg-white dark:bg-neutral-900 px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-50";
const idleBorderStyles = "border-neutral-300 dark:border-neutral-700";
const errorBorderStyles = "border-red-500 dark:border-red-400";

export const AuthInput = forwardRef<TextInput, AuthInputProps>(
  function AuthInput({ label, errorMessage, ...textInputProps }, ref) {
    const hasError = Boolean(errorMessage);

    return (
      <View className="mb-4">
        <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={`${baseInputStyles} ${hasError ? errorBorderStyles : idleBorderStyles}`}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          {...textInputProps}
        />
        {hasError ? (
          <Text className="mt-1.5 text-sm text-red-500 dark:text-red-400">
            {errorMessage}
          </Text>
        ) : null}
      </View>
    );
  },
);
