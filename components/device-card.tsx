import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { DetectedDevice } from "@/hooks/use-ble-scanner";

interface DeviceCardProps {
  device: DetectedDevice;
}

function SignalBar({ strength, color }: { strength: number; color: string }) {
  const bars = 5;
  const filledBars = Math.round(strength * bars);

  return (
    <View style={styles.signalContainer}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 4 + i * 3,
              backgroundColor: i < filledBars ? color : "rgba(128,128,128,0.25)",
            },
          ]}
        />
      ))}
    </View>
  );
}

export function DeviceCard({ device }: DeviceCardProps) {
  const colors = useColors();
  const isStrong = device.rssi >= -65;
  const signalColor = isStrong ? colors.error : colors.warning;

  const timeSinceSeen = Math.round((Date.now() - device.lastSeen) / 1000);
  const timeLabel =
    timeSinceSeen < 5 ? "Just now" : `${timeSinceSeen}s ago`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isStrong ? `${colors.error}40` : colors.border,
          borderWidth: isStrong ? 1 : 0.5,
        },
      ]}
    >
      {/* Left: Company info */}
      <View style={styles.left}>
        <View
          style={[
            styles.companyBadge,
            { backgroundColor: `${signalColor}18` },
          ]}
        >
          <Text style={[styles.companyInitial, { color: signalColor }]}>
            {device.company.shortName.charAt(0)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.companyName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {device.company.shortName}
          </Text>
          <Text style={[styles.productName, { color: colors.muted }]} numberOfLines={1}>
            {device.company.products[0]}
          </Text>
          <Text style={[styles.timeLabel, { color: colors.muted }]}>
            {timeLabel}
          </Text>
        </View>
      </View>

      {/* Right: RSSI + Signal */}
      <View style={styles.right}>
        <Text style={[styles.rssiValue, { color: signalColor, fontVariant: ["tabular-nums"] }]}>
          {device.rssi} dBm
        </Text>
        <SignalBar strength={device.strength} color={signalColor} />
        <Text style={[styles.distanceLabel, { color: colors.muted }]} numberOfLines={2}>
          {device.distance}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  companyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
  },
  productName: {
    fontSize: 12,
  },
  timeLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 90,
  },
  rssiValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  distanceLabel: {
    fontSize: 10,
    textAlign: "right",
    maxWidth: 90,
  },
});
