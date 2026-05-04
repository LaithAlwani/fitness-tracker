import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { api } from "@fitness/convex";

import { useAuthTransition } from "@/lib/authTransition";

export default function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const ensureUserRow = useMutation(api.users.getOrCreateCurrentUser);
  const { endTransition } = useAuthTransition();

  useEffect(() => {
    if (isSignedIn) {
      // Hide the global "Signing you in..." overlay now that we're on the
      // protected side. Triggered for OAuth and any other transition path.
      endTransition();
      ensureUserRow().catch((error) => {
        console.error("Failed to sync Clerk user to Convex:", error);
      });
    }
  }, [isSignedIn, ensureUserRow, endTransition]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
