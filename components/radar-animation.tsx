import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface RadarAnimationProps {
  isActive: boolean;
  hasDetection?: boolean;
  size?: number;
}

export function RadarAnimation({
  isActive,
  hasDetection = false,
  size = 200,
}: RadarAnimationProps) {
  const colors = useColors();
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const centerPulse = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const activeColor = hasDetection ? colors.error : colors.primary;
  const idleColor = colors.muted;
  const dotColor = isActive ? activeColor : idleColor;

  useEffect(() => {
    if (!isActive) {
      animRef.current?.stop();
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
      centerPulse.setValue(1);
      return;
    }

    const createRingAnimation = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const centerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(centerPulse, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(centerPulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    animRef.current = Animated.parallel([
      createRingAnimation(ring1, 0),
      createRingAnimation(ring2, 800),
      createRingAnimation(ring3, 1600),
      centerAnim,
    ]);

    animRef.current.start();

    return () => {
      animRef.current?.stop();
    };
  }, [isActive, ring1, ring2, ring3, centerPulse]);

  const renderRing = (anim: Animated.Value, index: number) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.5, 0],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: activeColor,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Rings */}
      {[ring1, ring2, ring3].map((anim, i) => renderRing(anim, i))}

      {/* Static background circle */}
      <View
        style={[
          styles.bgCircle,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: (size * 0.85) / 2,
            borderColor: isActive ? activeColor : idleColor,
            opacity: 0.15,
          },
        ]}
      />
      <View
        style={[
          styles.bgCircle,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: (size * 0.55) / 2,
            borderColor: isActive ? activeColor : idleColor,
            opacity: 0.2,
          },
        ]}
      />

      {/* Center dot */}
      <Animated.View
        style={[
          styles.centerDot,
          {
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: dotColor,
            transform: [{ scale: centerPulse }],
            shadowColor: dotColor,
            shadowOpacity: isActive ? 0.8 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: isActive ? 6 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  bgCircle: {
    position: "absolute",
    borderWidth: 1,
  },
  centerDot: {
    position: "absolute",
  },
});
