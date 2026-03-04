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
    products: ["Ray-Ban Meta Smart Glasses", "Meta Orion"],
    falsePositiveNote: "May also detect Meta Quest VR headsets",
  },
  {
    id: "0x01AB",
    numericId: 0x01ab,
    name: "Meta Platforms, Inc. (formerly Facebook)",
    shortName: "Meta (Facebook)",
    products: ["Ray-Ban Stories", "Ray-Ban Meta"],
    falsePositiveNote: "May also detect other Meta/Facebook Bluetooth devices",
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
 * The first two bytes (little-endian) are the company identifier.
 * Returns the company ID as a number, or null if data is too short.
 */
export function parseCompanyId(manufacturerData: string | null): number | null {
  if (!manufacturerData || manufacturerData.length < 4) return null;
  // manufacturerData is a base64-encoded byte array
  try {
    const bytes = Buffer.from(manufacturerData, "base64");
    if (bytes.length < 2) return null;
    // Company ID is little-endian in the first 2 bytes
    return bytes[0] | (bytes[1] << 8);
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
