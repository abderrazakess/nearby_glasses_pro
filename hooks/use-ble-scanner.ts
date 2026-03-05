import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SMART_GLASSES_COMPANIES,
  findSmartGlassesCompany,
  parseCompanyId,
  rssiToDistance,
  rssiToStrength,
  type SmartGlassesCompany,
} from "@/constants/smart-glasses";

export interface DetectedDevice {
  id: string;
  companyId: number;
  company: SmartGlassesCompany;
  rssi: number;
  strength: number;
  distance: string;
  firstSeen: number;
  lastSeen: number;
  /** How many times this device has been seen */
  seenCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  companyId: number;
  companyName: string;
  shortName: string;
  peakRssi: number;
  distance: string;
}

const STORAGE_KEY_LOG = "nearby_glasses_log";
const STORAGE_KEY_SETTINGS = "nearby_glasses_settings";
const DEVICE_TIMEOUT_MS = 10000; // Remove device from list if not seen for 10s

export interface ScannerSettings {
  rssiThreshold: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: ScannerSettings = {
  rssiThreshold: -70,
  notificationsEnabled: true,
  soundEnabled: false,
  vibrationEnabled: true,
};

export function useBleScannerSettings() {
  const [settings, setSettings] = useState<ScannerSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_SETTINGS).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<ScannerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings, loaded };
}

