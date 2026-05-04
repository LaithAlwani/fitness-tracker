import * as Haptics from "expo-haptics";

export const lightTap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const mediumTap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const heavyTap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export const successFeedback = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const errorFeedback = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

export const warningFeedback = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};
