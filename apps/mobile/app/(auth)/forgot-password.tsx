import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthScreen } from "@/components/auth/AuthScreen";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleRequestReset = async (values: ForgotPasswordForm) => {
    if (!isLoaded) return;
    setSubmissionError(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: values.email,
      });

      router.push({
        pathname: "/(auth)/reset-password",
        params: { email: values.email },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not send reset code. Please try again.";
      setSubmissionError(message);
    }
  };

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Enter your email and we&apos;ll send a code to reset your password."
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="Email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            errorMessage={errors.email?.message}
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
        label="Send reset code"
        loading={isSubmitting}
        onPress={handleSubmit(handleRequestReset)}
      />

      <View className="mt-8 items-center">
        <Link href="/(auth)/sign-in" asChild>
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            Back to sign in
          </Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
