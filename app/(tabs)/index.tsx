import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { RadarAnimation } from "@/components/radar-animation";
import { DeviceCard } from "@/components/device-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  useBleScanner,
  useBleScannerSettings,
  useDetectionLog,
  type DetectedDevice,
  type LogEntry,
} from "@/hooks/use-ble-scanner";
import { useNotifications } from "@/hooks/use-notifications";
import { BleScannerProvider } from "@/hooks/use-ble-scanner-context";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";

export default function ScannerScreen() {
  const colors = useColors();
  const { settings } = useBleScannerSettings();
  const { addLogEntry } = useDetectionLog();
  const { sendDetectionNotification } = useNotifications(settings.notificationsEnabled);

  const [alertDevice, setAlertDevice] = useState<DetectedDevice | null>(null);
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show alert banner
  const showAlert = useCallback(
    (device: DetectedDevice) => {
      setAlertDevice(device);
      if (alertTimer.current) clearTimeout(alertTimer.current);

      Animated.sequence([
        Animated.timing(alertOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      alertTimer.current = setTimeout(() => {
        Animated.timing(alertOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setAlertDevice(null));
      }, 5000);
    },
    [alertOpacity]
  );

  const handleNewDetection = useCallback(
    (device: DetectedDevice) => {
      // Send notification
      sendDetectionNotification(device);

      // Show in-app alert
      showAlert(device);

      // Log the event
      const entry: LogEntry = {
        id: `${Date.now()}-${device.id}`,
        timestamp: Date.now(),
        companyId: device.companyId,
        companyName: device.company.name,
        shortName: device.company.shortName,
        peakRssi: device.rssi,
        distance: device.distance,
      };
      addLogEntry(entry);
    },
    [sendDetectionNotification, showAlert, addLogEntry]
  );

  const { isScanning, devices, rawDevices, error, startScanning, stopScanning } =
    useBleScanner(settings, handleNewDetection);

  // Keep screen awake while scanning
  useKeepAwake();

  const handleToggleScan = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  const hasDetection = devices.length > 0;

  return (
    <BleScannerProvider devices={devices} isScanning={isScanning}>
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <IconSymbol
            name="eye.fill"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            GlassesNearby Pro
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isScanning
                ? hasDetection
                  ? `${colors.error}20`
                  : `${colors.primary}20`
                : `${colors.muted}15`,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isScanning
                  ? hasDetection
                    ? colors.error
                    : colors.success
                  : colors.muted,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isScanning
                  ? hasDetection
                    ? colors.error
                    : colors.success
                  : colors.muted,
              },
            ]}
          >
            {isScanning
              ? hasDetection
                ? "DETECTED"
                : "SCANNING"
              : "IDLE"}
          </Text>
        </View>
      </View>

      {/* Alert Banner */}
      {alertDevice && (
        <Animated.View
          style={[
            styles.alertBanner,
            {
              backgroundColor: colors.error,
              opacity: alertOpacity,
            },
          ]}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#fff" />
          <Text style={styles.alertText}>
            Smart glasses detected — {alertDevice.company.shortName} ·{" "}
            {alertDevice.distance}
          </Text>
        </Animated.View>
      )}

      {/* Error Banner */}
      {error && (
        <View
          style={[styles.errorBanner, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.warning} />
          <Text style={[styles.errorText, { color: colors.warning }]}>{error}</Text>
        </View>
      )}

      {/* Radar */}
      <View style={styles.radarContainer}>
        <RadarAnimation
          isActive={isScanning}
          hasDetection={hasDetection}
          size={200}
        />
        <Text style={[styles.radarLabel, { color: colors.muted }]}>
          {isScanning
            ? hasDetection
              ? `${devices.length} device${devices.length !== 1 ? "s" : ""} detected`
              : "Scanning for smart glasses..."
            : "Tap to start scanning"}
        </Text>
      </View>

      {/* Scan Toggle Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleToggleScan}
          style={({ pressed }) => [
            styles.scanButton,
            {
              backgroundColor: isScanning ? colors.error : colors.primary,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol
            name={isScanning ? "xmark.circle.fill" : "dot.radiowaves.left.and.right"}
            size={20}
            color="#fff"
          />
          <Text style={styles.scanButtonText}>
            {isScanning ? "Stop Scanning" : "Start Scanning"}
          </Text>
        </Pressable>
      </View>

      {/* Devices List */}
      {devices.length > 0 ? (
        <View style={styles.devicesSection}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            NEARBY DEVICES
          </Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DeviceCard device={item} />}
            contentContainerStyle={styles.devicesList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : isScanning ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No smart glasses detected yet.{"\n"}Keep scanning in crowded areas.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            Detects smart glasses from Meta, Snap, and Luxottica via Bluetooth LE.
            False positives are possible (e.g. VR headsets).
          </Text>
        </View>
      )}
    </ScreenContainer>
    </BleScannerProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  alertText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  radarContainer: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 20,
    gap: 16,
  },
  radarLabel: {
    fontSize: 14,
    textAlign: "center",
  },
  buttonContainer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  devicesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  devicesList: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
