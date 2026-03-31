import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

// Use any for props to bypass strict missing type declaration for now if not installed
export function FloatingTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={90} tint="light" style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              iconName={getIconName(route.name)}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

function TabItem({ isFocused, onPress, iconName }: any) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isFocused ? 1.05 : 1) }],
      backgroundColor: withSpring(
        isFocused ? "rgba(255, 255, 255, 0.45)" : "transparent"
      ),
      borderColor: withSpring(
        isFocused ? "rgba(255, 255, 255, 0.8)" : "transparent"
      ),
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconCell, animatedStyle]}>
        <Feather
          name={iconName}
          size={22}
          color={isFocused ? Colors.primary : Colors.textTertiary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function getIconName(routeName: string) {
  switch (routeName) {
    case "index":
      return "home";
    case "activity":
      return "activity";
    case "profile":
      return "user";
    default:
      return "circle";
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 30,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20, // Squared pill look (not full capsule)
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  tabButton: {
    padding: 2,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12, // Squared icons
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
