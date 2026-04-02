import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { medicinesApi, patientsApi } from "@/lib/api";
import { usePatientStore } from "@/store/patientStore";
import type { MedicineTime } from "@/lib/api";

const FREQUENCIES = [
  { value: "daily", label: "Every Day" },
  { value: "alternate_days", label: "Alternate Days" },
  { value: "weekly", label: "Weekly" },
];

const TIME_PRESETS = [
  { label: "Morning", hour: 8, minute: 0 },
  { label: "Afternoon", hour: 13, minute: 0 },
  { label: "Evening", hour: 18, minute: 0 },
  { label: "Night", hour: 21, minute: 0 },
];

function formatHour(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

export default function AddMedicineScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ prefillName?: string; prefillDosage?: string }>();
  const { selectedPatientId } = usePatientStore();

  const [name, setName] = useState(params.prefillName ?? "");
  const [dosage, setDosage] = useState(params.prefillDosage ?? "");
  const [frequency, setFrequency] = useState("daily");
  const [selectedTimes, setSelectedTimes] = useState<MedicineTime[]>([
    { hour: 8, minute: 0, label: "Morning" },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [startDate] = useState(new Date().toISOString().split("T")[0]!);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });

  const activePatientId = selectedPatientId ?? patients[0]?.id;
  const activePatient = patients.find((p) => p.id === activePatientId);

  const { mutate: createMedicine, isPending } = useMutation({
    mutationFn: (data: Parameters<typeof medicinesApi.create>[1]) =>
      medicinesApi.create(activePatientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines", activePatientId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activePatientId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Medicine Added", `${name} has been added to ${activePatient?.name}'s schedule!`, [
        { text: "Add Another", onPress: () => { setName(""); setDosage(""); } },
        { text: "Done", onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const toggleTimePreset = (preset: (typeof TIME_PRESETS)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const exists = selectedTimes.some(
      (t) => t.hour === preset.hour && t.minute === preset.minute,
    );
    if (exists) {
      removeTime(preset.hour, preset.minute);
    } else {
      setSelectedTimes([...selectedTimes, { hour: preset.hour, minute: preset.minute, label: preset.label }]);
    }
  };

  const removeTime = (hour: number, minute: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTimes.length === 1) return;
    setSelectedTimes(selectedTimes.filter((t) => !(t.hour === hour && t.minute === minute)));
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    
    if (selectedDate) {
      setTempTime(selectedDate);
      if (Platform.OS === "android") {
        addTime(selectedDate);
      }
    } else {
      setShowPicker(false);
    }
  };

  const addTime = (date: Date) => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const exists = selectedTimes.some((t) => t.hour === hour && t.minute === minute);
    
    if (!exists) {
      setSelectedTimes([...selectedTimes, { hour, minute, label: "Custom" }]);
    }
    setShowPicker(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Medicine name is required";
    if (!dosage.trim()) newErrors.dosage = "Dosage is required";
    if (selectedTimes.length === 0) newErrors.times = "Select at least one time";
    if (!activePatientId) newErrors.patient = "No patient selected";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMedicine({
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      times: selectedTimes,
      startDate,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Add Medicine</Text>
          <View style={{ width: 40 }} />
        </View>

        {activePatient && (
          <View style={styles.patientBanner}>
            <Feather name="user" size={14} color={Colors.primary} />
            <Text style={styles.patientBannerText}>For: {activePatient.name}</Text>
          </View>
        )}

        {errors.patient && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Please add a patient first</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medicine Name</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Feather name="package" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Amlodipine"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dosage</Text>
            <View style={[styles.inputWrapper, errors.dosage && styles.inputError]}>
              <Feather name="activity" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 5mg, 1 tablet"
                placeholderTextColor={Colors.textTertiary}
                value={dosage}
                onChangeText={setDosage}
              />
            </View>
            {errors.dosage && <Text style={styles.errorText}>{errors.dosage}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[styles.freqChip, frequency === freq.value && styles.freqChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFrequency(freq.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.freqText, frequency === freq.value && styles.freqTextActive]}>
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.label}>Reminder Times</Text>
                <Text style={styles.hint}>Click a time to remove it</Text>
              </View>
              <TouchableOpacity
                style={styles.addTimeBtn}
                onPress={() => {
                  setTempTime(new Date());
                  setShowPicker(true);
                }}
              >
                <Feather name="plus-circle" size={14} color={Colors.primary} />
                <Text style={styles.addTimeBtnText}>Add Time</Text>
              </TouchableOpacity>
            </View>

            {errors.times && <Text style={styles.errorText}>{errors.times}</Text>}
            
            <View style={styles.selectedTimesGrid}>
              {selectedTimes
                .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
                .map((time, idx) => (
                  <View key={`${time.hour}-${time.minute}-${idx}`} style={styles.selectedTimeCard}>
                    <View style={styles.selectedTimeInfo}>
                      <Text style={styles.selectedTimeValue}>{formatHour(time.hour, time.minute)}</Text>
                      <Text style={styles.selectedTimeLabel}>{time.label || "Custom"}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => removeTime(time.hour, time.minute)}
                      style={styles.removeBtn}
                    >
                      <Feather name="x" size={14} color={Colors.missed} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>

            <Text style={styles.subLabel}>Quick Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              {TIME_PRESETS.map((preset) => {
                const isSelected = selectedTimes.some(
                  (t) => t.hour === preset.hour && t.minute === preset.minute,
                );
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => toggleTimePreset(preset)}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {preset.label} ({formatHour(preset.hour, preset.minute)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {showPicker && (
          Platform.OS === "ios" ? (
            <Modal transparent visible={showPicker} animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Time</Text>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text style={styles.modalDone}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    textColor={Colors.text}
                  />
                  <TouchableOpacity style={styles.modalSubmit} onPress={() => addTime(tempTime)}>
                    <Text style={styles.modalSubmitText}>Add Time Slot</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={tempTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onTimeChange}
            />
          )
        )}

        <TouchableOpacity
          style={[styles.button, (isPending || !activePatientId) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isPending || !activePatientId}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Feather name="plus-circle" size={18} color={Colors.background} />
              <Text style={styles.buttonText}>Add Medicine</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: 24 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "DMSans_600SemiBold", color: Colors.text },
  patientBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  patientBannerText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.primary,
  },
  errorBanner: {
    backgroundColor: Colors.missedLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  errorBannerText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.missed,
  },
  form: { marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hint: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  inputError: { borderColor: Colors.error },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.error,
    marginTop: 4,
  },
  frequencyRow: { flexDirection: "row", gap: 8 },
  freqChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: "center",
  },
  freqChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  freqText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  freqTextActive: {
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  addTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  addTimeBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.primary,
  },
  selectedTimesGrid: { gap: 10, marginBottom: 20 },
  selectedTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.glass.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  selectedTimeInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  selectedTimeValue: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  selectedTimeLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.missedLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetsScroll: {
    flexDirection: "row",
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    marginRight: 8,
  },
  presetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  presetChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    color: Colors.missed,
  },
  modalSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 20,
    alignItems: "center",
  },
  modalSubmitText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.background,
  },
});
