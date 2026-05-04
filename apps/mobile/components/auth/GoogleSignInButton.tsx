import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuthTransition } from "@/lib/authTransition";
import { useWarmUpBrowser } from "@/lib/useWarmUpBrowser";

const buttonStyles =
  "flex-row items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-4 min-h-[52px] active:bg-neutral-50 dark:active:bg-neutral-800";
const labelStyles =
  "ml-3 text-base font-semibold text-neutral-900 dark:text-neutral-50";

type Props = {
  onError?: (message: string) => void;
};

export function GoogleSignInButton({ onError }: Props) {
  useWarmUpBrowser();
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { beginTransition, endTransition } = useAuthTransition();

  const [isStartingFlow, setIsStartingFlow] = useState(false);

  const handlePress = async () => {
    if (isStartingFlow) return;
    setIsStartingFlow(true);

    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/(app)/(tabs)", {
          scheme: "fitnesstracker",
        }),
      });

      if (createdSessionId && setActive) {
        // Show the global overlay BEFORE setActive so the loader is up
        // for the entire window between session activation and navigation.
        // It's rendered at the root layout, so it survives the (auth) → (app)
        // unmount/mount transition. (app)/_layout will call endTransition on mount.
        beginTransition("Signing you in with Google...");
        await setActive({ session: createdSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      // Flow returned without a session (user cancelled, MFA needed, etc.).
      setIsStartingFlow(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not sign in with Google. Please try again.";
      onError?.(message);
      endTransition();
      setIsStartingFlow(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isStartingFlow}
      className={`${buttonStyles} ${isStartingFlow ? "opacity-50" : ""}`}
    >
      {isStartingFlow ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <View className="flex-row items-center">
          <Ionicons name="logo-google" size={20} color="#ea4335" />
          <Text className={labelStyles}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}
