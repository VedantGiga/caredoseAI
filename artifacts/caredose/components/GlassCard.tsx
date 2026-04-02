import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/colors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  elevated?: boolean;
  noPadding?: boolean;
}

/**
 * Premium glass card with frosted blur effect.
 * Falls back gracefully on Android where blur intensity varies.
 */
export default function GlassCard({
  children,
  style,
  intensity = 25,
  elevated = false,
  noPadding = false,
}: GlassCardProps) {
  const borderColor = elevated
    ? Colors.glass.borderElevated
    : Colors.glass.border;

  return (
    <View style={[styles.wrapper, elevated && styles.wrapperElevated, style]}>
      <BlurView
        intensity={Platform.OS === "ios" ? intensity : Math.min(intensity, 15)}
        tint="dark"
        style={[
          styles.blur,
          !noPadding && styles.padding,
        ]}
      >
        <View style={[styles.innerOverlay, { borderColor }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: "hidden",
    // Subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  },
  wrapperElevated: {
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 8,
  },
  blur: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  padding: {
    padding: 20,
  },
  innerOverlay: {
    borderWidth: 1,
    borderRadius: 19,
    borderColor: Colors.glass.border,
    // Extra inner glow at top edge
    margin: -1,
    padding: 1,
  },
});
