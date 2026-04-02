import React, { useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
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

const CustomBackground = ({ style }: any) => {
  return (
    <View style={[style, styles.sheetBackgroundOuter]}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 25}
        tint="dark"
        style={styles.sheetBackgroundBlur}
      />
    </View>
  );
};

export default function PatientDropdown({ patients, selectedId, onSelect, onAddPatient }: Props) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const selectedPatient = patients.find((p) => p.id === selectedId);

  const handlePresentModalPress = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
    bottomSheetModalRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={handlePresentModalPress}
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

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundComponent={CustomBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Patient</Text>
          <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()}>
            <Feather name="x" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetFlatList
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
                bottomSheetModalRef.current?.dismiss();
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
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </BottomSheetModal>
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
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  triggerName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
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
  sheetBackgroundOuter: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.glass.borderElevated,
    backgroundColor: Colors.background, // Fallback for very intense blurs on some androids
  },
  sheetBackgroundBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sheetHandle: {
    backgroundColor: Colors.border,
    width: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
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
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 2,
  },
  patientRowMeta: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
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
    fontFamily: "DMSans_500Medium",
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
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPatientText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.primary,
  },
});
