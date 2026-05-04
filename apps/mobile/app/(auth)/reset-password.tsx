import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthScreen } from "@/components/auth/AuthScreen";

const resetPasswordSchema = z
  .object({
    code: z.string().length(6, "Enter the 6-digit code from your email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Password must include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });

  const handleReset = async (values: ResetPasswordForm) => {
    if (!isLoaded) return;
    setSubmissionError(null);

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: values.code,
        password: values.password,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      setSubmissionError("Reset incomplete. Please try again.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not reset password. Check the code and try again.";
      setSubmissionError(message);
    }
  };

  return (
    <AuthScreen
      title="Set a new password"
      subtitle="Enter the code from your email and choose a new password."
    >
      <Controller
        control={control}
        name="code"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="Verification code"
            value={value}
            onChangeText={(text) =>
              onChange(text.replace(/[^0-9]/g, "").slice(0, 6))
            }
            onBlur={onBlur}
            placeholder="6-digit code"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            errorMessage={errors.code?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="New password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="At least 8 characters with a number"
            secureTextEntry
            autoComplete="new-password"
            errorMessage={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="Confirm new password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Re-enter new password"
            secureTextEntry
            autoComplete="new-password"
            errorMessage={errors.confirmPassword?.message}
          />
        )}
      />

      {submissionError ? (
        <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
          <Text className="text-sm text-red-600 dark:text-red-400">
            {submissionError}
          </Text>
        </View>
      ) : null}

      <AuthButton
        label="Reset password"
        loading={isSubmitting}
        onPress={handleSubmit(handleReset)}
      />
    </AuthScreen>
  );
}
