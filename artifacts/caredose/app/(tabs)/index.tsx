import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { usePatientStore } from "@/store/patientStore";
import { patientsApi, logsApi } from "@/lib/api";
import MedicineDoseCard from "@/components/MedicineDoseCard";
import AdherenceRing from "@/components/AdherenceRing";
import PatientAvatar from "@/components/PatientAvatar";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });

  React.useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatient(patients[0]!.id);
    }
  }, [patients, selectedPatientId]);

  const activePatientId = selectedPatientId ?? patients[0]?.id;

  const { data: dashboard, isLoading: dashboardLoading, refetch } = useQuery({
    queryKey: ["dashboard", activePatientId],
    queryFn: () => patientsApi.dashboard(activePatientId!),
    enabled: !!activePatientId,
  });

  const markStatusMutation = useMutation({
    mutationFn: ({ logId, status }: { logId: string; status: "taken" | "missed" }) =>
      logsApi.updateStatus(logId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", activePatientId] });
      queryClient.invalidateQueries({ queryKey: ["logs", activePatientId] });
    },
    onError: () => {
      Alert.alert("Error", "Could not update status. Please try again.");
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (patientsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (patients.length === 0) {
    return (
      <View style={[styles.emptyState, { paddingTop: topPad + 80 }]}>
        <Feather name="users" size={56} color={Colors.border} />
        <Text style={styles.emptyTitle}>No Patients Yet</Text>
        <Text style={styles.emptySubtitle}>
          Add a patient to start tracking their medicines
        </Text>
        <TouchableOpacity
          style={styles.addPatientBtn}
          onPress={() => router.push("/patients/add")}
        >
          <Feather name="plus" size={18} color={Colors.textInverse} />
          <Text style={styles.addPatientBtnText}>Add Patient</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takenCount = dashboard?.todayDoses.filter((d) => d.status === "taken").length ?? 0;
  const missedCount = dashboard?.todayDoses.filter((d) => d.status === "missed").length ?? 0;
  const pendingCount = dashboard?.todayDoses.filter((d) => d.status === "pending").length ?? 0;
  const totalCount = dashboard?.todayDoses.length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0] ?? "Friend"}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/patients/add")}
          activeOpacity={0.8}
        >
          <Feather name="user-plus" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {patients.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.patientScroll}
          contentContainerStyle={styles.patientScrollContent}
        >
          {patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={[
                styles.patientChip,
                activePatientId === patient.id && styles.patientChipActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPatient(patient.id);
              }}
              activeOpacity={0.8}
            >
              <PatientAvatar name={patient.name} size={28} fontSize={11} />
              <Text
                style={[
                  styles.patientChipText,
                  activePatientId === patient.id && styles.patientChipTextActive,
                ]}
              >
                {patient.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {dashboardLoading ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : dashboard ? (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardFull]}>
              <AdherenceRing percentage={dashboard.adherencePercentage} size={110} strokeWidth={10} />
              <View style={styles.statDetails}>
                <Text style={styles.statCardTitle}>Today's Summary</Text>
                <View style={styles.miniStats}>
                  <View style={styles.miniStat}>
                    <View style={[styles.miniDot, { backgroundColor: Colors.taken }]} />
                    <Text style={styles.miniStatText}>{takenCount} Taken</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <View style={[styles.miniDot, { backgroundColor: Colors.missed }]} />
                    <Text style={styles.miniStatText}>{missedCount} Missed</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <View style={[styles.miniDot, { backgroundColor: Colors.pending }]} />
                    <Text style={styles.miniStatText}>{pendingCount} Pending</Text>
                  </View>
                </View>
                <Text style={styles.totalText}>{totalCount} total doses today</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Medicines</Text>
              <TouchableOpacity onPress={() => router.push("/patients/medicines")}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {dashboard.todayDoses.length === 0 ? (
              <View style={styles.noMeds}>
                <Feather name="check-circle" size={40} color={Colors.taken} />
                <Text style={styles.noMedsText}>No medicines scheduled today</Text>
                <TouchableOpacity onPress={() => router.push("/patients/add-medicine")}>
                  <Text style={styles.addMedLink}>+ Add Medicine</Text>
                </TouchableOpacity>
              </View>
            ) : (
              dashboard.todayDoses.map((dose, idx) => (
                <MedicineDoseCard
                  key={dose.logId ?? `${dose.medicineId}-${idx}`}
                  dose={dose}
                  onMarkTaken={(logId) => markStatusMutation.mutate({ logId, status: "taken" })}
                  onMarkMissed={(logId) => markStatusMutation.mutate({ logId, status: "missed" })}
                />
              ))
            )}
          </View>

          <View style={[styles.section, { paddingBottom: bottomPad + 100 }]}>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push("/patients/add-medicine")}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Feather name="plus-circle" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionText}>Add Medicine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push("/patients/prescription")}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="camera" size={24} color="#2563EB" />
                </View>
                <Text style={styles.quickActionText}>Scan Rx</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push("/(tabs)/activity")}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Feather name="activity" size={24} color="#D97706" />
                </View>
                <Text style={styles.quickActionText}>Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  patientScroll: {
    marginBottom: 16,
  },
  patientScrollContent: {
    paddingHorizontal: 24,
    gap: 10,
  },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  patientChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  patientChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  patientChipTextActive: {
    color: Colors.primary,
  },
  loadingSection: {
    paddingVertical: 60,
    alignItems: "center",
  },
  statsRow: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  statDetails: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 12,
  },
  miniStats: {
    gap: 8,
    marginBottom: 10,
  },
  miniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniStatText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  totalText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  noMeds: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 10,
  },
  noMedsText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addMedLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addPatientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  addPatientBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
