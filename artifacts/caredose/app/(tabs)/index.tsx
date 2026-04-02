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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import ScreenBackground from "@/components/ScreenBackground";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function GlassStatCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.statCardOuter, style]}>
      <BlurView intensity={Platform.OS === "ios" ? 20 : 10} tint="dark" style={styles.statCardBlur}>
        <View style={styles.statCardInner}>{children}</View>
      </BlurView>
    </View>
  );
}

function GlassQuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionOuter} onPress={onPress} activeOpacity={0.7}>
      <BlurView intensity={Platform.OS === "ios" ? 15 : 8} tint="dark" style={styles.quickActionBlur}>
        <View style={styles.quickActionInner}>
          <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
            <Feather name={icon as any} size={22} color={color} />
          </View>
          <Text style={styles.quickActionText}>{label}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
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
      <ScreenBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  if (patients.length === 0) {
    return (
      <ScreenBackground variant="warm">
        <View style={[styles.emptyState, { paddingTop: topPad + 80 }]}>
          <View style={styles.emptyIconBg}>
            <Feather name="users" size={32} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Patients Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a patient to start tracking their medicines
          </Text>
          <TouchableOpacity
            style={styles.addPatientBtn}
            onPress={() => router.push("/patients/add")}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Feather name="plus" size={18} color={Colors.background} />
              <Text style={styles.addPatientBtnText}>Add Patient</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  const takenCount = dashboard?.todayDoses.filter((d) => d.status === "taken").length ?? 0;
  const missedCount = dashboard?.todayDoses.filter((d) => d.status === "missed").length ?? 0;
  const pendingCount = dashboard?.todayDoses.filter((d) => d.status === "pending").length ?? 0;
  const totalCount = dashboard?.todayDoses.length ?? 0;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name?.split(" ")[0] ?? "Friend"}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtnOuter}
            onPress={() => router.push("/patients/add")}
            activeOpacity={0.7}
          >
            <BlurView intensity={15} tint="dark" style={styles.addBtnBlur}>
              <Feather name="user-plus" size={18} color={Colors.primary} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Patient Chips */}
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
                <PatientAvatar name={patient.name} size={26} fontSize={10} />
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
            {/* Wellness Header */}
            <View style={styles.wellnessHeader}>
              <Text style={styles.wellnessTitle}>Wellness Summary</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/activity")}>
                <Text style={styles.viewHistory}>View History</Text>
              </TouchableOpacity>
            </View>

            {/* Stats Grid — Glass Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statsGridRow}>
                <GlassStatCard style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>ADHERENCE</Text>
                  <View style={styles.statRingContainer}>
                    <AdherenceRing percentage={dashboard.adherencePercentage} size={80} strokeWidth={7} />
                  </View>
                </GlassStatCard>
                <GlassStatCard style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>TAKEN</Text>
                  <Text style={styles.statValue}>{takenCount}</Text>
                  <Text style={styles.statUnit}>doses</Text>
                </GlassStatCard>
              </View>
              <View style={styles.statsGridRow}>
                <GlassStatCard style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>MISSED</Text>
                  <Text style={[styles.statValue, { color: missedCount > 0 ? Colors.missed : Colors.text }]}>
                    {missedCount}
                  </Text>
                  <Text style={styles.statUnit}>doses</Text>
                </GlassStatCard>
                <GlassStatCard style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>PENDING</Text>
                  <Text style={[styles.statValue, { color: pendingCount > 0 ? Colors.pending : Colors.text }]}>
                    {pendingCount}
                  </Text>
                  <Text style={styles.statUnit}>of {totalCount}</Text>
                </GlassStatCard>
              </View>
            </View>

            {/* Today's Medicines */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Medicines</Text>
                <TouchableOpacity onPress={() => router.push("/patients/medicines")}>
                  <Text style={styles.seeAllText}>Manage</Text>
                </TouchableOpacity>
              </View>

              {dashboard.todayDoses.length === 0 ? (
                <View style={styles.noMedsOuter}>
                  <BlurView intensity={15} tint="dark" style={styles.noMedsBlur}>
                    <View style={styles.noMedsInner}>
                      <View style={styles.noMedsIcon}>
                        <Feather name="check-circle" size={28} color={Colors.taken} />
                      </View>
                      <Text style={styles.noMedsText}>No medicines scheduled today</Text>
                      <TouchableOpacity onPress={() => router.push("/patients/add-medicine")}>
                        <Text style={styles.addMedLink}>+ Add Medicine</Text>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
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

            {/* Quick Actions — Glass */}
            <View style={[styles.section, { paddingBottom: bottomPad + 100 }]}>
              <View style={styles.quickActions}>
                <GlassQuickAction
                  icon="plus-circle"
                  label="Add Med"
                  color={Colors.primary}
                  onPress={() => router.push("/patients/add-medicine")}
                />
                <GlassQuickAction
                  icon="camera"
                  label="Scan Rx"
                  color={Colors.secondary}
                  onPress={() => router.push("/patients/prescription")}
                />
                <GlassQuickAction
                  icon="activity"
                  label="Activity"
                  color={Colors.accent}
                  onPress={() => router.push("/(tabs)/activity")}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerLeft: {},
  greeting: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  userName: {
    fontSize: 30,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
    marginTop: 4,
  },
  addBtnOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  addBtnBlur: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  patientScroll: {
    marginBottom: 20,
  },
  patientScrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  patientChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  patientChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  patientChipTextActive: {
    color: Colors.primary,
  },
  loadingSection: {
    paddingVertical: 60,
    alignItems: "center",
  },
  wellnessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  wellnessTitle: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
  },
  viewHistory: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  // Glass Stat Cards
  statsGrid: {
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 28,
  },
  statsGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.border,
    minHeight: 120,
  },
  statCardBlur: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statCardInner: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  statRingContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    letterSpacing: -1,
  },
  statUnit: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
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
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.primary,
  },
  noMedsOuter: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  noMedsBlur: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  noMedsInner: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  noMedsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.takenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  noMedsText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addMedLink: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.primary,
    marginTop: 4,
  },
  // Glass Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  quickActionOuter: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  quickActionBlur: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  quickActionInner: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  addPatientBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addPatientBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.background,
  },
});
