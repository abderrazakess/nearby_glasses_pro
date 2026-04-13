import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExponentialMovingAverage,
  KalmanFilter,
  rssiToDistance,
  rssiToProximity,
  type ProximityLevel,
} from "@/lib/kalman-filter";

// ─── Constants ────────────────────────────────────────────────────────────────
const NUM_BINS = 36;                   // 36 × 10° = full circle
const BIN_SIZE = 360 / NUM_BINS;       // 10° per bin
const MIN_BINS_FOR_DIRECTION = 6;      // need ≥6 different orientations sampled
const SIGNAL_LOSS_TIMEOUT_MS = 3000;   // signal lost after 3s no update
const SAMPLE_HALF_LIFE_MS = 5000;      // exponential decay half-life = 5s
const DECAY_LAMBDA = Math.LN2 / SAMPLE_HALF_LIFE_MS; // λ for decay

// ─── Types ────────────────────────────────────────────────────────────────────
interface BinData {
  weightedSum: number;   // sum of (rssi × weight)
  totalWeight: number;   // sum of weights
  lastTimestamp: number; // for decay calculation
}

export interface DirectionFinderState {
  /** Smoothed RSSI (Kalman + EMA) in dBm */
  smoothedRssi: number;
  /** Raw RSSI in dBm */
  rawRssi: number;
  /** Estimated distance in metres */
  distanceMetres: number;
  /** Proximity zone */
  proximity: ProximityLevel;
  /** Absolute compass bearing toward target (0-360°) */
  targetBearing: number;
  /** Whether we have enough data to show a direction */
  hasDirection: boolean;
  /** Whether the signal has been lost */
  signalLost: boolean;
  /** Confidence 0-1 of the direction estimate */
  confidence: number;
  /** Angular coverage in degrees (0-360) — for calibration progress */
  angularCoverage: number;
  /** Dynamic guidance text */
  guidanceText: string;
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
  angularCoverage: 0,
  guidanceText: "Turn around slowly to find the signal direction",
};

// ─── Gaussian kernel for bin smoothing ───────────────────────────────────────
function gaussianSmooth(bins: Float64Array, sigma = 1.5): Float64Array {
  const n = bins.length;
  const result = new Float64Array(n);
  const kernelRadius = Math.ceil(sigma * 3);
  for (let i = 0; i < n; i++) {
    let weightSum = 0;
    let valueSum = 0;
    for (let k = -kernelRadius; k <= kernelRadius; k++) {
      const j = ((i + k) % n + n) % n; // wrap around
      const w = Math.exp(-(k * k) / (2 * sigma * sigma));
      valueSum += bins[j] * w;
      weightSum += w;
    }
    result[i] = weightSum > 0 ? valueSum / weightSum : 0;
  }
  return result;
}

// ─── Parabolic interpolation for sub-bin peak refinement ─────────────────────
function parabolicPeak(bins: Float64Array, peakIdx: number): number {
  const n = bins.length;
  const prev = bins[((peakIdx - 1) % n + n) % n];
  const curr = bins[peakIdx];
  const next = bins[(peakIdx + 1) % n];
  const denom = prev - 2 * curr + next;
  if (Math.abs(denom) < 1e-6) return peakIdx;
  const offset = 0.5 * (prev - next) / denom;
  return peakIdx + offset;
}

// ─── Guidance text generator ─────────────────────────────────────────────────
function buildGuidanceText(
  confidence: number,
  angularCoverage: number,
  proximity: ProximityLevel,
  signalLost: boolean,
): string {
  if (signalLost) return "Signal lost. Walk toward the last known direction";
  if (proximity === "RIGHT_HERE") return "You're almost there!";
  if (confidence < 0.3) {
    const pct = Math.round((angularCoverage / 360) * 100);
    return pct < 20
      ? "Turn around slowly to find the signal direction"
      : `Keep turning… ${pct}% mapped`;
  }
  if (confidence < 0.6) return "Follow the arrow";
  return "Follow the arrow";
}

// ─── Main hook ────────────────────────────────────────────────────────────────
/**
 * RSSI Direction Finder hook.
 *
 * Algorithm (per spec):
 * 1. Raw RSSI → Kalman filter (Q=0.008, R=0.5) → EMA (α=0.3) = smoothed RSSI
 * 2. Map current azimuth to a 10° bin
 * 3. Store weighted sample in bin (weight = recency via exponential decay)
 * 4. Apply Gaussian smoothing across bins (σ=1.5 bins)
 * 5. Find peak bin via parabolic interpolation
 * 6. Compute confidence from: angular coverage + RSSI variance + sample count
 * 7. Emit updated state
 */
