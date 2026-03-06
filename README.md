

# 👓 GlassesNearby Pro

**Detect smart glasses nearby. Silently. Instantly. Privately.**

[![Whats-App-Image-2026-03-05-at-2-10-49-PM.jpg](https://i.postimg.cc/Y0y2hZyz/Whats-App-Image-2026-03-05-at-2-10-49-PM.jpg)](https://postimg.cc/H8X1NZmr)
[![Whats-App-Image-2026-03-05-at-2-10-50-PM.jpg](https://i.postimg.cc/SRKNQkVd/Whats-App-Image-2026-03-05-at-2-10-50-PM.jpg)](https://postimg.cc/xJWStrwN)
[![Whats-App-Image-2026-03-05-at-2-10-51-PM.jpg](https://i.postimg.cc/Xqv7N4xg/Whats-App-Image-2026-03-05-at-2-10-51-PM.jpg)](https://postimg.cc/9RvjJ364)
[![Whats-App-Image-2026-03-05-at-2-10-57-PM.jpg](https://i.postimg.cc/NF0fGBbk/Whats-App-Image-2026-03-05-at-2-10-57-PM.jpg)](https://postimg.cc/Q9Rr0L2F)

> Smart glasses are quietly becoming part of our everyday surroundings — yet they're nearly impossible to tell apart from ordinary eyewear at a glance. **GlassesNearby Pro** detects them for you.

<!-- Download Badges — coming soon -->
<a href="#">
  <img src="https://img.shields.io/badge/App%20Store-Coming%20Soon-black?style=for-the-badge&logo=apple" alt="App Store" />
</a>
&nbsp;
<a href="#">
  <img src="https://img.shields.io/badge/Google%20Play-Coming%20Soon-black?style=for-the-badge&logo=google-play" alt="Google Play" />
</a>

</div>

---

## 🔍 What It Does

Using **Bluetooth Low Energy (BLE) scanning**, GlassesNearby Pro identifies smart glasses nearby by reading **Company Identifiers** embedded in BTLE advertising frames (`ADV_IND`).

When a pair is detected within your chosen range, you'll get an **instant notification** — so you can always be aware of your environment and act accordingly.

### Detected Brands
| Brand | Device |
|---|---|
| 🟥 **Meta** | Ray-Ban Meta Smart Glasses |
| 🟨 **Snap** | Spectacles |
| 🟦 **Luxottica** | Smart eyewear lineup |

> ⚠️ **False positives are possible.** VR headsets and other Bluetooth devices from the same manufacturers may trigger alerts. Always use caution before acting on any detection.

---

## 📱 Screenshots

| Scanner | Detection Alert | Detection Log | Settings | Debug |
|:---:|:---:|:---:|:---:|:---:|
| Idle & scanning states | Real-time banner + push notification | Full timestamped history | Distance, alerts & privacy | Raw BLE debug view |

---

## ✨ Features

- **📡 Real-time BLE scanning** — Continuously scans for nearby smart glasses Bluetooth signals
- **🔔 Instant push notifications** — Get alerted the moment a device is detected
- **📳 Haptic feedback** — Subtle vibration on detection
- **📏 Adjustable detection range** — Tune from far (~7m+) to very close (<1m) using a dBm slider
- **🗂 Detection log** — Full history of all detections with timestamps and signal strength
- **🐛 Debug mode** — Raw BLE scanner to verify specific device advertising
- **🔒 Zero data collection** — All logs are stored locally only, nothing leaves your device
- **🚫 No ads, ever**

---

## 🛠 How It Works

```
Your Phone
    │
    ▼
BLE Scanner (ADV_IND frames)
    │
    ├── Reads Company Identifier from manufacturer data
    │
    ├── Matches against known smart glasses vendors
    │       (Meta / Snap / Luxottica)
    │
    └── Triggers alert if match found within RSSI threshold
            │
            ├── Push Notification
            ├── In-app banner
            ├── Haptic feedback
            └── Detection Log entry
```

RSSI thresholds map to human-readable distances:

| Signal | Distance |
|--------|----------|
| > -50 dBm | Very Close (< 1m) |
| -50 to -70 dBm | Close (1–3m) |
| -70 to -85 dBm | Moderate (3–7m) |
| < -85 dBm | Far (7m+) |

---

## 🧬 Inspired By

GlassesNearby Pro is a refined take on the concept pioneered by **[yj_nearbyglasses](https://github.com/yj-nearbyglasses)**, rebuilt from the ground up with a cleaner, more modern interface and a smoother overall experience.

---

## 🔐 Privacy

- ✅ No data collected or shared
- ✅ All detection logs stored **locally on your device only**
- ✅ No analytics, no telemetry, no accounts
- ✅ Open source — audit it yourself

---

## 🚀 Getting Started

### Requirements
- iOS 15+ or Android 10+
- Bluetooth permission
- Notification permission (optional, but recommended)

### Download
> 🔜 **Coming soon** to the **App Store** and **Google Play**

In the meantime, you can build from source:

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/GlassesNearbyPro.git

cd GlassesNearbyPro

# Install dependencies
npm install   # or: flutter pub get

# Run on device
npm run ios   # or: flutter run
```

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">

Made with 👁️ for privacy-conscious people everywhere.

**No ads. No tracking. Completely open source.**  
*Just a simple, honest tool that respects your privacy — and keeps you informed.*

⭐ **Star this repo** if you find it useful!

</div>
