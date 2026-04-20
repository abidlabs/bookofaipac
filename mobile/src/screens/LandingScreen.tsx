import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { setOnboardingComplete } from "../utils/onboardingStorage";

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
  borderColor: colors.accent,
};

export default function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();

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
        <ActivityIndicator size="large" color={colors.accent} />
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
          <Image source={heroWordmark} style={styles.heroImage} resizeMode="contain" accessibilityLabel="ScanAIPAC" />
          <View style={styles.cornerTL} pointerEvents="none" />
          <View style={styles.cornerTR} pointerEvents="none" />
          <View style={styles.cornerBL} pointerEvents="none" />
          <View style={styles.cornerBR} pointerEvents="none" />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.lead}>
          Does your candidate take money from the Israeli lobby? Scan their name to find out. 
          </Text>
          <Text style={styles.body}>
          Text recognition runs on your device. Camera images and recognized text are not uploaded or sent anywhere. Matches and results are best-effort, verify with official sources.  
          </Text>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onGrantCamera}
            style={styles.ctaOuter}
            accessibilityRole="button"
            accessibilityLabel="Grant camera access"
          >
            <Text style={styles.ctaText}>GRANT CAMERA ACCESS</Text>
          </TouchableOpacity>
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
    paddingTop: 64,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "flex-start",
    backgroundColor: BG,
  },
  lead: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 14,
  },
  body: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 28,
  },
  ctaOuter: {
    alignSelf: "stretch",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#7da0ff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5f6fd4",
    borderWidth: 1,
    borderColor: "rgba(125, 160, 255, 0.55)",
  },
  ctaText: {
    color: "#f8f8ff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
});
