import { useCallback, useEffect, useRef, useState } from "react";
import { KalmanFilter, rssiToDistance, rssiToProximity, type ProximityLevel } from "@/lib/kalman-filter";

const SAMPLE_WINDOW = 36; // number of azimuth buckets (every 10°)
const BUCKET_SIZE = 360 / SAMPLE_WINDOW; // 10° per bucket
const MIN_SAMPLES_FOR_DIRECTION = 6; // need at least 6 different orientations sampled
const SIGNAL_LOSS_TIMEOUT_MS = 3000; // consider signal lost after 3s no update

export interface DirectionFinderState {
  /** Smoothed RSSI value in dBm */
  smoothedRssi: number;
  /** Raw RSSI value in dBm */
  rawRssi: number;
  /** Estimated distance in metres */
  distanceMetres: number;
  /** Proximity label */
  proximity: ProximityLevel;
  /** Bearing in degrees (0-360) that the arrow should point toward */
  targetBearing: number;
  /** Whether we have enough data to show a direction */
  hasDirection: boolean;
  /** Whether the signal has been lost */
  signalLost: boolean;
  /** Confidence 0-1 of the direction estimate */
  confidence: number;
}

const DEFAULT_STATE: DirectionFinderState = {
  smoothedRssi: -100,
  rawRssi: -100,
  distanceMetres: 10,
  proximity: "FAR",
  targetBearing: 0,
  hasDirection: false,
  signalLost: false,
  confidence: 0,
};

/**
 * Direction finder hook.
 *
 * Algorithm:
 * 1. As the user rotates the phone, we sample RSSI at each azimuth bucket (10° increments).
 * 2. We keep a rolling window of the best RSSI seen in each bucket.
 * 3. The target bearing is the bucket with the highest average RSSI.
 * 4. Confidence is based on how many buckets have been sampled and the signal spread.
 *
 * @param deviceId - The BLE device ID to track
 * @param currentRssi - Latest raw RSSI reading from BLE scanner
 * @param currentAzimuth - Current phone azimuth from sensor hook
 * @param active - Whether tracking is active
 */
export function useRssiDirectionFinder(
  deviceId: string,
  currentRssi: number,
  currentAzimuth: number,
  active: boolean,
): DirectionFinderState {
  const [state, setState] = useState<DirectionFinderState>(DEFAULT_STATE);

  // Kalman filter for RSSI smoothing
  const kalmanRef = useRef<KalmanFilter>(new KalmanFilter(currentRssi, 1.0, 4.0));

  // RSSI samples per azimuth bucket: bucket index → { sum, count, best }
  const bucketsRef = useRef<Map<number, { sum: number; count: number; best: number }>>(new Map());

  // Last time we received an RSSI update
  const lastUpdateRef = useRef<number>(Date.now());

  // Current smoothed RSSI
  const smoothedRssiRef = useRef<number>(currentRssi);

  // Reset when device changes
  useEffect(() => {
    kalmanRef.current = new KalmanFilter(currentRssi, 1.0, 4.0);
    bucketsRef.current = new Map();
    setState(DEFAULT_STATE);
  }, [deviceId]);

  // Process new RSSI + azimuth reading
  const processReading = useCallback(
    (rssi: number, azimuth: number) => {
      if (!active || rssi === 0) return;

      lastUpdateRef.current = Date.now();

      // Smooth RSSI with Kalman filter
      const smoothed = kalmanRef.current.update(rssi);
      smoothedRssiRef.current = smoothed;

      // Map azimuth to bucket index
      const bucketIdx = Math.floor(((azimuth % 360) + 360) % 360 / BUCKET_SIZE);

      const existing = bucketsRef.current.get(bucketIdx);
      if (existing) {
        existing.sum += smoothed;
        existing.count += 1;
        existing.best = Math.max(existing.best, smoothed);
      } else {
        bucketsRef.current.set(bucketIdx, { sum: smoothed, count: 1, best: smoothed });
      }

      // Find best bearing
      const buckets = bucketsRef.current;
      const sampledCount = buckets.size;
      const hasDirection = sampledCount >= MIN_SAMPLES_FOR_DIRECTION;

      let bestBucket = 0;
      let bestRssi = -Infinity;

      for (const [idx, data] of buckets.entries()) {
        const avg = data.sum / data.count;
        if (avg > bestRssi) {
          bestRssi = avg;
          bestBucket = idx;
        }
      }

      const targetBearing = bestBucket * BUCKET_SIZE + BUCKET_SIZE / 2;

      // Confidence: based on spread between best and worst bucket
      let worstRssi = Infinity;
      for (const data of buckets.values()) {
        const avg = data.sum / data.count;
        if (avg < worstRssi) worstRssi = avg;
      }
      const spread = bestRssi - worstRssi;
      // Confidence increases with spread (more directional signal) and sample count
      const spreadConfidence = Math.min(spread / 20, 1); // 20dB spread = full confidence
      const sampleConfidence = Math.min(sampledCount / SAMPLE_WINDOW, 1);
      const confidence = hasDirection
        ? Math.min(spreadConfidence * 0.7 + sampleConfidence * 0.3, 1)
        : 0;

      const proximity = rssiToProximity(smoothed);
      const distanceMetres = rssiToDistance(smoothed);

      setState({
        smoothedRssi: Math.round(smoothed),
        rawRssi: rssi,
        distanceMetres: Math.max(0.1, distanceMetres),
        proximity,
        targetBearing,
        hasDirection,
        signalLost: false,
        confidence,
      });
    },
    [active],
  );

  // Feed new readings
  useEffect(() => {
    if (!active) return;
    processReading(currentRssi, currentAzimuth);
  }, [currentRssi, currentAzimuth, active, processReading]);

  // Signal loss watchdog
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > SIGNAL_LOSS_TIMEOUT_MS) {
        setState((prev) => ({ ...prev, signalLost: true, proximity: "LOST" }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return state;
}
