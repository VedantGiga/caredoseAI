import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import type { MedicineDoseStatus } from "@/lib/api";

interface Props {
  dose: MedicineDoseStatus;
  onMarkTaken?: (logId: string) => void;
  onMarkMissed?: (logId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

function getStatusConfig(status: MedicineDoseStatus["status"]) {
  switch (status) {
    case "taken":
      return {
        color: Colors.taken,
        bg: Colors.takenLight,
        label: "Taken",
        icon: "check-circle" as const,
      };
    case "missed":
      return {
        color: Colors.missed,
        bg: Colors.missedLight,
        label: "Missed",
        icon: "x-circle" as const,
      };
    default:
      return {
        color: Colors.pending,
        bg: Colors.pendingLight,
        label: "Pending",
        icon: "clock" as const,
      };
  }
}

export default function MedicineDoseCard({ dose, onMarkTaken, onMarkMissed }: Props) {
  const statusConfig = getStatusConfig(dose.status);

  const handleMarkTaken = () => {
    if (!dose.logId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Mark as Taken",
      `Confirm ${dose.medicineName} ${dose.dosage} was taken?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => onMarkTaken?.(dose.logId!),
        },
      ],
    );
  };

  const handleMarkMissed = () => {
    if (!dose.logId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Mark as Missed",
      `Mark ${dose.medicineName} as missed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => onMarkMissed?.(dose.logId!),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={[styles.statusStrip, { backgroundColor: statusConfig.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameSection}>
            <Text style={styles.medicineName}>{dose.medicineName}</Text>
            <Text style={styles.dosage}>{dose.dosage}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Feather name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeRow}>
            <Feather name="clock" size={14} color={Colors.textTertiary} />
            <Text style={styles.timeText}>{formatTime(dose.scheduledTime)}</Text>
            {dose.source && (
              <View style={styles.sourceChip}>
                <Text style={styles.sourceText}>{dose.source}</Text>
              </View>
            )}
          </View>

          {dose.status === "pending" && dose.logId && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtnTaken}
                onPress={handleMarkTaken}
                activeOpacity={0.8}
              >
                <Feather name="check" size={14} color={Colors.taken} />
                <Text style={[styles.actionText, { color: Colors.taken }]}>Taken</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnMissed}
                onPress={handleMarkMissed}
                activeOpacity={0.8}
              >
                <Feather name="x" size={14} color={Colors.missed} />
                <Text style={[styles.actionText, { color: Colors.missed }]}>Missed</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statusStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  nameSection: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  dosage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  sourceChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnTaken: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.takenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnMissed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.missedLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
