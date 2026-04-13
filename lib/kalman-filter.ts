/**
 * 1D Kalman Filter for smoothing noisy BLE RSSI readings.
 *
 * Tuned per spec: Q=0.008 (process noise), R=0.5 (measurement noise)
 * These values give ~±2dBm variance on the smoothed output vs ±10dBm raw.
 */
export class KalmanFilter {
  private x: number; // estimated state
  private p: number; // estimated error covariance
  private readonly q: number; // process noise covariance
  private readonly r: number; // measurement noise covariance

  constructor(
    initialValue: number,
    processNoise = 0.008,
    measurementNoise = 0.5,
  ) {
    this.x = initialValue;
    this.p = 1.0;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  update(measurement: number): number {
    // Predict
    const pPred = this.p + this.q;
    // Update (Kalman gain)
    const k = pPred / (pPred + this.r);
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * pPred;
    return this.x;
  }

  get value(): number {
    return this.x;
  }

  reset(value: number): void {
    this.x = value;
    this.p = 1.0;
  }
}

/**
 * Exponential Moving Average — secondary smoothing layer on top of Kalman.
 * alpha=0.3 per spec: 70% weight on history, 30% on new reading.
 */
export class ExponentialMovingAverage {
  private _value: number;
  private readonly alpha: number;

  constructor(initialValue: number, alpha = 0.3) {
    this._value = initialValue;
    this.alpha = alpha;
  }

  update(measurement: number): number {
    this._value = this.alpha * measurement + (1 - this.alpha) * this._value;
    return this._value;
  }

  get value(): number {
    return this._value;
  }
}

/**
 * Convert RSSI (dBm) to estimated distance in metres using the log-distance path loss model.
 *
 * distance = 10 ^ ((measuredPower - RSSI) / (10 * n))
 *
 * @param rssi - Current RSSI in dBm
 * @param txPower - Measured RSSI at 1 metre (default -59 dBm for BLE)
 * @param n - Path loss exponent (2.0 = free space, 2.5-3.5 = indoor)
 */
export function rssiToDistance(rssi: number, txPower = -59, n = 2.5): number {
  if (rssi === 0) return -1;
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  // Clamp to 0.1m–50m range per spec
  return Math.max(0.1, Math.min(50, distance));
}

/**
 * Map smoothed RSSI to a proximity zone.
 * Thresholds based on typical BLE RSSI at various distances.
 */
export type ProximityLevel = "RIGHT_HERE" | "CLOSE" | "NEAR" | "FAR" | "LOST";

export function rssiToProximity(rssi: number): ProximityLevel {
  if (rssi === 0 || rssi < -100) return "LOST";
  if (rssi >= -55) return "RIGHT_HERE"; // < ~1m
  if (rssi >= -67) return "CLOSE";      // 1–3m
  if (rssi >= -80) return "NEAR";       // 3–10m
  return "FAR";                          // > 10m
}

/** Proximity zone → accent color per spec */
export function proximityToColor(level: ProximityLevel): string {
  switch (level) {
    case "RIGHT_HERE": return "#FF3B30"; // red
    case "CLOSE":      return "#FFA500"; // orange
    case "NEAR":       return "#50C878"; // green
    case "FAR":        return "#4A90D9"; // blue
    case "LOST":       return "#6B7280"; // gray
  }
}

/** Proximity zone → background tint color per spec */
export function proximityToBgColor(level: ProximityLevel): string {
  switch (level) {
    case "RIGHT_HERE": return "#280A0A"; // dark red
    case "CLOSE":      return "#281A0A"; // dark orange
    case "NEAR":       return "#0A2818"; // dark green
    case "FAR":        return "#0A1628"; // dark blue
    case "LOST":       return "#0D0D0D"; // near black
  }
}

/** Proximity zone → human-readable label */
export function proximityToLabel(level: ProximityLevel): string {
  switch (level) {
    case "RIGHT_HERE": return "Right Here!";
    case "CLOSE":      return "Close";
    case "NEAR":       return "Nearby";
    case "FAR":        return "Far Away";
    case "LOST":       return "Signal Lost";
  }
}

/** Pulse interval in ms for proximity rings and haptics */
export function proximityToPulseInterval(level: ProximityLevel): number {
  switch (level) {
    case "RIGHT_HERE": return 250;  // 4 pulses/sec
    case "CLOSE":      return 400;  // 2.5 pulses/sec
    case "NEAR":       return 1000; // 1 pulse/sec
    case "FAR":        return 2000; // 0.5 pulses/sec
    case "LOST":       return 3000;
  }
}
