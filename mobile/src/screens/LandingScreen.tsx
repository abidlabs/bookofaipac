import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { setOnboardingComplete } from "../utils/onboardingStorage";
import LandingHeroCards from "../components/LandingHeroCards";

const { height: WINDOW_H } = Dimensions.get("window");
const HERO_RATIO = 0.44;

const heroWordmark = require("../../assets/scan-aipac-wordmark-hero.png");

const BG = colors.bg;

const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;
const CORNER_INSET = 12;
const cornerBase = {
  position: "absolute" as const,
  width: CORNER_SIZE,
  height: CORNER_SIZE,
  borderColor: colors.stanceRed,
  zIndex: 4,
};

const PULSE_MS = 1800;

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [pulseAnim]);

  const pulseGlow = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.28],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  const goToScan = useCallback(async () => {
    await setOnboardingComplete();
    navigation.reset({
      index: 0,
      routes: [{ name: "Scan" }],
    });
  }, [navigation]);

  const onGrantCamera = useCallback(async () => {
    await requestPermission();
    await goToScan();
  }, [requestPermission, goToScan]);

  if (!permission) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.stanceRed} />
      </View>
    );
  }

  const heroH = Math.round(WINDOW_H * HERO_RATIO);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.heroWrap, { height: heroH }]}>
          <LandingHeroCards />
          <Image
            source={heroWordmark}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityLabel="ScanAIPAC"
          />
          <View style={styles.cornerTL} pointerEvents="none" />
          <View style={styles.cornerTR} pointerEvents="none" />
          <View style={styles.cornerBL} pointerEvents="none" />
          <View style={styles.cornerBR} pointerEvents="none" />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.lead}>
            Scan a candidate's name to see if they take money from the Israel lobby.
          </Text>
          <Animated.View style={[styles.ctaPulseShell, { transform: [{ scale: pulseScale }] }]}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onGrantCamera}
              style={styles.ctaOuter}
              accessibilityRole="button"
              accessibilityLabel="Grant camera access"
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.ctaGlow, { opacity: pulseGlow }]}
              />
              <Text style={styles.ctaText}>GRANT CAMERA ACCESS</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.body}>
            On your device only, no data is uploaded. Results are best-effort, verify with official sources.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: BG,
  },
  heroWrap: {
    width: "100%",
    backgroundColor: BG,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: BG,
    zIndex: 1,
  },
  cornerTL: {
    ...cornerBase,
    top: CORNER_INSET,
    left: CORNER_INSET,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    ...cornerBase,
    top: CORNER_INSET,
    right: CORNER_INSET,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    ...cornerBase,
    bottom: CORNER_INSET,
    left: CORNER_INSET,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    ...cornerBase,
    bottom: CORNER_INSET,
    right: CORNER_INSET,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  copyBlock: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "flex-start",
    backgroundColor: BG,
  },
  lead: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 48,
  },
  body: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  ctaPulseShell: {
    alignSelf: "stretch",
  },
  ctaOuter: {
    alignSelf: "stretch",
    borderRadius: 16,
    overflow: "hidden",
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  ctaText: {
    color: "#f8f8ff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.4,
    zIndex: 1,
  },
});
