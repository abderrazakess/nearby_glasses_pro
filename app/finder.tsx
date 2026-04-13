import React, { useCallback, useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSensorOrientation } from "@/hooks/use-sensor-orientation";
import { useRssiDirectionFinder } from "@/hooks/use-rssi-direction-finder";
import { proximityToColor, proximityToLabel } from "@/lib/kalman-filter";
import type { ProximityLevel } from "@/lib/kalman-filter";
import { useBleScannerContext } from "@/hooks/use-ble-scanner-context";

const { width: SCREEN_W } = Dimensions.get("window");
const RING_COUNT = 4;
const RADAR_SIZE = Math.min(SCREEN_W * 0.78, 300);

// ─── Proximity ring pulse speeds ─────────────────────────────────────────────
function pulseDuration(proximity: ProximityLevel): number {
  switch (proximity) {
    case "RIGHT_HERE": return 300;
    case "CLOSE":      return 600;
    case "NEAR":       return 1000;
    case "FAR":        return 1800;
    case "LOST":       return 3000;
  }
}

// ─── Haptic feedback style ───────────────────────────────────────────────────
function hapticStyle(proximity: ProximityLevel): Haptics.ImpactFeedbackStyle {
  switch (proximity) {
    case "RIGHT_HERE": return Haptics.ImpactFeedbackStyle.Heavy;
    case "CLOSE":      return Haptics.ImpactFeedbackStyle.Medium;
    default:           return Haptics.ImpactFeedbackStyle.Light;
  }
}

// ─── Proximity Ring ───────────────────────────────────────────────────────────
function ProximityRing({
  index,
  color,
  pulseDur,
}: {
  index: number;
  color: string;
  pulseDur: number;
}) {
  const scale = useSharedValue(0.4 + index * 0.18);
  const opacity = useSharedValue(0.6 - index * 0.12);
  const delay = index * (pulseDur / RING_COUNT);

  useEffect(() => {
    const dur = pulseDur + delay;
    scale.value = withRepeat(
      withSequence(
        withTiming(0.4 + index * 0.18, { duration: 0 }),
        withTiming(1.0 + index * 0.08, {
          duration: dur,
          easing: Easing.out(Easing.quad),
        }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6 - index * 0.1, { duration: 0 }),
        withTiming(0, { duration: dur, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [pulseDur, color]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const size = RADAR_SIZE * (0.4 + index * 0.2);
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        animStyle,
      ]}
    />
  );
}

// ─── Directional Arrow ────────────────────────────────────────────────────────
function DirectionalArrow({
  bearing,
  azimuth,
  hasDirection,
  color,
  signalLost,
}: {
  bearing: number;
  azimuth: number;
  hasDirection: boolean;
  color: string;
  signalLost: boolean;
}) {
  const relativeAngle = (bearing - azimuth + 360) % 360;
  const rotation = useSharedValue(relativeAngle);
  const arrowOpacity = useSharedValue(signalLost ? 0.3 : 1);
  const arrowScale = useSharedValue(hasDirection ? 1 : 0.7);

  useEffect(() => {
    let target = relativeAngle;
    const current = rotation.value % 360;
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rotation.value = withSpring(current + diff, {
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    });
  }, [relativeAngle]);

  useEffect(() => {
    arrowOpacity.value = withTiming(signalLost ? 0.3 : 1, { duration: 400 });
    arrowScale.value = withSpring(hasDirection ? 1 : 0.7, { damping: 12 });
  }, [signalLost, hasDirection]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: arrowScale.value },
    ],
    opacity: arrowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.arrowContainer, animStyle]}>
      <View style={[styles.arrowHead, { borderBottomColor: color }]} />
      <View style={[styles.arrowShaft, { backgroundColor: color }]} />
    </Animated.View>
  );
}

// ─── Signal Strength Bar ──────────────────────────────────────────────────────
function SignalBar({ rssi, color }: { rssi: number; color: string }) {
  const pct = Math.max(0, Math.min(1, (rssi + 100) / 60));
  const width = useSharedValue(pct);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 200 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.signalBarTrack}>
      <Animated.View style={[styles.signalBarFill, barStyle]} />
    </View>
  );
}

