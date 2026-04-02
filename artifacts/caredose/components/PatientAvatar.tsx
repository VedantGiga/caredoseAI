import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface Props {
  name: string;
  size?: number;
  fontSize?: number;
}

const AVATAR_COLORS = [
  "#818CF8",
  "#A78BFA",
  "#F472B6",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#F87171",
  "#FB923C",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PatientAvatar({ name, size = 44, fontSize = 16 }: Props) {
  const bgColor = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  initials: {
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
});
