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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { patientsApi } from "@/lib/api";
import { usePatientStore } from "@/store/patientStore";

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "gujarati", label: "Gujarati" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "marathi", label: "Marathi" },
];

export default function AddPatientScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const setSelectedPatient = usePatientStore((s) => s.setSelectedPatient);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("english");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { mutate: createPatient, isPending } = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setSelectedPatient(patient.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Patient Added", `${patient.name} has been added successfully!`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) newErrors.age = "Enter a valid age (1-150)";
    
    const phoneClean = phone.trim().replace(/\s/g, "");
    if (phoneClean.length !== 10 || !/^\d+$/.test(phoneClean)) {
      newErrors.phone = "Enter a valid 10-digit mobile number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const fullPhone = `+91${phone.trim().replace(/\s/g, "")}`;
    createPatient({ name: name.trim(), age: parseInt(age, 10), phone: fullPhone, language });
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
          <Text style={styles.navTitle}>Add Patient</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.iconSection}>
          <View style={styles.iconBg}>
            <Feather name="user-plus" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.pageSubtitle}>
            Add a patient to manage their medicine schedule and receive AI call reminders.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Feather name="user" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Patient's full name"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={[styles.inputWrapper, errors.age && styles.inputError]}>
              <Feather name="calendar" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 68"
                placeholderTextColor={Colors.textTertiary}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>
            {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.hint}>
              This number will receive AI voice call reminders
            </Text>
            <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
              <View style={styles.prefixContainer}>
                <Text style={styles.prefixText}>+91</Text>
                <View style={styles.divider} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="98765 43210"
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={(val) => setPhone(val.replace(/[^\d]/g, "").slice(0, 10))}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Language</Text>
            <Text style={styles.hint}>AI calls will be in this language</Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.value}
                  style={[
                    styles.languageChip,
                    language === lang.value && styles.languageChipActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage(lang.value);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      language === lang.value && styles.languageChipTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Feather name="user-plus" size={18} color={Colors.background} />
              <Text style={styles.buttonText}>Add Patient</Text>
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
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  iconSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  pageSubtitle: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    gap: 0,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
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
  inputError: {
    borderColor: Colors.error,
  },
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
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  languageChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  languageChipText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  languageChipTextActive: {
    color: Colors.primary,
    fontFamily: "DMSans_600SemiBold",
  },
  prefixContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prefixText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
    color: Colors.background,
  },
});
