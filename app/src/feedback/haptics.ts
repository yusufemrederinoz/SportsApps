import * as Haptics from 'expo-haptics';

function ignoreFailure(feedback: Promise<void>): void {
  feedback.catch(() => undefined);
}

export const haptics = {
  select: () => ignoreFailure(Haptics.selectionAsync()),
  tick: () => ignoreFailure(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => ignoreFailure(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => ignoreFailure(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => ignoreFailure(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  celebrate: () => ignoreFailure(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
