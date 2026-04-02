import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { Colors } from "@/constants/colors";
import { aiApi } from "@/lib/api";
import type { ExtractedMedicine } from "@/lib/api";

export default function PrescriptionScannerScreen() {
  const insets = useSafeAreaInsets();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [rawText, setRawText] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickImage = async (useCamera: boolean) => {
    if (Platform.OS !== "web") {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please grant permission to access your camera/gallery.");
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage(asset.uri);
      setMedicines([]);
      setRawText("");

      let base64 = asset.base64;
      if (!base64 && asset.uri && Platform.OS !== "web") {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64) {
        Alert.alert("Error", "Could not read image data");
        return;
      }

      setLoading(true);
      try {
        const result2 = await aiApi.parsePrescription(base64);
        setMedicines(result2.medicines);
        setRawText(result2.rawText);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: unknown) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to parse prescription");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    }
  };

  const addMedicineToSchedule = (med: ExtractedMedicine) => {
    router.push({
      pathname: "/patients/add-medicine",
      params: { prefillName: med.name, prefillDosage: med.dosage },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Scan Prescription</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Feather name="camera" size={32} color={Colors.secondary} />
        </View>
        <Text style={styles.heroTitle}>AI Prescription Scanner</Text>
        <Text style={styles.heroSubtitle}>
          Upload or take a photo of any prescription and our AI will automatically extract medicines, dosages, and schedules.
        </Text>
      </View>

      {!image ? (
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={styles.uploadOption}
            onPress={() => pickImage(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.uploadOptionIcon, { backgroundColor: "rgba(129, 140, 248, 0.12)" }]}>
              <Feather name="camera" size={26} color={Colors.secondary} />
            </View>
            <Text style={styles.uploadOptionTitle}>Take Photo</Text>
            <Text style={styles.uploadOptionSubtitle}>Use your camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadOption}
            onPress={() => pickImage(false)}
            activeOpacity={0.8}
          >
            <View style={[styles.uploadOptionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Feather name="image" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.uploadOptionTitle}>Upload Image</Text>
            <Text style={styles.uploadOptionSubtitle}>From your gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageSection}>
          <Image source={{ uri: image }} style={styles.prescriptionImage} resizeMode="contain" />
          {!loading && (
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => { setImage(null); setMedicines([]); setRawText(""); }}
            >
              <Feather name="refresh-cw" size={14} color={Colors.textSecondary} />
              <Text style={styles.retakeBtnText}>Scan Another</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>AI is analyzing your prescription...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      )}

      {medicines.length > 0 && (
        <View style={styles.resultsSection}>
          <View style={styles.resultHeader}>
            <Feather name="check-circle" size={18} color={Colors.taken} />
            <Text style={styles.resultTitle}>
              {medicines.length} Medicine{medicines.length > 1 ? "s" : ""} Found
            </Text>
          </View>

          {medicines.map((med, index) => (
            <View key={index} style={styles.medicineResult}>
              <View style={styles.medicineResultInfo}>
                <Text style={styles.medicineResultName}>{med.name}</Text>
                <Text style={styles.medicineResultDosage}>{med.dosage}</Text>
                {med.frequency && (
                  <Text style={styles.medicineResultFreq}>{med.frequency}</Text>
                )}
                {med.time && (
                  <Text style={styles.medicineResultTime}>Time: {med.time}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.addToScheduleBtn}
                onPress={() => addMedicineToSchedule(med)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color={Colors.background} />
                <Text style={styles.addToScheduleBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {image && !loading && medicines.length === 0 && rawText && (
        <View style={styles.noResultsSection}>
          <Feather name="alert-circle" size={24} color={Colors.warning} />
          <Text style={styles.noResultsText}>No medicines could be extracted</Text>
          <Text style={styles.noResultsSubtext}>
            Try with a clearer photo of the prescription
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "DMSans_600SemiBold", color: Colors.text },
  heroSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(129, 140, 248, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.2)",
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: Colors.textWarm,
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  uploadSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  uploadOption: {
    flex: 1,
    backgroundColor: Colors.glass.background,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  uploadOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOptionTitle: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  uploadOptionSubtitle: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  imageSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  prescriptionImage: {
    width: "100%",
    height: 250,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.glass.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  retakeBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  medicineResult: {
    backgroundColor: Colors.glass.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  medicineResultInfo: { flex: 1 },
  medicineResultName: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    marginBottom: 4,
  },
  medicineResultDosage: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  medicineResultFreq: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  medicineResultTime: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
  },
  addToScheduleBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addToScheduleBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.background,
  },
  noResultsSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  noResultsSubtext: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
});
