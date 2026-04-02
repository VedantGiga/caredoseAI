import React from "react";
import { View, StyleSheet, ViewStyle, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "warm" | "cool" | "subtle";
}

/**
 * Premium screen background with ambient gradient orbs.
 * Creates the visual depth needed for glassmorphism to shine.
 */
export default function ScreenBackground({
  children,
  style,
  variant = "default",
}: ScreenBackgroundProps) {
  const config = VARIANTS[variant];

  return (
    <View style={[styles.container, style]}>
      {/* Base dark background */}
      <View style={styles.base} />

      {/* Ambient glow orbs */}
      <View style={[styles.orb, styles.orbTopRight]}>
        <LinearGradient
          colors={[config.orb1, "transparent"]}
          style={styles.orbGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <View style={[styles.orb, styles.orbBottomLeft]}>
        <LinearGradient
          colors={[config.orb2, "transparent"]}
          style={styles.orbGradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <View style={[styles.orb, styles.orbCenter]}>
        <LinearGradient
          colors={[config.orb3, "transparent"]}
          style={styles.orbGradient}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const VARIANTS = {
  default: {
    orb1: "rgba(52, 211, 153, 0.06)",   // emerald
    orb2: "rgba(129, 140, 248, 0.04)",   // indigo
    orb3: "rgba(52, 211, 153, 0.03)",    // subtle emerald
  },
  warm: {
    orb1: "rgba(232, 220, 200, 0.05)",   // cream
    orb2: "rgba(251, 191, 36, 0.04)",    // amber
    orb3: "rgba(52, 211, 153, 0.03)",    // emerald
  },
  cool: {
    orb1: "rgba(129, 140, 248, 0.06)",   // indigo
    orb2: "rgba(52, 211, 153, 0.04)",    // emerald
    orb3: "rgba(129, 140, 248, 0.02)",   // subtle indigo
  },
  subtle: {
    orb1: "rgba(255, 255, 255, 0.02)",
    orb2: "rgba(52, 211, 153, 0.02)",
    orb3: "rgba(255, 255, 255, 0.01)",
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  orb: {
    position: "absolute",
    overflow: "hidden",
  },
  orbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  orbTopRight: {
    top: -80,
    right: -60,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
  },
  orbBottomLeft: {
    bottom: 80,
    left: -80,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  orbCenter: {
    top: height * 0.35,
    left: width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
  },
  content: {
    flex: 1,
  },
});
