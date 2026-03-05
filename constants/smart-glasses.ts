/**
 * Smart Glasses Company Identifiers
 *
 * These are Bluetooth SIG assigned company identifiers found in BLE advertising
 * frames (ADV_IND). They are immutable and mandatory per the Bluetooth spec.
 *
 * Source: https://www.bluetooth.com/specifications/assigned-numbers/
 * Reference: https://github.com/yjeanrenaud/yj_nearbyglasses
 */

export interface SmartGlassesCompany {
  /** Bluetooth SIG company identifier (hex string, e.g. "0x058E") */
  id: string;
  /** Numeric value of the company ID */
  numericId: number;
  /** Official company name per Bluetooth SIG */
  name: string;
  /** Short display name */
  shortName: string;
  /** Known smart glasses products */
  products: string[];
  /** Note about false positive risk */
  falsePositiveNote?: string;
}

export const SMART_GLASSES_COMPANIES: SmartGlassesCompany[] = [
  {
    id: "0x058E",
    numericId: 0x058e,
    name: "Meta Platforms Technologies, LLC",
    shortName: "Meta",
    products: ["Ray-Ban Meta Smart Glasses", "Meta Orion", "Meta Quest 3", "Meta Quest 3S", "Meta Quest Pro"],
    falsePositiveNote: "Detects Ray-Ban Meta glasses AND Meta Quest VR headsets — both use this company ID",
  },
  {
    id: "0x01AB",
    numericId: 0x01ab,
    name: "Meta Platforms, Inc. (formerly Facebook)",
    shortName: "Meta (Facebook)",
    products: ["Ray-Ban Stories", "Ray-Ban Meta", "Meta Quest 2", "Meta Quest 3"],
    falsePositiveNote: "Detects Ray-Ban Stories AND Meta Quest headsets — both use this company ID",
  },
  {
    id: "0x0D53",
    numericId: 0x0d53,
    name: "Luxottica Group S.p.A",
    shortName: "Luxottica",
    products: ["Ray-Ban Meta Smart Glasses"],
    falsePositiveNote: "Luxottica manufactures Ray-Ban frames for Meta",
  },
  {
    id: "0x03C2",
    numericId: 0x03c2,
    name: "Snap Inc.",
    shortName: "Snapchat",
    products: ["Spectacles 3", "Spectacles 4", "Spectacles 5"],
    falsePositiveNote: "Snap Spectacles AR glasses",
  },
];

/** Set of numeric company IDs for fast lookup */
export const SMART_GLASSES_COMPANY_IDS = new Set<number>(
  SMART_GLASSES_COMPANIES.map((c) => c.numericId)
);

/**
 * Look up a company by its numeric Bluetooth company ID.
 * Returns undefined if the ID does not match any known smart glasses manufacturer.
 */
export function findSmartGlassesCompany(
  companyId: number
): SmartGlassesCompany | undefined {
  return SMART_GLASSES_COMPANIES.find((c) => c.numericId === companyId);
}

/**
 * Parse the manufacturer-specific data from a BLE advertisement.
 *
 * react-native-ble-plx returns manufacturerData as a base64-encoded string.
 * The first 2 bytes are the company identifier in little-endian order.
 * e.g. Ray-Ban Stories (0x01AB = 427): bytes[0]=0xAB, bytes[1]=0x01
 *
 * Returns the company ID as a number, or null if data is too short/invalid.
 */
export function parseCompanyId(manufacturerData: string | null): number | null {
  if (!manufacturerData || manufacturerData.length === 0) return null;
  try {
    // react-native-ble-plx provides manufacturerData as base64
    // Use atob (available in React Native's JS engine) or Buffer
    let bytes: number[];
    if (typeof atob !== "undefined") {
      // React Native / browser environment
      const binary = atob(manufacturerData);
      bytes = Array.from(binary).map((c) => c.charCodeAt(0));
    } else {
      // Node.js / test environment
      const buf = Buffer.from(manufacturerData, "base64");
      bytes = Array.from(buf);
    }
    if (bytes.length < 2) return null;
    // Company ID is little-endian: LSB first, MSB second
    return (bytes[0] & 0xff) | ((bytes[1] & 0xff) << 8);
  } catch {
    return null;
  }
}

/**
 * Convert RSSI (dBm) to a human-readable distance estimate.
 */
export function rssiToDistance(rssi: number): string {
  if (rssi >= -55) return "Very Close (< 1m)";
  if (rssi >= -65) return "Close (1–3m)";
  if (rssi >= -75) return "Moderate (3–7m)";
  if (rssi >= -85) return "Far (7–15m)";
  return "Very Far (> 15m)";
}

/**
 * Convert RSSI to a 0–1 signal strength ratio (1 = strongest).
 */
export function rssiToStrength(rssi: number): number {
  // Clamp between -100 (weakest) and -40 (strongest)
  const clamped = Math.max(-100, Math.min(-40, rssi));
  return (clamped + 100) / 60;
}
