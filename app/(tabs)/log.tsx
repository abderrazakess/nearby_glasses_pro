import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useDetectionLog, type LogEntry } from "@/hooks/use-ble-scanner";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(entries: LogEntry[]): { date: string; entries: LogEntry[] }[] {
  const groups: Map<string, LogEntry[]> = new Map();
  for (const entry of entries) {
    const key = formatDate(entry.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries()).map(([date, entries]) => ({ date, entries }));
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const colors = useColors();
  const isStrong = entry.peakRssi >= -65;
  const accentColor = isStrong ? colors.error : colors.warning;

  return (
    <View
      style={[
        styles.entryRow,
        { borderBottomColor: colors.border },
      ]}
    >
      <View
        style={[styles.entryBadge, { backgroundColor: `${accentColor}18` }]}
      >
        <Text style={[styles.entryInitial, { color: accentColor }]}>
          {entry.shortName.charAt(0)}
        </Text>
      </View>
      <View style={styles.entryInfo}>
        <Text style={[styles.entryCompany, { color: colors.foreground }]}>
          {entry.shortName}
        </Text>
        <Text style={[styles.entryDistance, { color: colors.muted }]}>
          {entry.distance}
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={[styles.entryRssi, { color: accentColor, fontVariant: ["tabular-nums"] }]}>
          {entry.peakRssi} dBm
        </Text>
        <Text style={[styles.entryTime, { color: colors.muted, fontVariant: ["tabular-nums"] }]}>
          {formatTime(entry.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export default function LogScreen() {
  const colors = useColors();
  const { log, clearLog } = useDetectionLog();
  const groups = groupByDate(log);

  const handleClear = () => {
    Alert.alert(
      "Clear Detection Log",
      "This will permanently delete all recorded detections. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: clearLog,
        },
      ]
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Detection Log
        </Text>
        {log.length > 0 && (
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
            <Text style={[styles.clearText, { color: colors.error }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {log.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Detections Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Start scanning on the main screen. Detected smart glasses will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          renderItem={({ item: group }) => (
            <View>
              <View style={[styles.dateHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.dateText, { color: colors.muted }]}>
                  {group.date}
                </Text>
                <Text style={[styles.countText, { color: colors.muted }]}>
                  {group.entries.length} detection{group.entries.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
                {group.entries.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer disclaimer */}
      {log.length > 0 && (
        <View style={[styles.disclaimer, { borderTopColor: colors.border }]}>
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            Logs are stored locally only. False positives are possible.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  countText: {
    fontSize: 12,
  },
  groupCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  entryBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryCompany: {
    fontSize: 14,
    fontWeight: "600",
  },
  entryDistance: {
    fontSize: 12,
  },
  entryRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  entryRssi: {
    fontSize: 13,
    fontWeight: "600",
  },
  entryTime: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  disclaimer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: "center",
  },
});
