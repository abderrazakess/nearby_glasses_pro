import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

interface CalibrationOverlayProps {
  /** 0-360: how many degrees of azimuth have been sampled */
  angularCoverage: number;
  /** 0-1: overall confidence (auto-dismiss when >= 0.5) */
  confidence: number;
  onDismiss: () => void;
}

/**
 * Calibration overlay shown on first Finder open.
 * Prompts user to "walk in a circle" to build the RSSI direction map.
 * Auto-dismisses when confidence reaches 0.5 (180° coverage + variance).
 * User can also manually dismiss.
 */
export function CalibrationOverlay({
  angularCoverage,
  confidence,
  onDismiss,
}: CalibrationOverlayProps) {
  // Auto-dismiss at confidence >= 0.5
  useEffect(() => {
    if (confidence >= 0.5) {
      onDismiss();
    }
  }, [confidence, onDismiss]);

  // Rotating phone animation
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [rotation]);

  const phoneStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Progress arc: 0-360° of angular coverage
  const progress = Math.min(angularCoverage / 360, 1);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Calibrating Direction</Text>
        <Text style={styles.subtitle}>
          Slowly turn in a full circle to help the app find the signal direction
        </Text>

        {/* Progress arc + animated phone icon */}
        <View style={styles.progressContainer}>
          <Svg width={128} height={128} viewBox="0 0 128 128">
            {/* Background track */}
            <Circle
              cx={64}
              cy={64}
              r={radius}
              stroke="#334155"
              strokeWidth={6}
              fill="none"
            />
            {/* Progress arc */}
            <Circle
              cx={64}
              cy={64}
              r={radius}
              stroke="#EF4444"
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
            />
          </Svg>

          {/* Rotating phone icon in the centre */}
          <Animated.View style={[styles.phoneIconWrapper, phoneStyle]}>
            <Svg width={40} height={40} viewBox="0 0 24 24">
              <Path
                d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"
                fill="#EF4444"
              />
            </Svg>
          </Animated.View>

          {/* Percentage text */}
          <Text style={styles.pctText}>{pct}%</Text>
        </View>

        {/* Confidence bar */}
        <View style={styles.confRow}>
          <Text style={styles.confLabel}>Confidence</Text>
          <View style={styles.confBarBg}>
            <View style={[styles.confBarFill, { width: `${Math.round(confidence * 100)}%` }]} />
          </View>
          <Text style={styles.confPct}>{Math.round(confidence * 100)}%</Text>
        </View>

        {/* Skip button */}
        <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
          <Text style={styles.skipText}>Skip Calibration</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#1E2A3A",
    borderRadius: 20,
    padding: 28,
    width: 300,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    color: "#ECEDEE",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9BA1A6",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  progressContainer: {
    width: 128,
    height: 128,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  phoneIconWrapper: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  pctText: {
    position: "absolute",
    bottom: 0,
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  confRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    gap: 8,
  },
  confLabel: {
    color: "#9BA1A6",
    fontSize: 12,
    width: 72,
  },
  confBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
  },
  confBarFill: {
    height: 6,
    backgroundColor: "#EF4444",
    borderRadius: 3,
  },
  confPct: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
  skipBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  skipText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
