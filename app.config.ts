// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "space.manus.nearby.glasses.t20260304182219";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  appName: "GlassesNearby Pro",
  appSlug: "nearby_glasses",
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663402520795/C6eAreBQMVQA5VxzZNqUX9/icon-HscdfdFQ7bjfaFtczNM9Lu.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      NSBluetoothAlwaysUsageDescription:
        "GlassesNearby Pro uses Bluetooth to scan for smart glasses in your vicinity. No location data is collected.",
      NSBluetoothPeripheralUsageDescription:
        "GlassesNearby Pro uses Bluetooth to detect nearby smart glasses.",
    },
  },
  android: {
    versionCode: 10002,
    adaptiveIcon: {
      backgroundColor: "#0D1117",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: [
      "POST_NOTIFICATIONS",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "BLUETOOTH_SCAN",
      "BLUETOOTH_CONNECT",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: env.scheme, host: "*" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "react-native-ble-plx",
      {
        isBackgroundEnabled: true,
        modes: ["central"],
        bluetoothAlwaysPermission:
          "Allow GlassesNearby Pro to use Bluetooth to detect smart glasses nearby. No location data is collected.",
        // neverForLocation: true allows BLUETOOTH_SCAN without location permission on Android 12+
        // This is valid because we only use BLE for device detection, not positioning
        neverForLocation: true,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#1A73E8",
        sounds: [],
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0D1117",
        dark: {
          backgroundColor: "#0D1117",
        },
      },
    ],
    [
      "expo-sensors",
      {
        motionPermission: "GlassesNearby Pro uses motion sensors to determine the direction of nearby smart glasses.",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
