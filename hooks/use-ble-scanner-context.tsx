import React, { createContext, useContext, type ReactNode } from "react";
import type { DetectedDevice } from "@/hooks/use-ble-scanner";

interface BleScannerContextValue {
  devices: DetectedDevice[];
  isScanning: boolean;
}

const BleScannerContext = createContext<BleScannerContextValue>({
  devices: [],
  isScanning: false,
});

export function BleScannerProvider({
  children,
  devices,
  isScanning,
}: {
  children: ReactNode;
  devices: DetectedDevice[];
  isScanning: boolean;
}) {
  return (
    <BleScannerContext.Provider value={{ devices, isScanning }}>
      {children}
    </BleScannerContext.Provider>
  );
}

export function useBleScannerContext(): BleScannerContextValue {
  return useContext(BleScannerContext);
}
