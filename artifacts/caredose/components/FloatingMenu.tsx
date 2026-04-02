import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Pressable,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const MENU_ITEMS = [
  {
    icon: "plus",
    label: "Add Patient",
    color: Colors.secondary,
    route: "/patients/add" as const,
  },
  {
    icon: "layers",
    label: "Add Medicine",
    color: Colors.primary,
    route: "/patients/add-medicine" as const,
  },
  {
    icon: "alert-triangle",
    label: "SOS",
    color: Colors.missed,
    route: "/profile" as const, // Placeholder for SOS
    isSOS: true,
  },
];

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useSharedValue(0);

  const toggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    animation.value = withSpring(nextState ? 1 : 0, {
      damping: 15,
      stiffness: 100,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAction = (route: string) => {
    toggleMenu();
    router.push(route as any);
  };

  const fabStyle = useAnimatedStyle(() => {
    const rotation = interpolate(animation.value, [0, 1], [0, 45]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(animation.value, { duration: 200 }),
      pointerEvents: isOpen ? "auto" : "none",
    } as any;
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Backdrop Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
      </Animated.View>

      <View style={styles.menuWrapper} pointerEvents="box-none">
        {/* Menu Items */}
        {MENU_ITEMS.map((item, index) => (
          <MenuItem
            key={item.label}
            item={item}
            index={index}
            animation={animation}
            onPress={() => handleAction(item.route)}
          />
        ))}

        {/* Main Toggle Button */}
        <TouchableOpacity
          onPress={toggleMenu}
          activeOpacity={0.9}
          style={styles.fabContainer}
        >
          <BlurView intensity={80} tint="light" style={styles.fabBlur}>
            <Animated.View style={[styles.fab, fabStyle]}>
              <Feather name="plus" size={28} color="#fff" />
            </Animated.View>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MenuItem({ item, index, animation, onPress }: any) {
  const itemStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animation.value,
      [0, 1],
      [0, -70 * (index + 1)],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(animation.value, [0.3, 1], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(animation.value, [0, 1], [0.6, 1], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  return (
    <Animated.View style={[styles.menuItemContainer, itemStyle]}>
      <Pressable onPress={onPress} style={styles.menuItemInner}>
        <View style={styles.labelContainer}>
          <BlurView intensity={60} tint="light" style={styles.labelBlur}>
            <Text style={styles.label}>{item.label}</Text>
          </BlurView>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Feather name={item.icon} size={20} color="#fff" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  menuWrapper: {
    position: "absolute",
    bottom: 90, // Above the tab bar
    alignItems: "center",
    width: "100%",
  },
  fabContainer: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabBlur: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemContainer: {
    position: "absolute",
    bottom: 0,
    width: 180,
    alignItems: "flex-end",
    right: width / 2 - 90,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  labelBlur: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  label: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
