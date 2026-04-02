import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={40} tint="dark" style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
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
      transform: [{ scale: withSpring(isFocused ? 1.1 : 1, { damping: 15 }) }],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconCell, animatedStyle]}>
        <Feather
          name={iconName}
          size={21}
          color={isFocused ? Colors.text : Colors.textTertiary}
        />
        {isFocused && <View style={styles.activeDot} />}
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
    bottom: Platform.OS === "ios" ? 36 : 24,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(20, 20, 22, 0.8)",
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  tabButton: {
    padding: 2,
  },
  iconCell: {
    width: 52,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
