// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet": "list",
  "gearshape.fill": "settings",
  // Scanner
  "antenna.radiowaves.left.and.right": "wifi",
  "dot.radiowaves.left.and.right": "sensors",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  // Status
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  // Actions
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "arrow.clockwise": "refresh",
  "chevron.right": "chevron-right",
  "chevron.left.forwardslash.chevron.right": "code",
  "paperplane.fill": "send",
  // Bluetooth
  "bluetooth": "bluetooth",
  "bluetooth.slash": "bluetooth-disabled",
  // Misc
  "bell.fill": "notifications",
  "bell.slash.fill": "notifications-off",
  "shield.fill": "shield",
  "lock.fill": "lock",
  "waveform": "graphic-eq",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
