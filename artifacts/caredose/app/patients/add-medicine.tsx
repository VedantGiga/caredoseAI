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
} from "react-native";
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
      if (selectedTimes.length === 1) return;
      setSelectedTimes(selectedTimes.filter((t) => !(t.hour === preset.hour && t.minute === preset.minute)));
    } else {
      setSelectedTimes([...selectedTimes, { hour: preset.hour, minute: preset.minute, label: preset.label }]);
    }
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
              <Feather name="package" size={18} color={Colors.textTertiary} />
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
              <Feather name="activity" size={18} color={Colors.textTertiary} />
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
            <Text style={styles.label}>Reminder Times</Text>
            <Text style={styles.hint}>Select all times for this medicine</Text>
            {errors.times && <Text style={styles.errorText}>{errors.times}</Text>}
            <View style={styles.timesGrid}>
              {TIME_PRESETS.map((preset) => {
                const isSelected = selectedTimes.some(
                  (t) => t.hour === preset.hour && t.minute === preset.minute,
                );
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => toggleTimePreset(preset)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={isSelected ? "check-circle" : "circle"}
                      size={16}
                      color={isSelected ? Colors.primary : Colors.textTertiary}
                    />
                    <View>
                      <Text style={[styles.timeLabel, isSelected && styles.timeLabelActive]}>
                        {preset.label}
                      </Text>
                      <Text style={[styles.timeValue, isSelected && styles.timeValueActive]}>
                        {formatHour(preset.hour, preset.minute)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (isPending || !activePatientId) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isPending || !activePatientId}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <>
              <Feather name="plus-circle" size={18} color={Colors.textInverse} />
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
  navTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  patientBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  patientBannerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primaryDark,
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
    fontFamily: "Inter_500Medium",
    color: Colors.missed,
  },
  form: { marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.error, marginTop: 4 },
  frequencyRow: { flexDirection: "row", gap: 10 },
  freqChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  freqChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  freqText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  freqTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  timesGrid: { gap: 10 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  timeLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  timeLabelActive: { color: Colors.primaryDark },
  timeValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 1 },
  timeValueActive: { color: Colors.primary },
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
  buttonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.textInverse },
});
