import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSignIn = async (values: SignInForm) => {
    if (!isLoaded) return;
    setSubmissionError(null);

    try {
      const attempt = await signIn.create({
        identifier: values.email,
        password: values.password,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      setSubmissionError("Sign in incomplete. Please try again.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not sign in. Check your email and password.";
      setSubmissionError(message);
    }
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to keep your streak going.">
      <GoogleSignInButton onError={setSubmissionError} />

      <AuthDivider />

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

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="Password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Your password"
            secureTextEntry
            autoComplete="current-password"
            errorMessage={errors.password?.message}
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
        label="Sign in"
        loading={isSubmitting}
        onPress={handleSubmit(handleSignIn)}
      />

      <View className="mt-4 items-center">
        <Link href="/(auth)/forgot-password" asChild>
          <Text className="text-sm font-medium text-brand-600 dark:text-brand-400">
            Forgot password?
          </Text>
        </Link>
      </View>

      <View className="mt-8 flex-row justify-center">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          Don&apos;t have an account?{" "}
        </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            Sign up
          </Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
