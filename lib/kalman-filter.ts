/**
 * 1D Kalman Filter for smoothing noisy BLE RSSI readings.
 *
 * State model: RSSI value is assumed to change slowly (random walk).
 * Measurement model: we observe the RSSI directly with Gaussian noise.
 *
 * Tuning:
 *  - processNoise (Q): how much the true RSSI can change per step (higher = more responsive, noisier)
 *  - measurementNoise (R): how noisy the raw sensor readings are (higher = smoother, more lag)
 */
export class KalmanFilter {
  private x: number; // estimated state
  private p: number; // estimated error covariance
  private readonly q: number; // process noise covariance
  private readonly r: number; // measurement noise covariance

  constructor(
    initialValue: number,
    processNoise = 1.0,
    measurementNoise = 4.0,
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
 * Exponential Moving Average — simpler alternative to Kalman for RSSI smoothing.
 * alpha=0.2 means 80% weight on history (very smooth), alpha=0.5 is balanced.
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
 * txPower: measured RSSI at 1 metre (typically -59 dBm for BLE).
 * n: path loss exponent (2.0 = free space, 2.5-4.0 = indoor).
 */
export function rssiToDistance(rssi: number, txPower = -59, n = 2.5): number {
  if (rssi === 0) return -1;
  const ratio = rssi / txPower;
  if (ratio < 1.0) return Math.pow(ratio, 10);
  return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
}

/**
 * Map smoothed RSSI to a proximity label.
 */
export type ProximityLevel = "RIGHT_HERE" | "CLOSE" | "NEAR" | "FAR" | "LOST";

export function rssiToProximity(rssi: number): ProximityLevel {
  if (rssi === 0 || rssi < -100) return "LOST";
  if (rssi >= -55) return "RIGHT_HERE";
  if (rssi >= -67) return "CLOSE";
  if (rssi >= -80) return "NEAR";
  return "FAR";
}

export function proximityToColor(level: ProximityLevel): string {
  switch (level) {
    case "RIGHT_HERE":
      return "#EF4444"; // red
    case "CLOSE":
      return "#F97316"; // orange
    case "NEAR":
      return "#22C55E"; // green
    case "FAR":
      return "#3B82F6"; // blue
    case "LOST":
      return "#6B7280"; // gray
  }
}

export function proximityToLabel(level: ProximityLevel): string {
  switch (level) {
    case "RIGHT_HERE":
      return "Right Here";
    case "CLOSE":
      return "Close";
    case "NEAR":
      return "Near";
    case "FAR":
      return "Far";
    case "LOST":
      return "Signal Lost";
  }
}
