import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_REMINDER_ID = "daily-workout-reminder";
const REST_TIMER_ID_PREFIX = "rest-timer-";

// All foreground notifications behave the same: show banner, play sound,
// show in notification center, and (on iOS 14+) display a list-style.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android needs an explicit channel before notifications can fire.
let channelEnsured = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || channelEnsured) return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Workout reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0ea5e9",
  });
  channelEnsured = true;
}

export async function ensurePermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  const alreadyGranted =
    settings.status === "granted" ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  if (alreadyGranted) {
    await ensureAndroidChannel();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  if (
    requested.status === "granted" ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
  ) {
    await ensureAndroidChannel();
    return true;
  }
  return false;
}

// Rest timer alerts — fire when the configured rest period ends.
export async function scheduleRestTimerNotification(
  durationSec: number,
): Promise<string | null> {
  const ok = await ensurePermissions();
  if (!ok) return null;

  const id = `${REST_TIMER_ID_PREFIX}${Date.now()}`;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "Rest complete",
      body: "Time for the next set.",
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(durationSec)),
    },
  });
  return id;
}

export async function cancelRestTimerNotification(id: string | null) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or cancelled
  }
}

// Daily workout reminder — repeats every day at the user's configured time.
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
): Promise<void> {
  const ok = await ensurePermissions();
  if (!ok) return;

  // Cancel any existing daily reminder so we don't stack duplicates if the
  // user changes the time.
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Time to lift 💪",
      body: "Quick check-in: did you train today?",
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // wasn't scheduled
  }
}
