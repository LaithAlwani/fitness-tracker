import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