// ─── Main Finder Screen ───────────────────────────────────────────────────────
export default function FinderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    deviceId: string;
    deviceName: string;
    rssi: string;
  }>();

  const deviceId = params.deviceId ?? "";
  const deviceName = params.deviceName ?? "Unknown Device";
  const initialRssi = parseInt(params.rssi ?? "-80", 10);

  const { devices } = useBleScannerContext();
  const liveDevice = devices.find((d) => d.id === deviceId);
  const currentRssi = liveDevice?.rssi ?? initialRssi;

  const orientation = useSensorOrientation(true);
  const finder = useRssiDirectionFinder(
    deviceId,
    currentRssi,
    orientation.azimuth,
    true,
  );

  const accentColor = proximityToColor(finder.proximity);
  const pulseMs = pulseDuration(finder.proximity);

  // Background tint overlay
  const bgOpacity = useSharedValue(0.15);
  useEffect(() => {
    bgOpacity.value = withTiming(finder.signalLost ? 0.05 : 0.18, { duration: 600 });
  }, [finder.signalLost]);
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    backgroundColor: accentColor,
  }));

  // Haptic feedback
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHaptic = useCallback(() => {
    if (Platform.OS === "web") return;
    if (finder.signalLost || finder.proximity === "FAR") return;
    Haptics.impactAsync(hapticStyle(finder.proximity));
    hapticTimerRef.current = setTimeout(scheduleHaptic, pulseMs);
  }, [finder.proximity, finder.signalLost, pulseMs]);

  useEffect(() => {
    if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
    hapticTimerRef.current = setTimeout(scheduleHaptic, pulseMs);
    return () => {
      if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
    };
  }, [finder.proximity, pulseMs]);

  const distanceLabel =
    finder.distanceMetres < 1
      ? `${Math.round(finder.distanceMetres * 100)} cm`
      : `${finder.distanceMetres.toFixed(1)} m`;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
      ]}
    >
      {/* Tinted background overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {deviceName}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.statusText, { color: accentColor }]}>
              {finder.signalLost ? "Signal Lost" : "Tracking"}
            </Text>
          </View>
        </View>
        {/* Spacer to balance the back button */}
        <View style={styles.backBtn} />
      </View>

      {/* ── Center: Radar + Labels ── */}
      <View style={styles.centerSection}>
        {/* Radar area */}
        <View style={styles.radarArea}>
          {Array.from({ length: RING_COUNT }).map((_, i) => (
            <ProximityRing
              key={i}
              index={i}
              color={accentColor}
              pulseDur={pulseMs}
            />
          ))}
          <DirectionalArrow
            bearing={finder.targetBearing}
            azimuth={orientation.azimuth}
            hasDirection={finder.hasDirection}
            color={accentColor}
            signalLost={finder.signalLost}
          />
          <View style={[styles.centerDot, { backgroundColor: accentColor }]} />
        </View>

        {/* Proximity label */}
        <Text style={[styles.proximityLabel, { color: accentColor }]}>
          {proximityToLabel(finder.proximity)}
        </Text>

        {/* Distance estimate */}
        <Text style={styles.distanceText}>
          {finder.signalLost ? "—" : distanceLabel}
        </Text>
      </View>

      {/* ── Bottom: Signal bar + hints ── */}
      <View style={styles.bottomSection}>
        {/* Signal strength bar */}
        <View style={styles.signalSection}>
          <View style={styles.signalRow}>
            <Text style={styles.signalLabel}>Signal</Text>
            <Text style={styles.signalValue}>{finder.smoothedRssi} dBm</Text>
          </View>
          <SignalBar rssi={finder.smoothedRssi} color={accentColor} />
        </View>

        {/* Calibration hint */}
        {!finder.hasDirection && !finder.signalLost && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Slowly rotate your phone to map the signal direction…
            </Text>
          </View>
        )}

        {/* Direction confidence */}
        {finder.hasDirection && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Arrow points toward strongest signal •{" "}
              {Math.round(finder.confidence * 100)}% confidence
            </Text>
          </View>
        )}

        {/* Sensor unavailable warning */}
        {!orientation.available && Platform.OS !== "web" && (
          <View style={styles.sensorWarning}>
            <Text style={styles.sensorWarningText}>
              Motion sensors unavailable — direction finding disabled
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // ── Header ──
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 64,
    paddingVertical: 6,
  },
  backBtnText: {
    color: "#60A5FA",
    fontSize: 18,
    fontWeight: "500",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  deviceName: {
    color: "#ECEDEE",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // ── Center section ──
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  radarArea: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    top: "50%",
    left: "50%",
    borderWidth: 1.5,
  },
  arrowContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderBottomWidth: 48,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#EF4444",
  },
  arrowShaft: {
    width: 14,
    height: 52,
    backgroundColor: "#EF4444",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -2,
  },
  centerDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 20,
  },
  proximityLabel: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  distanceText: {
    color: "#9BA1A6",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  // ── Bottom section ──
  bottomSection: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 8,
  },
  signalSection: {
    width: "100%",
  },
  signalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  signalLabel: {
    color: "#9BA1A6",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  signalValue: {
    color: "#ECEDEE",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  signalBarTrack: {
    height: 6,
    backgroundColor: "#1E2022",
    borderRadius: 3,
    overflow: "hidden",
  },
  signalBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  hintBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    width: "100%",
  },
  hintText: {
    color: "#9BA1A6",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  sensorWarning: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    width: "100%",
  },
  sensorWarningText: {
    color: "#F87171",
    fontSize: 12,
    textAlign: "center",
  },
});
