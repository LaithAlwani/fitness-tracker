import { useSignUp } from "@clerk/clerk-expo";
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

const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
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

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSignUp = async (values: SignUpForm) => {
    if (!isLoaded) return;
    setSubmissionError(null);

    try {
      await signUp.create({
        firstName: values.firstName,
        lastName: values.lastName,
        emailAddress: values.email,
        password: values.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      router.push("/(auth)/verify-email");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not create account. Please try again.";
      setSubmissionError(message);
    }
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Track lifts, hit PRs, level up."
    >
      <GoogleSignInButton onError={setSubmissionError} />

      <AuthDivider />

      <Controller
        control={control}
        name="firstName"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="First name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Alex"
            autoCapitalize="words"
            autoComplete="given-name"
            errorMessage={errors.firstName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="lastName"
        render={({ field: { value, onChange, onBlur } }) => (
          <AuthInput
            label="Last name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Smith"
            autoCapitalize="words"
            autoComplete="family-name"
            errorMessage={errors.lastName?.message}
          />
        )}
      />

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
            label="Confirm password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Re-enter password"
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
        label="Create account"
        loading={isSubmitting}
        onPress={handleSubmit(handleSignUp)}
      />

      <View className="mt-8 flex-row justify-center">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          Already have an account?{" "}
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            Sign in
          </Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
