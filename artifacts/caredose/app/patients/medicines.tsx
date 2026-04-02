import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { medicinesApi, patientsApi } from "@/lib/api";
import { usePatientStore } from "@/store/patientStore";
import type { Medicine } from "@/lib/api";

function formatTimes(times: Medicine["times"]): string {
  return times
    .map((t) => {
      const ampm = t.hour >= 12 ? "PM" : "AM";
      const h = t.hour % 12 || 12;
      return `${h}:${t.minute.toString().padStart(2, "0")} ${ampm}`;
    })
    .join(", ");
}

function MedicineCard({
  medicine,
  onDelete,
  onToggle,
}: {
  medicine: Medicine;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.medicineCard, !medicine.isActive && styles.medicineCardInactive]}>
      <View style={styles.medicineCardLeft}>
        <View style={[styles.medicineIcon, !medicine.isActive && styles.medicineIconInactive]}>
          <Feather name="package" size={16} color={medicine.isActive ? Colors.primary : Colors.textTertiary} />
        </View>
      </View>
      <View style={styles.medicineCardContent}>
        <View style={styles.medicineCardHeader}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          {!medicine.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Paused</Text>
            </View>
          )}
        </View>
        <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
        <View style={styles.medicineMeta}>
          <Feather name="clock" size={11} color={Colors.textTertiary} />
          <Text style={styles.medicineMetaText}>{formatTimes(medicine.times)}</Text>
        </View>
        <View style={styles.medicineMeta}>
          <Feather name="refresh-cw" size={11} color={Colors.textTertiary} />
          <Text style={styles.medicineMetaText}>
            {medicine.frequency.replace("_", " ")}
          </Text>
        </View>
      </View>
      <View style={styles.medicineCardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggle}>
          <Feather
            name={medicine.isActive ? "pause-circle" : "play-circle"}
            size={20}
            color={medicine.isActive ? Colors.warning : Colors.taken}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Feather name="trash-2" size={18} color={Colors.missed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPatientId } = usePatientStore();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });

  const activePatientId = selectedPatientId ?? patients[0]?.id;
  const activePatient = patients.find((p) => p.id === activePatientId);

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["medicines", activePatientId],
    queryFn: () => medicinesApi.getAll(activePatientId!),
    enabled: !!activePatientId,
  });

  const deleteMutation = useMutation({
    mutationFn: (medicineId: string) => medicinesApi.delete(activePatientId!, medicineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", activePatientId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activePatientId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ medicineId, isActive }: { medicineId: string; isActive: boolean }) =>
      medicinesApi.update(activePatientId!, medicineId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", activePatientId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activePatientId] });
    },
  });

  const handleDelete = (medicine: Medicine) => {
    Alert.alert(
      "Delete Medicine",
      `Remove ${medicine.name} from ${activePatient?.name}'s schedule?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteMutation.mutate(medicine.id);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Medicines</Text>
          {activePatient && (
            <Text style={styles.subtitle}>{activePatient.name}'s schedule</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/patients/add-medicine")}
        >
          <Feather name="plus" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : medicines.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBg}>
            <Feather name="package" size={32} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Medicines Yet</Text>
          <Text style={styles.emptyText}>
            Add medicines to start scheduling AI call reminders
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/patients/add-medicine")}
          >
            <Feather name="plus" size={16} color={Colors.background} />
            <Text style={styles.emptyBtnText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MedicineCard
              medicine={item}
              onDelete={() => handleDelete(item)}
              onToggle={() =>
                toggleMutation.mutate({ medicineId: item.id, isActive: !item.isActive })
              }
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: bottomPad + 100 }]}
        onPress={() => router.push("/patients/add-medicine")}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={Colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    backgroundColor: Colors.glass.background,
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
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.background,
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  medicineCard: {
    backgroundColor: Colors.glass.background,
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  medicineCardInactive: { opacity: 0.5 },
  medicineCardLeft: { marginRight: 12 },
  medicineIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineIconInactive: { backgroundColor: "rgba(255,255,255,0.04)" },
  medicineCardContent: { flex: 1 },
  medicineCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  medicineName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  inactiveBadge: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: Colors.textTertiary,
  },
  medicineDosage: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  medicineMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  medicineMetaText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    textTransform: "capitalize",
  },
  medicineCardActions: { justifyContent: "space-between", paddingLeft: 8 },
  actionBtn: { padding: 4 },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
