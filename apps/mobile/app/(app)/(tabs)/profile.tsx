import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@fitness/convex";

import {
  cancelDailyReminder,
  ensurePermissions,
  scheduleDailyReminder,
} from "@/lib/notifications";

const cardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5";
const navCardStyles =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 active:bg-neutral-50 dark:active:bg-neutral-800";
const labelStyles =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";
const valueStyles = "mt-1 text-base text-neutral-900 dark:text-neutral-50";

const segmentSheet = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 8,
  },
  activeLight: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeDark: { backgroundColor: "#171717" },
  label: { fontSize: 14, fontWeight: "600" },
  labelActiveLight: { color: "#0a0a0a" },
  labelActiveDark: { color: "#fafafa" },
  labelInactiveLight: { color: "#737373" },
  labelInactiveDark: { color: "#a3a3a3" },
});

const DEFAULT_REMINDER_HOUR = 18; // 6 PM
const DEFAULT_REMINDER_MINUTE = 0;

const formatTime = (hour: number, minute: number): string => {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

export default function ProfileTab() {
  const router = useRouter();
  const { signOut } = useAuth();
  const currentUser = useQuery(api.users.me);
  const setUnits = useMutation(api.users.setUnits);
  const setDailyReminder = useMutation(api.users.setDailyReminder);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const isDark = useColorScheme() === "dark";

  const units = currentUser?.units ?? "kg";
  const reminderEnabled = currentUser?.dailyReminderEnabled ?? false;
  const reminderHour = currentUser?.dailyReminderHour ?? DEFAULT_REMINDER_HOUR;
  const reminderMinute =
    currentUser?.dailyReminderMinute ?? DEFAULT_REMINDER_MINUTE;

  // Keep the OS-level scheduled notification in sync with the user's prefs.
  // Reschedules every time prefs change so adjusting the time always lands.
  useEffect(() => {
    if (currentUser === undefined || currentUser === null) return;
    if (reminderEnabled) {
      scheduleDailyReminder(reminderHour, reminderMinute).catch((error) => {
        console.error("Failed to schedule daily reminder:", error);
      });
    } else {
      cancelDailyReminder().catch(() => {});
    }
  }, [currentUser, reminderEnabled, reminderHour, reminderMinute]);

  const buildSegmentStyles = (selected: boolean) => {
    if (!selected) return segmentSheet.base;
    return [
      segmentSheet.base,
      isDark ? segmentSheet.activeDark : segmentSheet.activeLight,
    ];
  };

  const buildLabelStyles = (selected: boolean) => {
    const color = selected
      ? isDark
        ? segmentSheet.labelActiveDark
        : segmentSheet.labelActiveLight
      : isDark
        ? segmentSheet.labelInactiveDark
        : segmentSheet.labelInactiveLight;
    return [segmentSheet.label, color];
  };

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

  const handleSetUnits = async (next: "kg" | "lb") => {
    if (next === units) return;
    await setUnits({ units: next });
  };

  const handleToggleReminder = async (next: boolean) => {
    if (next) {
      const granted = await ensurePermissions();
      if (!granted) {
        // User denied — leave toggle off.
        return;
      }
    }
    await setDailyReminder({
      enabled: next,
      hour: reminderHour,
      minute: reminderMinute,
    });
  };

  const handleTimeChange = async (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed") return;
    if (!selectedDate) return;

    const newHour = selectedDate.getHours();
    const newMinute = selectedDate.getMinutes();
    if (newHour === reminderHour && newMinute === reminderMinute) return;

    await setDailyReminder({
      enabled: true,
      hour: newHour,
      minute: newMinute,
    });
  };

  const reminderTimeAsDate = (() => {
    const date = new Date();
    date.setHours(reminderHour, reminderMinute, 0, 0);
    return date;
  })();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
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
            <Text className={labelStyles}>Weight units</Text>
            <View className="mt-3 flex-row rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
              <Pressable
                onPress={() => handleSetUnits("kg")}
                style={buildSegmentStyles(units === "kg")}
              >
                <Text style={buildLabelStyles(units === "kg")}>
                  Kilograms (kg)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSetUnits("lb")}
                style={buildSegmentStyles(units === "lb")}
              >
                <Text style={buildLabelStyles(units === "lb")}>
                  Pounds (lb)
                </Text>
              </Pressable>
            </View>
          </View>

          <View className={cardStyles}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className={labelStyles}>Daily reminder</Text>
                <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Nudges you to train at the time you choose.
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: "#d4d4d4", true: "#0ea5e9" }}
                thumbColor="#ffffff"
              />
            </View>
            {reminderEnabled ? (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="mt-4 flex-row items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 px-4 py-3 active:opacity-80"
              >
                <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                  Reminder time
                </Text>
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {formatTime(reminderHour, reminderMinute)}
                </Text>
              </Pressable>
            ) : null}
            {showTimePicker ? (
              <DateTimePicker
                value={reminderTimeAsDate}
                mode="time"
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            ) : null}
            {showTimePicker && Platform.OS === "ios" ? (
              <Pressable
                onPress={() => setShowTimePicker(false)}
                className="mt-2 rounded-xl bg-brand-500 active:bg-brand-600 px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Done
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            className={navCardStyles}
            onPress={() => router.push("/(app)/metrics")}
          >
            <View className="flex-row items-center">
              <Ionicons name="scale-outline" size={24} color="#0ea5e9" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Body metrics
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  Track bodyweight and measurements over time
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </Pressable>

          <Pressable
            className={navCardStyles}
            onPress={() => router.push("/(app)/achievements")}
          >
            <View className="flex-row items-center">
              <Ionicons name="trophy-outline" size={24} color="#0ea5e9" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Achievements
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  Badges you've unlocked from your progress
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </Pressable>
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
      </ScrollView>
    </SafeAreaView>
  );
}
