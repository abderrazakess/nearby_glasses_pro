import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  DeviceMotion,
  DeviceMotionMeasurement,
  Magnetometer,
  MagnetometerMeasurement,
} from "expo-sensors";

export interface SensorOrientation {
  /** Azimuth/heading in degrees (0-360, 0=North/reference) */
  azimuth: number;
  /** Pitch in degrees */
  pitch: number;
  /** Roll in degrees */
  roll: number;
  /** Whether sensors are available and active */
  available: boolean;
  /** Whether magnetometer is available (affects heading accuracy) */
  hasMagnetometer: boolean;
}

const DEFAULT_ORIENTATION: SensorOrientation = {
  azimuth: 0,
  pitch: 0,
  roll: 0,
  available: false,
  hasMagnetometer: false,
};

/**
 * Hook that reads device orientation from DeviceMotion (gyro + accel) and
 * Magnetometer (compass heading). On web, returns a simulated orientation.
 *
 * The azimuth is the compass bearing the phone is pointing toward.
 * We use this to correlate RSSI readings with phone direction.
 */
export function useSensorOrientation(active = true): SensorOrientation {
  const [orientation, setOrientation] =
    useState<SensorOrientation>(DEFAULT_ORIENTATION);
  const motionSubRef = useRef<ReturnType<typeof DeviceMotion.addListener> | null>(null);
  const magSubRef = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);
  const latestMagRef = useRef<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setOrientation(DEFAULT_ORIENTATION);
      return;
    }

    // Web simulation — rotate azimuth slowly for demo
    if (Platform.OS === "web") {
      let angle = 0;
      const interval = setInterval(() => {
        angle = (angle + 2) % 360;
        setOrientation({
          azimuth: angle,
          pitch: 0,
          roll: 0,
          available: true,
          hasMagnetometer: false,
        });
      }, 100);
      return () => clearInterval(interval);
    }

    let hasMag = false;

    // Try magnetometer first
    Magnetometer.isAvailableAsync().then((available) => {
      if (available) {
        hasMag = true;
        Magnetometer.setUpdateInterval(100);
        magSubRef.current = Magnetometer.addListener(
          (data: MagnetometerMeasurement) => {
            latestMagRef.current = data;
          },
        );
      }
    });

    // DeviceMotion provides rotation (alpha=azimuth, beta=pitch, gamma=roll)
    DeviceMotion.isAvailableAsync().then((available) => {
      if (!available) {
        setOrientation((prev) => ({ ...prev, available: false }));
        return;
      }

      DeviceMotion.setUpdateInterval(100);
      motionSubRef.current = DeviceMotion.addListener(
        (data: DeviceMotionMeasurement) => {
          const rotation = data.rotation;
          if (!rotation) return;

          // rotation.alpha = azimuth (0-2π), beta = pitch, gamma = roll
          let azimuth = ((rotation.alpha * 180) / Math.PI + 360) % 360;

          // If magnetometer is available, blend compass heading for better accuracy
          if (hasMag && latestMagRef.current) {
            const { x, y } = latestMagRef.current;
            // Simple 2D compass heading from magnetometer x/y
            let magHeading = (Math.atan2(y, x) * 180) / Math.PI;
            if (magHeading < 0) magHeading += 360;
            // Blend: 70% magnetometer, 30% gyro-based azimuth
            azimuth = (magHeading * 0.7 + azimuth * 0.3 + 360) % 360;
          }

          setOrientation({
            azimuth,
            pitch: (rotation.beta * 180) / Math.PI,
            roll: (rotation.gamma * 180) / Math.PI,
            available: true,
            hasMagnetometer: hasMag,
          });
        },
      );
    });

    return () => {
      motionSubRef.current?.remove();
      magSubRef.current?.remove();
    };
  }, [active]);

  return orientation;
}
