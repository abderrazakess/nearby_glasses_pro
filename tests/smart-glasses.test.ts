import { describe, it, expect } from "vitest";
import {
  findSmartGlassesCompany,
  parseCompanyId,
  rssiToDistance,
  rssiToStrength,
  SMART_GLASSES_COMPANY_IDS,
  SMART_GLASSES_COMPANIES,
} from "../constants/smart-glasses";

describe("Smart Glasses Company IDs", () => {
  it("should have 4 known companies", () => {
    expect(SMART_GLASSES_COMPANIES).toHaveLength(5);
  });

  it("should find Meta Platforms Technologies by ID 0x058E", () => {
    const company = findSmartGlassesCompany(0x058e);
    expect(company).toBeDefined();
    expect(company?.shortName).toBe("Meta");
    expect(company?.numericId).toBe(0x058e);
  });

  it("should find Meta Platforms Inc by ID 0x01AB", () => {
    const company = findSmartGlassesCompany(0x01ab);
    expect(company).toBeDefined();
    expect(company?.shortName).toBe("Meta (Facebook)");
  });

  it("should find Luxottica by ID 0x0D53", () => {
    const company = findSmartGlassesCompany(0x0d53);
    expect(company).toBeDefined();
    expect(company?.shortName).toBe("EssilorLuxottica");
  });

  it("should find Snap Inc by ID 0x03C2", () => {
    const company = findSmartGlassesCompany(0x03c2);
    expect(company).toBeDefined();
    expect(company?.shortName).toBe("Snapchat");
  });

  it("should return undefined for unknown company ID", () => {
    const company = findSmartGlassesCompany(0x1234);
    expect(company).toBeUndefined();
  });

  it("should have all company IDs in the Set", () => {
    expect(SMART_GLASSES_COMPANY_IDS.has(0x058e)).toBe(true);
    expect(SMART_GLASSES_COMPANY_IDS.has(0x01ab)).toBe(true);
    expect(SMART_GLASSES_COMPANY_IDS.has(0x0d53)).toBe(true);
    expect(SMART_GLASSES_COMPANY_IDS.has(0x03c2)).toBe(true);
    expect(SMART_GLASSES_COMPANY_IDS.has(0x9999)).toBe(false);
  });
});

describe("parseCompanyId", () => {
  it("should return null for null input", () => {
    expect(parseCompanyId(null)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseCompanyId("")).toBeNull();
  });

  it("should parse company ID from base64-encoded manufacturer data", () => {
    // 0x058E in little-endian = bytes [0x8E, 0x05]
    // Base64 of [0x8E, 0x05, 0x01, 0x02] = "jgUBAg=="
    const bytes = Buffer.from([0x8e, 0x05, 0x01, 0x02]);
    const b64 = bytes.toString("base64");
    const result = parseCompanyId(b64);
    expect(result).toBe(0x058e);
  });

  it("should parse Meta Platforms Inc ID 0x01AB", () => {
    // 0x01AB in little-endian = bytes [0xAB, 0x01]
    const bytes = Buffer.from([0xab, 0x01, 0x00]);
    const b64 = bytes.toString("base64");
    const result = parseCompanyId(b64);
    expect(result).toBe(0x01ab);
  });
});

describe("rssiToDistance", () => {
  it("should return Very Close for strong signal", () => {
    expect(rssiToDistance(-50)).toBe("Very Close (< 1m)");
    expect(rssiToDistance(-55)).toBe("Very Close (< 1m)");
  });

  it("should return Close for moderate-strong signal", () => {
    expect(rssiToDistance(-60)).toBe("Close (1–3m)");
    expect(rssiToDistance(-65)).toBe("Close (1–3m)");
  });

  it("should return Moderate for medium signal", () => {
    expect(rssiToDistance(-70)).toBe("Moderate (3–7m)");
    expect(rssiToDistance(-75)).toBe("Moderate (3–7m)");
  });

  it("should return Far for weak signal", () => {
    expect(rssiToDistance(-80)).toBe("Far (7–15m)");
    expect(rssiToDistance(-85)).toBe("Far (7–15m)");
  });

  it("should return Very Far for very weak signal", () => {
    expect(rssiToDistance(-90)).toBe("Very Far (> 15m)");
    expect(rssiToDistance(-100)).toBe("Very Far (> 15m)");
  });
});

describe("rssiToStrength", () => {
  it("should return 1.0 for strongest signal (-40 dBm)", () => {
    expect(rssiToStrength(-40)).toBe(1);
  });

  it("should return 0.0 for weakest signal (-100 dBm)", () => {
    expect(rssiToStrength(-100)).toBe(0);
  });

  it("should return 0.5 for mid-range signal (-70 dBm)", () => {
    expect(rssiToStrength(-70)).toBe(0.5);
  });

  it("should clamp values below -100", () => {
    expect(rssiToStrength(-120)).toBe(0);
  });

  it("should clamp values above -40", () => {
    expect(rssiToStrength(-20)).toBe(1);
  });
});
