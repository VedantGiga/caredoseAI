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
import { patientsApi } from "@/lib/api";
import { usePatientStore } from "@/store/patientStore";
import PatientAvatar from "@/components/PatientAvatar";
import type { Patient } from "@/lib/api";

export default function PatientListScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { selectedPatientId, setSelectedPatient } = usePatientStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: patientsApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (selectedPatientId === id) setSelectedPatient(null);
    },
  });

  const handleDelete = (patient: Patient) => {
    Alert.alert(
      "Remove Patient",
      `Remove ${patient.name} and all their data?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteMutation.mutate(patient.id);
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
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/patients/add")}
        >
          <Feather name="user-plus" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBg}>
            <Feather name="users" size={32} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No Patients</Text>
          <Text style={styles.emptyText}>Add patients to manage their medicine schedule</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/patients/add")}
          >
            <Text style={styles.emptyBtnText}>Add First Patient</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.patientCard,
                selectedPatientId === item.id && styles.patientCardActive,
              ]}
              onPress={() => {
                setSelectedPatient(item.id);
                router.back();
              }}
              activeOpacity={0.8}
            >
              <PatientAvatar name={item.name} size={48} fontSize={17} />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.name}</Text>
                <View style={styles.patientMeta}>
                  <Feather name="user" size={11} color={Colors.textTertiary} />
                  <Text style={styles.patientMetaText}>Age {item.age}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Feather name="globe" size={11} color={Colors.textTertiary} />
                  <Text style={styles.patientMetaText}>
                    {item.language.charAt(0).toUpperCase() + item.language.slice(1)}
                  </Text>
                </View>
                <View style={styles.patientPhone}>
                  <Feather name="phone" size={11} color={Colors.textTertiary} />
                  <Text style={styles.patientMetaText}>
                    {item.phone.replace(/(\+91)(\d{5})(\d{5})/, "$1 $2 $3")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="trash-2" size={16} color={Colors.missed} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
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
  patientCard: {
    backgroundColor: Colors.glass.background,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  patientCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  patientInfo: { flex: 1, marginLeft: 14 },
  patientName: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  patientMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  patientMetaText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  dot: { color: Colors.textTertiary },
  patientPhone: { flexDirection: "row", alignItems: "center", gap: 5 },
  deleteBtn: { padding: 6 },
});
