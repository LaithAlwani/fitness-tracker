import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../global.css";
import "react-native-reanimated";

import { FullScreenLoader } from "@/components/auth/FullScreenLoader";
import { AuthTransitionProvider, useAuthTransition } from "@/lib/authTransition";
import { convex } from "@/lib/convex";
import { tokenCache } from "@/lib/tokenCache";

// Required so the in-app browser can return to the app after an OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to apps/mobile/.env.local — copy it from clerk.com → API Keys.",
  );
}

function RootContent() {
  const { isTransitioning, message } = useAuthTransition();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>

      <FullScreenLoader visible={isTransitioning} message={message} />

      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthTransitionProvider>
          <RootContent />
        </AuthTransitionProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
