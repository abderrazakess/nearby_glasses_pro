# Nearby Glasses - Mobile App Interface Design

## Brand Identity

The app serves a privacy-conscious audience. The visual language should feel **serious, trustworthy, and technical** — not playful. Think of it like a security scanner or network analyzer app.

**Color Palette:**
- Primary: `#1A73E8` (electric blue — technology, scanning, trust)
- Background (dark): `#0D1117` (deep dark — like a terminal/radar screen)
- Background (light): `#F8FAFC`
- Surface (dark): `#161B22`
- Surface (light): `#FFFFFF`
- Accent (alert): `#FF453A` (iOS red — danger/warning)
- Accent (safe): `#30D158` (iOS green — clear/safe)
- Accent (scanning): `#0A84FF` (iOS blue — active state)
- Warning: `#FF9F0A` (amber — caution)
- Muted: `#8B949E`

## Screen List

1. **Home Screen** (Scanner) — Main radar/scanner view with scan toggle
2. **Log Screen** — History of all detected smart glass events
3. **Settings Screen** — RSSI threshold, notification preferences, about

## Screen Designs

### 1. Home Screen (Scanner)

**Primary Content:**
- Large animated radar/pulse circle in the center (active when scanning)
- Scan toggle button (Start/Stop)
- Status text: "Scanning..." / "Tap to start scanning"
- Alert banner when smart glasses detected (red, prominent)
- List of currently detected devices (company name, RSSI signal strength bar, distance estimate)
- Signal strength indicator per device

**Key Functionality:**
- Toggle BLE scanning on/off
- Real-time device list updates
- Notification trigger when RSSI exceeds threshold
- Haptic feedback on detection

**Layout:**
- Top: App title + settings gear icon
- Center: Animated radar pulse (180px circle, pulsing rings when active)
- Below radar: Status label
- Bottom half: Detected devices list (FlatList with cards)
- Floating alert banner when detection occurs

### 2. Log Screen

**Primary Content:**
- Chronological list of all detection events
- Each entry: timestamp, company name, peak RSSI, duration seen
- Empty state: "No detections recorded yet"
- Clear log button (top right)

**Layout:**
- Header with "Detection Log" title and clear button
- FlatList of log entries (grouped by date)
- Each card: company icon, name, RSSI value, time

### 3. Settings Screen

**Primary Content:**
- RSSI Threshold slider (range: -100 to -40 dBm, default: -70 dBm)
- Distance label that updates with slider (Very Close / Close / Moderate / Far)
- Notification toggle (on/off)
- Sound alert toggle
- Vibration toggle
- About section (version, open source, license info)
- Privacy statement

**Layout:**
- Grouped settings sections (Scanning, Notifications, About)
- Slider with live dBm value display
- Toggle switches for notification options

## Key User Flows

**Flow 1: Start Scanning**
User opens app → Sees radar (idle) → Taps "Start Scanning" → Radar animates → BLE scan begins → Devices appear in list

**Flow 2: Detection Alert**
Scanning active → Smart glasses detected within threshold → Alert banner slides in → Haptic feedback → Notification sent → Device appears in list with red indicator → Event logged

**Flow 3: Adjust Sensitivity**
User taps Settings tab → Drags RSSI slider → Distance label updates → Setting saved automatically → Returns to scanner

**Flow 4: Review History**
User taps Log tab → Sees chronological list of detections → Can clear log with confirmation

## Navigation Structure

Bottom tab bar with 3 tabs:
- Tab 1: `radar` icon → Home (Scanner)
- Tab 2: `list.bullet` icon → Log
- Tab 3: `gear` icon → Settings

## Typography

- Title: System Bold, 28pt
- Section headers: System Semibold, 17pt
- Body: System Regular, 15pt
- Caption/RSSI values: System Mono, 13pt (monospaced for numbers)

## Component Patterns

**Device Card:**
```
[Company Logo/Icon] [Company Name]     [RSSI: -65 dBm]
                    [Product Type]     [████░░░░] Signal
                    [First seen: 12s ago]
```

**Radar Animation:**
- Center dot (12px)
- 3 concentric rings that pulse outward when scanning
- Ring opacity fades from 0.6 → 0 as they expand
- Pulse interval: 2 seconds
- Color: primary blue when scanning, gray when idle
