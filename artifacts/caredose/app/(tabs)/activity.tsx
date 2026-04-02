import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { usePatientStore } from "@/store/patientStore";
import { patientsApi } from "@/lib/api";
import ScreenBackground from "@/components/ScreenBackground";
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
      return { color: Colors.textSecondary, bg: "rgba(255,255,255,0.04)", icon: "phone-missed" as const, label: "No Response" };
    default:
      return { color: Colors.pending, bg: Colors.pendingLight, icon: "clock" as const, label: "Pending" };
  }
}

function LogItem({ log }: { log: ActivityLog }) {
  const statusConfig = getStatusConfig(log.status);
  return (
    <View style={styles.logItemOuter}>
      <BlurView intensity={Platform.OS === "ios" ? 12 : 5} tint="dark" style={styles.logItemBlur}>
        <View style={styles.logItemInner}>
          <View style={[styles.logIcon, { backgroundColor: statusConfig.bg }]}>
            <Feather name={statusConfig.icon} size={18} color={statusConfig.color} />
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
              <Feather name="clock" size={11} color={Colors.textTertiary} />
              <Text style={styles.logTime}>{formatDateTime(log.scheduledTime)}</Text>
              {log.source && (
                <>
                  <Text style={styles.logDot}>·</Text>
                  <Feather
                    name={log.source === "call" ? "phone" : log.source === "manual" ? "edit-2" : "cpu"}
                    size={11}
                    color={Colors.textTertiary}
                  />
                  <Text style={styles.logSource}>{log.source}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPatientId } = usePatientStore();
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
    <ScreenBackground variant="cool">
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
            <View style={styles.emptyIconBg}>
              <Feather name="activity" size={32} color={Colors.textTertiary} />
            </View>
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
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
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
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  // Glass Log Items
  logItemOuter: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  logItemBlur: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  logItemInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 14,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontFamily: "DMSans_600SemiBold",
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
    fontFamily: "DMSans_600SemiBold",
  },
  logDosage: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
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
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  logDot: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  logSource: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    textTransform: "capitalize",
  },
});
