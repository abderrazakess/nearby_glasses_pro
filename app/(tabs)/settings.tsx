import React from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  Linking,
  Pressable,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useBleScannerSettings } from "@/hooks/use-ble-scanner";
import { rssiToDistance } from "@/constants/smart-glasses";
import Slider from "@react-native-community/slider";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sublabel,
  right,
  isLast = false,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right: React.ReactNode;
  isLast?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
        <IconSymbol name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.rowSublabel, { color: colors.muted }]}>{sublabel}</Text>
        )}
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  url,
  isLast = false,
}: {
  icon: string;
  label: string;
  url: string;
  isLast?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
        <IconSymbol name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings } = useBleScannerSettings();

  const distanceLabel = rssiToDistance(settings.rssiThreshold);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanning */}
        <SettingsSection title="SCANNING">
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
                <IconSymbol name="waveform" size={16} color={colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                  Detection Distance
                </Text>
                <Text style={[styles.rowSublabel, { color: colors.muted }]}>
                  {distanceLabel}
                </Text>
              </View>
              <Text
                style={[
                  styles.rssiValue,
                  { color: colors.primary, fontVariant: ["tabular-nums"] },
                ]}
              >
                {settings.rssiThreshold} dBm
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-100}
              maximumValue={-40}
              step={1}
              value={settings.rssiThreshold}
              onValueChange={(v: number) => updateSettings({ rssiThreshold: Math.round(v) })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.muted }]}>Far</Text>
              <Text style={[styles.sliderLabel, { color: colors.muted }]}>Close</Text>
            </View>
          </View>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="NOTIFICATIONS">
          <SettingsRow
            icon="bell.fill"
            label="Push Notifications"
            sublabel="Alert when smart glasses detected"
            right={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="waveform"
            label="Vibration"
            sublabel="Haptic feedback on detection"
            right={
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(v) => updateSettings({ vibrationEnabled: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
            isLast
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="ABOUT">
          <SettingsRow
            icon="info.circle.fill"
            label="Version"
            right={
              <Text style={[styles.valueText, { color: colors.muted }]}>1.0.0</Text>
            }
          />
          <SettingsRow
            icon="shield.fill"
            label="Privacy"
            sublabel="No data collected or shared"
            right={<IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />}
          />
          <LinkRow
            icon="bluetooth"
            label="Bluetooth SIG Assigned Numbers"
            url="https://www.bluetooth.com/specifications/assigned-numbers/"
            isLast
          />
        </SettingsSection>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            <Text style={{ fontWeight: "700", color: colors.warning }}>False positives are likely.</Text>
            {" "}VR headsets and other Bluetooth devices from the same manufacturers may trigger alerts. Always use caution before acting on any detection.
          </Text>
        </View>

        {/* Company IDs Reference */}
        <SettingsSection title="MONITORED COMPANY IDs">
          {[
            { id: "0x058E", name: "Meta Platforms Technologies", products: "Ray-Ban Meta · Quest 3 / 3S / Pro" },
            { id: "0x01AB", name: "Meta Platforms, Inc.", products: "Ray-Ban Stories · Quest 2 / 3" },
            { id: "0x0D53", name: "Luxottica Group S.p.A", products: "Ray-Ban frames" },
            { id: "0x03C2", name: "Snap Inc.", products: "Spectacles" },
          ].map((company, i, arr) => (
            <View
              key={company.id}
              style={[
                styles.companyRow,
                i < arr.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.companyId, { color: colors.primary, fontVariant: ["tabular-nums"] }]}>
                {company.id}
              </Text>
              <View style={styles.companyInfo}>
                <Text style={[styles.companyName, { color: colors.foreground }]} numberOfLines={1}>
                  {company.name}
                </Text>
                <Text style={[styles.companyProducts, { color: colors.muted }]}>
                  {company.products}
                </Text>
              </View>
            </View>
          ))}
        </SettingsSection>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowSublabel: {
    fontSize: 12,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 15,
  },
  rssiValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  sliderSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 11,
  },
  disclaimer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  companyId: {
    fontSize: 13,
    fontWeight: "700",
    width: 60,
  },
  companyInfo: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "500",
  },
  companyProducts: {
    fontSize: 11,
  },
});
