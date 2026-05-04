import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthScreen } from "@/components/auth/AuthScreen";

const RESEND_COOLDOWN_SECONDS = 30;
const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleVerify = async () => {
    if (!isLoaded) return;
    if (code.length !== CODE_LENGTH) {
      setSubmissionError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }

    setSubmissionError(null);
    setIsVerifying(true);

    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      setSubmissionError("Verification incomplete. Please try again.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid code. Please try again.";
      setSubmissionError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || resendCountdown > 0) return;
    setIsResending(true);
    setSubmissionError(null);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not resend code. Please try again.";
      setSubmissionError(message);
    } finally {
      setIsResending(false);
    }
  };

  const renderCodeBoxes = () => {
    const boxes = [];
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      const character = code[index] ?? "";
      const isFocused = code.length === index;
      boxes.push(
        <View
          key={index}
          className={`h-14 w-12 items-center justify-center rounded-xl border bg-white dark:bg-neutral-900 ${
            isFocused
              ? "border-brand-500"
              : "border-neutral-300 dark:border-neutral-700"
          }`}
        >
          <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {character}
          </Text>
        </View>,
      );
    }
    return boxes;
  };

  return (
    <AuthScreen
      title="Check your email"
      subtitle={`Enter the ${CODE_LENGTH}-digit code we sent to verify your address.`}
    >
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View className="mb-6 flex-row justify-between">{renderCodeBoxes()}</View>
      </Pressable>

      <TextInput
        ref={inputRef}
        autoFocus
        value={code}
        onChangeText={(value) =>
          setCode(value.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH))
        }
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        className="absolute h-px w-px opacity-0"
      />

      {submissionError ? (
        <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
          <Text className="text-sm text-red-600 dark:text-red-400">
            {submissionError}
          </Text>
        </View>
      ) : null}

      <AuthButton
        label="Verify email"
        loading={isVerifying}
        disabled={code.length !== CODE_LENGTH}
        onPress={handleVerify}
      />

      <View className="mt-6 items-center">
        <Pressable
          onPress={handleResend}
          disabled={resendCountdown > 0 || isResending}
        >
          <Text
            className={`text-sm font-medium ${
              resendCountdown > 0 || isResending
                ? "text-neutral-400 dark:text-neutral-600"
                : "text-brand-600 dark:text-brand-400"
            }`}
          >
            {resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : isResending
                ? "Sending..."
                : "Resend code"}
          </Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