export function useRssiDirectionFinder(
  deviceId: string,
  currentRssi: number,
  currentAzimuth: number,
  active: boolean,
): DirectionFinderState {
  const [state, setState] = useState<DirectionFinderState>(DEFAULT_STATE);

  // Signal processing pipeline
  const kalmanRef = useRef<KalmanFilter>(new KalmanFilter(currentRssi, 0.008, 0.5));
  const emaRef = useRef<ExponentialMovingAverage>(new ExponentialMovingAverage(currentRssi, 0.3));

  // Directional sample bins
  const binsRef = useRef<Map<number, BinData>>(new Map());

  // Visited azimuth set for angular coverage tracking
  const visitedBinsRef = useRef<Set<number>>(new Set());

  // Signal loss tracking
  const lastUpdateRef = useRef<number>(Date.now());
  const wasSignalLostRef = useRef<boolean>(false);

  // Reset when device changes
  useEffect(() => {
    kalmanRef.current = new KalmanFilter(currentRssi, 0.008, 0.5);
    emaRef.current = new ExponentialMovingAverage(currentRssi, 0.3);
    binsRef.current = new Map();
    visitedBinsRef.current = new Set();
    setState(DEFAULT_STATE);
  }, [deviceId]);

  // Process new RSSI + azimuth reading
  const processReading = useCallback(
    (rssi: number, azimuth: number) => {
      if (!active || rssi === 0) return;

      const now = Date.now();
      lastUpdateRef.current = now;

      // ── Step 1: Smooth RSSI ──────────────────────────────────────────────
      const kalmanSmoothed = kalmanRef.current.update(rssi);
      const smoothed = emaRef.current.update(kalmanSmoothed);

      // ── Step 2: Map azimuth to bin ───────────────────────────────────────
      const normalizedAz = ((azimuth % 360) + 360) % 360;
      const binIdx = Math.floor(normalizedAz / BIN_SIZE);

      // ── Step 3: Update bin with exponential decay weighting ──────────────
      const existing = binsRef.current.get(binIdx);
      if (existing) {
        // Decay old weight by half-life before adding new sample
        const age = now - existing.lastTimestamp;
        const decayFactor = Math.exp(-DECAY_LAMBDA * age);
        existing.weightedSum = existing.weightedSum * decayFactor + smoothed;
        existing.totalWeight = existing.totalWeight * decayFactor + 1;
        existing.lastTimestamp = now;
      } else {
        binsRef.current.set(binIdx, {
          weightedSum: smoothed,
          totalWeight: 1,
          lastTimestamp: now,
        });
      }
      visitedBinsRef.current.add(binIdx);

      // ── Step 4: Build bin averages array ────────────────────────────────
      const rawBins = new Float64Array(NUM_BINS).fill(-100);
      for (const [idx, data] of binsRef.current.entries()) {
        rawBins[idx] = data.totalWeight > 0
          ? data.weightedSum / data.totalWeight
          : -100;
      }

      // ── Step 5: Gaussian smoothing ───────────────────────────────────────
      const smoothedBins = gaussianSmooth(rawBins, 1.5);

      // ── Step 6: Find peak bin ────────────────────────────────────────────
      let peakIdx = 0;
      let peakVal = -Infinity;
      for (let i = 0; i < NUM_BINS; i++) {
        if (smoothedBins[i] > peakVal) {
          peakVal = smoothedBins[i];
          peakIdx = i;
        }
      }

      // Parabolic interpolation for sub-bin precision
      const refinedPeak = parabolicPeak(smoothedBins, peakIdx);
      const targetBearing = ((refinedPeak * BIN_SIZE + BIN_SIZE / 2) % 360 + 360) % 360;

      // ── Step 7: Confidence score ─────────────────────────────────────────
      const sampledBinCount = visitedBinsRef.current.size;
      const angularCoverage = Math.min(360, sampledBinCount * BIN_SIZE);
      const hasDirection = sampledBinCount >= MIN_BINS_FOR_DIRECTION;

      // Coverage confidence: need >180° for good estimate
      const coverageConf = Math.min(angularCoverage / 180, 1);

      // Variance confidence: high spread between best and worst = directional signal
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < NUM_BINS; i++) {
        if (rawBins[i] > -99) {
          if (rawBins[i] < minVal) minVal = rawBins[i];
          if (rawBins[i] > maxVal) maxVal = rawBins[i];
        }
      }
      const spread = maxVal - minVal;
      const varianceConf = Math.min(spread / 20, 1); // 20dB spread = full confidence

      // Sample count confidence
      const sampleConf = Math.min(sampledBinCount / NUM_BINS, 1);

      // Combined confidence (weighted)
      const confidence = hasDirection
        ? Math.min(coverageConf * 0.5 + varianceConf * 0.35 + sampleConf * 0.15, 1)
        : 0;

      const proximity = rssiToProximity(smoothed);
      const distanceMetres = rssiToDistance(smoothed);
      const guidanceText = buildGuidanceText(confidence, angularCoverage, proximity, false);

      setState({
        smoothedRssi: Math.round(smoothed),
        rawRssi: rssi,
        distanceMetres: Math.max(0.1, Math.min(50, distanceMetres)),
        proximity,
        targetBearing,
        hasDirection,
        signalLost: false,
        confidence,
        angularCoverage,
        guidanceText,
      });

      wasSignalLostRef.current = false;
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
        if (!wasSignalLostRef.current) {
          wasSignalLostRef.current = true;
          setState((prev) => ({
            ...prev,
            signalLost: true,
            proximity: "LOST",
            guidanceText: "Signal lost. Walk toward the last known direction",
          }));
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  return state;
}
