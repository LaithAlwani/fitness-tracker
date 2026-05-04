import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5";
const labelStyles =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";
const valueStyles =
  "mt-1 text-base text-neutral-900 dark:text-neutral-50";

export default function ProfileTab() {
  const { signOut } = useAuth();
  const currentUser = useQuery(api.users.me);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-6 pt-6">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          Profile
        </Text>
      </View>

      <View className="mt-6 gap-3 px-6">
        <View className={cardStyles}>
          <Text className={labelStyles}>Name</Text>
          <Text className={valueStyles}>
            {currentUser
              ? `${currentUser.firstName} ${currentUser.lastName}`.trim() ||
                "—"
              : "Loading..."}
          </Text>
        </View>

        <View className={cardStyles}>
          <Text className={labelStyles}>Email</Text>
          <Text className={valueStyles}>{currentUser?.email ?? "—"}</Text>
        </View>

        <View className={cardStyles}>
          <Text className={labelStyles}>Units</Text>
          <Text className={valueStyles}>
            {currentUser?.units === "lb" ? "Pounds (lb)" : "Kilograms (kg)"}
          </Text>
        </View>
      </View>

      <View className="mt-8 px-6">
        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          className="rounded-xl border border-red-300 bg-red-50 p-4 active:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:active:bg-red-950/60"
        >
          <Text className="text-center text-base font-semibold text-red-600 dark:text-red-400">
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
