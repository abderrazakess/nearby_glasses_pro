import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  useBleScanner,
  useBleScannerSettings,
  type RawBleDevice,
} from "@/hooks/use-ble-scanner";
import * as Haptics from "expo-haptics";

function RawDeviceRow({ device }: { device: RawBleDevice }) {
  const colors = useColors();
  const isGlasses = device.isSmartGlasses;

  return (
    <View
      style={[
        styles.deviceRow,
        {
          backgroundColor: isGlasses ? `${colors.error}15` : colors.surface,
          borderColor: isGlasses ? colors.error : colors.border,
        },
      ]}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.deviceLeft}>
          {isGlasses && (
            <View style={[styles.glassesTag, { backgroundColor: colors.error }]}>
              <Text style={styles.glassesTagText}>GLASSES</Text>
            </View>
          )}
          <Text
            style={[styles.deviceName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {device.name ?? "(no name)"}
          </Text>
        </View>
        <Text
          style={[
            styles.rssi,
            {
              color:
                device.rssi >= -65
                  ? colors.success
                  : device.rssi >= -80
                  ? colors.warning
                  : colors.error,
            },
          ]}
        >
          {device.rssi} dBm
        </Text>
      </View>

      <View style={styles.deviceMeta}>
        <Text style={[styles.metaLabel, { color: colors.muted }]}>
          Company ID:{" "}
          <Text style={[styles.metaValue, { color: colors.primary }]}>
            {device.companyIdHex ?? "—"}
            {device.companyIdDecimal !== null
              ? ` (${device.companyIdDecimal})`
              : ""}
          </Text>
        </Text>
      </View>

      {device.manufacturerDataRaw && (
        <Text
          style={[styles.rawData, { color: colors.muted }]}
          numberOfLines={1}
        >
          Raw: {device.manufacturerDataRaw.substring(0, 32)}
          {device.manufacturerDataRaw.length > 32 ? "…" : ""}
        </Text>
      )}

      <Text style={[styles.deviceId, { color: `${colors.muted}80` }]} numberOfLines={1}>
        {device.id}
      </Text>
    </View>
  );
}

export default function DebugScreen() {
  const colors = useColors();
  const { settings } = useBleScannerSettings();
  const [isScanning, setIsScanning] = useState(false);

  const {
    isScanning: scanActive,
    rawDevices,
    error,
    startScanning,
    stopScanning,
  } = useBleScanner(settings, () => {});

  const handleToggle = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (scanActive) {
      stopScanning();
    } else {
      startScanning();
    }
    setIsScanning(!scanActive);
  };

  const glassesCount = rawDevices.filter((d) => d.isSmartGlasses).length;
  const totalCount = rawDevices.length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <IconSymbol name="ant.fill" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Debug — Raw BLE
          </Text>
        </View>
        <Text style={[styles.headerCount, { color: colors.muted }]}>
          {glassesCount > 0 ? (
            <Text style={{ color: colors.error, fontWeight: "700" }}>
              {glassesCount} glasses
            </Text>
          ) : null}
          {glassesCount > 0 && totalCount > glassesCount ? " · " : ""}
          {totalCount > 0 ? `${totalCount} total` : ""}
        </Text>
      </View>

      {/* Info Banner */}
      <View
        style={[
          styles.infoBanner,
          { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` },
        ]}
      >
        <IconSymbol name="info.circle.fill" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.muted }]}>
          Shows all raw BLE devices. Devices with a matching company ID are
          highlighted in red. Use this to verify your Ray-Ban is advertising.
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: `${colors.warning}15`, borderColor: colors.warning },
          ]}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.warning} />
          <Text style={[styles.errorText, { color: colors.warning }]}>{error}</Text>
        </View>
      )}

      {/* Scan Button */}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.scanButton,
            {
              backgroundColor: scanActive ? colors.error : colors.primary,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol
            name={scanActive ? "xmark.circle.fill" : "dot.radiowaves.left.and.right"}
            size={16}
            color="#fff"
          />
          <Text style={styles.scanButtonText}>
            {scanActive ? "Stop" : "Start Debug Scan"}
          </Text>
        </Pressable>
      </View>

      {/* Device List */}
      {rawDevices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {scanActive
              ? "Scanning… move near your Ray-Ban glasses."
              : "Tap Start to scan for all nearby BLE devices."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rawDevices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RawDeviceRow device={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
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
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 13,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  buttonRow: {
    alignItems: "center",
    paddingVertical: 14,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 8,
  },
  deviceRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  deviceLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  glassesTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  glassesTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  rssi: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  deviceMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  rawData: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  deviceId: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
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
});
