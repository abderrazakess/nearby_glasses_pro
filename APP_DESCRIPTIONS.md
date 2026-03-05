# GlassesNearby Pro — App Descriptions

## Short Description (for app store listing)

**GlassesNearby Pro** detects smart glasses and VR headsets nearby via Bluetooth LE. Get real-time notifications when Ray-Ban Meta, Meta Quest, Snap Spectacles, or other smart eyewear is in range. Open source, privacy-first, no tracking. Inspired by the original [Nearby Glasses](https://github.com/yjeanrenaud/yj_nearbyglasses) project.

---

## Long Description (for app store or website)

### What is GlassesNearby Pro?

**GlassesNearby Pro** is a privacy-focused mobile app that detects smart glasses and AR/VR headsets in your vicinity using Bluetooth Low Energy (BLE) technology. The app scans for Bluetooth company identifiers broadcast by known smart eyewear manufacturers and alerts you in real time when a device is detected within your customizable distance threshold.

### Why Use It?

Smart glasses are becoming increasingly common in everyday settings — from Ray-Ban Meta to Meta Quest headsets to Snap Spectacles. However, they are often indistinguishable from regular eyewear at a glance. **GlassesNearby Pro** empowers you to be aware of smart glasses and recording devices in your environment, giving you the ability to act accordingly and protect your privacy.

### Key Features

- **Real-time BLE scanning** — Detects smart glasses from Meta, Snap, Luxottica, and other manufacturers via their Bluetooth company identifiers.
- **Customizable distance threshold** — Adjust the RSSI (signal strength) threshold in Settings to detect glasses from 1m to 15m away.
- **Detection history** — View a timestamped log of all detected devices, organized by date.
- **Debug mode** — See raw Bluetooth advertising data and company IDs for troubleshooting and verification.
- **Local notifications** — Receive instant alerts when smart glasses are detected nearby (optional).
- **Privacy-first** — No cloud sync, no user tracking, no ads, no analytics. Everything runs locally on your device.
- **Modern design** — Clean, intuitive interface inspired by the original Nearby Glasses project, built with React Native and Expo.

### Supported Devices

The app monitors Bluetooth company identifiers for:

- **Meta Platforms Technologies (0x058E)** — Ray-Ban Meta Smart Glasses, Meta Orion, Meta Quest 3 / 3S / Pro
- **Meta Platforms, Inc. (0x01AB)** — Ray-Ban Stories, Ray-Ban Meta, Meta Quest 2 / 3
- **Luxottica Group S.p.A (0x0D53)** — Ray-Ban smart frames
- **Snap Inc. (0x03C2)** — Spectacles 3, 4, 5

### Important Notes

- **False positives are possible** — VR headsets like Meta Quest share the same Bluetooth company IDs as Ray-Ban Meta glasses, so the app may detect both.
- **Requires Bluetooth permissions** — The app requests Bluetooth scan and location permissions (on Android) to access BLE advertising data.
- **Background scanning** — Currently requires the app to be open or running in the foreground. Background detection is a planned feature.

### Open Source

This app is **free, open source, and ad-free**. It is inspired by and builds upon the original [Nearby Glasses](https://github.com/yjeanrenaud/yj_nearbyglasses) project by Yannick Jeanrenaud. The modern mobile implementation uses React Native, Expo, and TypeScript for a seamless cross-platform experience.

### Privacy & Data

- No cloud backend required
- No user accounts or login
- No data collection or analytics
- All detection happens locally on your device
- Bluetooth scan data is never stored or transmitted

---

## Technical Details

**Platform:** iOS 14+ and Android 11+  
**Technology:** React Native, Expo SDK 54, Bluetooth LE scanning via react-native-ble-plx  
**License:** Open source (see GitHub repo)  
**GitHub:** [https://github.com/yjeanrenaud/yj_nearbyglasses](https://github.com/yjeanrenaud/yj_nearbyglasses) (original reference project)
