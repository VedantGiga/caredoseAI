import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { usePatientStore } from "@/store/patientStore";
import { useAuthStore } from "@/store/authStore";
import { patientsApi } from "@/lib/api";
import type { ActivityLog } from "@/lib/api";

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusConfig(status: ActivityLog["status"]) {
  switch (status) {
    case "taken":
      return { color: Colors.taken, bg: Colors.takenLight, icon: "check-circle" as const, label: "Taken" };
    case "missed":
      return { color: Colors.missed, bg: Colors.missedLight, icon: "x-circle" as const, label: "Missed" };
    case "no_response":
      return { color: Colors.textSecondary, bg: Colors.surfaceAlt, icon: "phone-missed" as const, label: "No Response" };
    default:
      return { color: Colors.pending, bg: Colors.pendingLight, icon: "clock" as const, label: "Pending" };
  }
}

function LogItem({ log }: { log: ActivityLog }) {
  const statusConfig = getStatusConfig(log.status);
  return (
    <View style={styles.logItem}>
      <View style={[styles.logIcon, { backgroundColor: statusConfig.bg }]}>
        <Feather name={statusConfig.icon} size={20} color={statusConfig.color} />
      </View>
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logMedicineName}>{log.medicineName}</Text>
          <View style={[styles.logBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.logBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.logDosage}>{log.dosage}</Text>
        <View style={styles.logMeta}>
          <Feather name="clock" size={12} color={Colors.textTertiary} />
          <Text style={styles.logTime}>{formatDateTime(log.scheduledTime)}</Text>
          {log.source && (
            <>
              <Text style={styles.logDot}>·</Text>
              <Feather
                name={log.source === "call" ? "phone" : log.source === "manual" ? "edit-2" : "cpu"}
                size={12}
                color={Colors.textTertiary}
              />
              <Text style={styles.logSource}>{log.source}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPatientId } = usePatientStore();
  const user = useAuthStore((s) => s.user);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });

  const activePatientId = selectedPatientId ?? patients[0]?.id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs", activePatientId],
    queryFn: () => patientsApi.logs(activePatientId!),
    enabled: !!activePatientId,
  });

  const activePatient = patients.find((p) => p.id === activePatientId);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Log</Text>
        {activePatient && (
          <Text style={styles.subtitle}>{activePatient.name}'s history</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="activity" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No Activity Yet</Text>
          <Text style={styles.emptyText}>
            Medicine activity will appear here once reminders are sent
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogItem log={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 68,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    gap: 14,
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  logMedicineName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  logBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  logDosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  logDot: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  logSource: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textTransform: "capitalize",
  },
});