export function useDetectionLog() {
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_LOG).then((raw) => {
      if (raw) {
        try {
          setLog(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const addLogEntry = useCallback((entry: LogEntry) => {
    setLog((prev) => {
      const next = [entry, ...prev].slice(0, 500); // Keep last 500 entries
      AsyncStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearLog = useCallback(async () => {
    setLog([]);
    await AsyncStorage.removeItem(STORAGE_KEY_LOG);
  }, []);

  return { log, addLogEntry, clearLog };
}

/**
 * Simulates BLE scanning for development/web environments.
 * On actual Android/iOS devices, real BLE scanning is used via react-native-ble-plx.
 */
export function useBleScannerSimulated(
  isScanning: boolean,
  rssiThreshold: number,
  onDeviceDetected: (device: DetectedDevice) => void
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectedRef = useRef<Map<string, DetectedDevice>>(new Map());
  // Use a ref for the callback to avoid re-triggering the effect on every render
  const callbackRef = useRef(onDeviceDetected);
  callbackRef.current = onDeviceDetected;

  useEffect(() => {
    if (!isScanning) {
      if (timerRef.current) clearInterval(timerRef.current);
      detectedRef.current.clear();
      return;
    }

    // Simulate BLE device detections for demo/web environment
    timerRef.current = setInterval(() => {
      // Pick a random company
      const company =
        SMART_GLASSES_COMPANIES[
          Math.floor(Math.random() * SMART_GLASSES_COMPANIES.length)
        ];
      // Generate RSSI in a range that will usually pass the threshold (-70 default)
      const rssi = -50 - Math.floor(Math.random() * 30); // -50 to -80 dBm
      const deviceId = `sim-${company.numericId}`;

      const existing = detectedRef.current.get(deviceId);
      const device: DetectedDevice = {
        id: deviceId,
        companyId: company.numericId,
        company,
        rssi,
        strength: rssiToStrength(rssi),
        distance: rssiToDistance(rssi),
        firstSeen: existing?.firstSeen ?? Date.now(),
        lastSeen: Date.now(),
        seenCount: (existing?.seenCount ?? 0) + 1,
      };
      detectedRef.current.set(deviceId, device);
      callbackRef.current(device);
    }, 2500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // Only depend on isScanning and rssiThreshold, not the callback (use ref instead)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, rssiThreshold]);
}

/**
 * Main BLE scanner hook.
 * On native platforms, uses react-native-ble-plx for real BLE scanning.
 * On web/simulator, falls back to a simulated scanner.
 */
export interface RawBleDevice {
  id: string;
  name: string | null;
  rssi: number;
  companyIdHex: string | null;
  companyIdDecimal: number | null;
  manufacturerDataRaw: string | null;
  isSmartGlasses: boolean;
}

export function useBleScanner(
  settings: ScannerSettings,
  onNewDetection: (device: DetectedDevice) => void
) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DetectedDevice[]>([]);
  const [bleState, setBleState] = useState<string>("Unknown");
  const [error, setError] = useState<string | null>(null);
  const [rawDevices, setRawDevices] = useState<RawBleDevice[]>([]);
  const managerRef = useRef<any>(null);
  const devicesRef = useRef<Map<string, DetectedDevice>>(new Map());
  const rawDevicesRef = useRef<Map<string, RawBleDevice>>(new Map());
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newDetectionsRef = useRef<Set<string>>(new Set());

  // Sync devices map to state
  const syncDevices = useCallback(() => {
    const now = Date.now();
    // Remove stale devices
    for (const [id, device] of devicesRef.current.entries()) {
      if (now - device.lastSeen > DEVICE_TIMEOUT_MS) {
        devicesRef.current.delete(id);
      }
    }
    setDevices(Array.from(devicesRef.current.values()).sort((a, b) => b.rssi - a.rssi));
    // Sync raw devices (keep last 50 for debug)
    setRawDevices(
      Array.from(rawDevicesRef.current.values())
        .sort((a, b) => b.rssi - a.rssi)
        .slice(0, 50)
    );
  }, []);

  // Handle a detected device (real or simulated)
  const handleDevice = useCallback(
    (deviceId: string, companyId: number, rssi: number) => {
      const company = findSmartGlassesCompany(companyId);
      if (!company) return;
      if (rssi < settings.rssiThreshold) return;

      const existing = devicesRef.current.get(deviceId);
      const isNew = !existing;

      const device: DetectedDevice = {
        id: deviceId,
        companyId,
        company,
        rssi,
        strength: rssiToStrength(rssi),
        distance: rssiToDistance(rssi),
        firstSeen: existing?.firstSeen ?? Date.now(),
        lastSeen: Date.now(),
        seenCount: (existing?.seenCount ?? 0) + 1,
      };

      devicesRef.current.set(deviceId, device);

      if (isNew && !newDetectionsRef.current.has(deviceId)) {
        newDetectionsRef.current.add(deviceId);
        onNewDetection(device);
        // Allow re-alerting after 30 seconds
        setTimeout(() => newDetectionsRef.current.delete(deviceId), 30000);
      }
    },
    [settings.rssiThreshold, onNewDetection]
  );

  const startScanning = useCallback(async () => {
    setError(null);
    setIsScanning(true);

    // Start cleanup timer
    cleanupTimerRef.current = setInterval(syncDevices, 2000);

    if (Platform.OS === "web") {
      // Web: use simulated scanner
      return;
    }

    try {
      // Request Bluetooth permissions on Android 12+ (API 31+)
      // On older Android, location permission is required for BLE scanning
      if (Platform.OS === "android") {
        const { PermissionsAndroid } = await import("react-native");
        const apiLevel = parseInt(String((Platform as any).Version ?? "0"), 10);
        if (apiLevel >= 31) {
          // Android 12+ — request BLUETOOTH_SCAN and BLUETOOTH_CONNECT
          const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);
          const scanGranted =
            results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted";
          if (!scanGranted) {
            setError(
              "Bluetooth Scan permission is required. Please grant it in Settings > Apps > GlassesNearby Pro > Permissions."
            );
            setIsScanning(false);
            return;
          }
        } else {
          // Android < 12 — BLE scanning requires location permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission Required",
              message:
                "On Android 11 and below, Bluetooth scanning requires location permission. GlassesNearby Pro does not use your location.",
              buttonPositive: "Allow",
              buttonNegative: "Deny",
            }
          );
          if (granted !== "granted") {
            setError(
              "Location permission is required for Bluetooth scanning on Android 11 and below."
            );
            setIsScanning(false);
            return;
          }
        }
      }

      // Dynamic import to avoid web crashes
      const { BleManager } = await import("react-native-ble-plx");
      if (!managerRef.current) {
        managerRef.current = new BleManager();
      }

      const manager = managerRef.current;

      // Check Bluetooth state
      const state = await manager.state();
      setBleState(state);

      if (state !== "PoweredOn") {
        setError(
          state === "PoweredOff"
            ? "Bluetooth is turned off. Please enable Bluetooth and try again."
            : `Bluetooth is not available (state: ${state}). Please check your device settings.`
        );
        setIsScanning(false);
        return;
      }

      // Start scanning for all BLE devices
      // allowDuplicates: true is critical — we need repeated advertisements to track RSSI
      manager.startDeviceScan(
        null, // scan all service UUIDs (null = all)
        { allowDuplicates: true, scanMode: 2 }, // scanMode 2 = LOW_LATENCY (most aggressive)
        (err: any, device: any) => {
          if (err) {
            // Error code 601 = scan already in progress, ignore it
            if (err?.errorCode !== 601) {
              console.error("BLE scan error:", err?.message ?? err);
            }
            return;
          }
          if (!device) return;

          // Check manufacturer-specific data for smart glasses company IDs
          // react-native-ble-plx returns manufacturerData as base64-encoded bytes
          // First 2 bytes are the company ID in little-endian order
          const mfData: string | null = device.manufacturerData;
          const parsedCompanyId = mfData ? parseCompanyId(mfData) : null;
          const isSmartGlasses =
            parsedCompanyId !== null && !!findSmartGlassesCompany(parsedCompanyId);

          // Track all raw devices for debug mode
          rawDevicesRef.current.set(device.id, {
            id: device.id,
            name: device.name || device.localName || null,
            rssi: device.rssi ?? -100,
            companyIdHex:
              parsedCompanyId !== null
                ? `0x${parsedCompanyId.toString(16).toUpperCase().padStart(4, "0")}`
                : null,
            companyIdDecimal: parsedCompanyId,
            manufacturerDataRaw: mfData ?? null,
            isSmartGlasses,
          });

          if (isSmartGlasses && parsedCompanyId !== null) {
            handleDevice(device.id, parsedCompanyId, device.rssi ?? -100);
            return; // matched by company ID — most reliable, stop here
          }

          // Fallback: match by device name for known smart glasses product names
          // This catches devices that may advertise under a different company ID
          const name = (device.name || device.localName || "").toLowerCase();
          const nameMatches: Array<{ pattern: string; companyId: number }> = [
            { pattern: "ray-ban", companyId: 0x01ab },
            { pattern: "rayban", companyId: 0x01ab },
            { pattern: "meta glasses", companyId: 0x058e },
            { pattern: "spectacles", companyId: 0x03c2 },
            { pattern: "snap spectacles", companyId: 0x03c2 },
          ];
          for (const { pattern, companyId } of nameMatches) {
            if (name.includes(pattern)) {
              handleDevice(device.id, companyId, device.rssi ?? -100);
              break;
            }
          }
        }
      );
    } catch (e: any) {
      console.error("BLE init error:", e);
      setError("Could not initialize Bluetooth scanner: " + (e?.message ?? String(e)));
      setIsScanning(false);
    }
  }, [handleDevice, syncDevices]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    devicesRef.current.clear();
    rawDevicesRef.current.clear();
    newDetectionsRef.current.clear();
    setDevices([]);
    setRawDevices([]);

    if (cleanupTimerRef.current) {
      clearInterval(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    if (managerRef.current && Platform.OS !== "web") {
      try {
        managerRef.current.stopDeviceScan();
      } catch {}
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      if (managerRef.current) {
        try {
          managerRef.current.destroy();
        } catch {}
        managerRef.current = null;
      }
    };
  }, [stopScanning]);

  // Simulated scanner for web/development
  useBleScannerSimulated(
    isScanning && Platform.OS === "web",
    settings.rssiThreshold,
    (device) => {
      devicesRef.current.set(device.id, device);
      // Immediately sync to state so UI updates
      setDevices(Array.from(devicesRef.current.values()).sort((a, b) => b.rssi - a.rssi));
      if (!newDetectionsRef.current.has(device.id)) {
        newDetectionsRef.current.add(device.id);
        onNewDetection(device);
        setTimeout(() => newDetectionsRef.current.delete(device.id), 30000);
      }
    }
  );

  return {
    isScanning,
    devices,
    rawDevices,
    bleState,
    error,
    startScanning,
    stopScanning,
  };
}
