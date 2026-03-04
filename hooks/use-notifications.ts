import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import type { DetectedDevice } from "./use-ble-scanner";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications(enabled: boolean) {
  const permissionGranted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    Notifications.requestPermissionsAsync().then(({ status }) => {
      permissionGranted.current = status === "granted";
    });
  }, []);

  const sendDetectionNotification = useCallback(
    async (device: DetectedDevice) => {
      if (!enabled) return;

      // Haptic feedback
      if (Platform.OS !== "web") {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }

      // Push notification
      if (Platform.OS !== "web" && permissionGranted.current) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Smart Glasses Nearby",
              body: `${device.company.shortName} device detected — ${device.distance}`,
              data: { deviceId: device.id, companyId: device.companyId },
              sound: false,
            },
            trigger: null, // immediate
          });
        } catch (e) {
          console.warn("Notification error:", e);
        }
      }
    },
    [enabled]
  );

  return { sendDetectionNotification };
}
