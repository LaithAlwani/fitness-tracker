import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow px-6 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-8 mt-4">
              <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
                {title}
              </Text>
              {subtitle ? (
                <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View className="flex-1">{children}</View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
