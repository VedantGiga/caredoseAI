import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import type { Patient } from "@/lib/api";
import PatientAvatar from "./PatientAvatar";

interface Props {
  patients: Patient[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  onAddPatient?: () => void;
}

export default function PatientDropdown({ patients, selectedId, onSelect, onAddPatient }: Props) {
  const [open, setOpen] = useState(false);
  const selectedPatient = patients.find((p) => p.id === selectedId);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        {selectedPatient ? (
          <>
            <PatientAvatar name={selectedPatient.name} size={32} fontSize={13} />
            <View style={styles.triggerInfo}>
              <Text style={styles.triggerLabel}>Viewing patient</Text>
              <Text style={styles.triggerName}>{selectedPatient.name}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.emptyAvatar}>
              <Feather name="user" size={16} color={Colors.textTertiary} />
            </View>
            <View style={styles.triggerInfo}>
              <Text style={styles.triggerLabel}>No patient selected</Text>
              <Text style={styles.triggerName}>Tap to choose</Text>
            </View>
          </>
        )}
        <Feather name="chevron-down" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={patients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.patientRow,
                    item.id === selectedId && styles.patientRowActive,
                  ]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.8}
                >
                  <PatientAvatar name={item.name} size={46} fontSize={17} />
                  <View style={styles.patientRowInfo}>
                    <Text style={styles.patientRowName}>{item.name}</Text>
                    <Text style={styles.patientRowMeta}>
                      Age {item.age} · {item.language.charAt(0).toUpperCase() + item.language.slice(1)}
                    </Text>
                    <View style={styles.patientRowPhone}>
                      <Feather name="phone" size={12} color={Colors.primary} />
                      <Text style={styles.patientRowPhoneText}>{item.phone}</Text>
                    </View>
                  </View>
                  {item.id === selectedId && (
                    <Feather name="check-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addPatientRow}
                  onPress={() => {
                    setOpen(false);
                    onAddPatient?.();
                  }}
                >
                  <View style={styles.addPatientIcon}>
                    <Feather name="user-plus" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.addPatientText}>Add New Patient</Text>
                  <Feather name="chevron-right" size={16} color={Colors.primary} />
                </TouchableOpacity>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  triggerInfo: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  triggerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 1,
  },
  emptyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  patientRowActive: {
    backgroundColor: Colors.primaryLight,
  },
  patientRowInfo: {
    flex: 1,
  },
  patientRowName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  patientRowMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  patientRowPhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  patientRowPhoneText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 80,
  },
  addPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addPatientIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addPatientText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
