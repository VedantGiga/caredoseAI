import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import PatientAvatar from "@/components/PatientAvatar";

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  rightText?: string;
}

function SettingItem({ icon, label, onPress, danger, rightText }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIconWrapper, danger && { backgroundColor: Colors.missedLight }]}>
        <Feather name={icon} size={18} color={danger ? Colors.missed : Colors.textSecondary} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      <View style={styles.settingRight}>
        {rightText && <Text style={styles.settingRightText}>{rightText}</Text>}
        <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <PatientAvatar name={user?.name ?? "User"} size={72} fontSize={26} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patients</Text>
        <View style={styles.card}>
          <SettingItem
            icon="users"
            label="Manage Patients"
            onPress={() => router.push("/patients/list")}
          />
          <SettingItem
            icon="user-plus"
            label="Add New Patient"
            onPress={() => router.push("/patients/add")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.card}>
          <SettingItem
            icon="phone"
            label="Call Settings"
            onPress={() => Alert.alert("Coming Soon", "Configure call settings in a future update")}
            rightText="Twilio"
          />
          <SettingItem
            icon="bell"
            label="Notification Preferences"
            onPress={() => Alert.alert("Coming Soon", "Notification settings coming soon")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingItem
            icon="info"
            label="About CareDose AI"
            onPress={() =>
              Alert.alert(
                "CareDose AI",
                "Version 1.0.0\n\nSmart Medicine Assistant for Elderly\n\nPowered by AI voice calls and intelligent scheduling.",
              )
            }
          />
          <SettingItem
            icon="log-out"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLogo}>
          <Feather name="heart" size={14} color={Colors.primary} />
          <Text style={styles.footerText}>CareDose AI</Text>
        </View>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileCard: {
    marginHorizontal: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  dangerText: {
    color: Colors.missed,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingRightText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
