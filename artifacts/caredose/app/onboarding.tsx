import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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
          <Feather name="heart" size={20} color={Colors.primary} />
          <Text style={styles.logoText}>CareDose AI</Text>
        </View>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
              <Feather name={item.icon} size={52} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? Colors.primary : Colors.border,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
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
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
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
    gap: 8,
    paddingVertical: 18,
    borderRadius: 18,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textInverse,
  },
});
