import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  SharedValue,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "heart" as const,
    iconBg: "#D1FAE5",
    iconColor: Colors.primary,
    title: "Never Miss\nMedicines Again",
    subtitle:
      "CareDose AI sends smart reminders and AI-powered voice calls to ensure your loved ones take their medicines on time — every time.",
  },
  {
    id: "2",
    icon: "phone-call" as const,
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    title: "AI Calls Your\nLoved Ones",
    subtitle:
      "Our intelligent voice assistant calls patients in their preferred language — Hindi, English, Tamil and more — confirming medicine intake.",
  },
  {
    id: "3",
    icon: "activity" as const,
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    title: "Track Health\nRemotely",
    subtitle:
      "Monitor adherence, view detailed logs, and get instant alerts when a dose is missed. Family care made simple.",
  },
  {
    id: "4",
    icon: "camera" as const,
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    title: "Scan Prescriptions\nInstantly",
    subtitle:
      "Point your camera at any prescription and our AI will automatically extract medicines, dosages, and schedules for you.",
  },
];

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
}

const Dot = ({ index, scrollX }: DotProps) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    const widthDot = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      width: widthDot,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedDotStyle,
        { backgroundColor: Colors.primary },
      ]}
    />
  );
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace("/auth/login");
    }
  };

  const handleSkip = () => {
    router.replace("/auth/login");
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Feather name="heart" size={16} color={Colors.textInverse} />
          </View>
          <Text style={styles.logoText}>CareDose AI</Text>
        </View>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          return (
            <View style={[styles.slide, { width }]}>
              <Animated.View 
                style={[
                  styles.iconContainer, 
                  { backgroundColor: item.iconBg }
                ]}
              >
                <Feather name={item.icon} size={52} color={item.iconColor} />
              </Animated.View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <Dot key={index} index={index} scrollX={scrollX} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Animated.Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Animated.Text>
          <Feather
            name={currentIndex === slides.length - 1 ? "arrow-right" : "chevron-right"}
            size={20}
            color={Colors.textInverse}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 20,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 32,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textInverse,
  },
});


