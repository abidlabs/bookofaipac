import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getMatcher, refreshInBackground, getCandidates } from "../utils/dataStore";
import { Candidate } from "../utils/fuzzyMatch";
import ResultsList from "../components/ResultsList";
import InstructionsCard from "../components/InstructionsCard";
import StatePickerModal from "../components/StatePickerModal";
import { resolveStateFromLocation } from "../utils/resolveStateFromLocation";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_H } = Dimensions.get("window");
const CAMERA_RATIO = 0.5;

const NOISE_WORDS = [
  "the",
  "and",
  "vote",
  "paid",
  "elect",
  "district",
  "november",
  "official",
  "ballot",
  "measure",
  "candidate",
  "primary",
  "general",
];

function randomNoiseOcr(): string {
  return Array.from(
    { length: 6 + Math.floor(Math.random() * 5) },
    () => NOISE_WORDS[Math.floor(Math.random() * NOISE_WORDS.length)]
  ).join(" ");
}

function multiNameOcr(): string {
  const all = getCandidates();
  const picks: Candidate[] = [];
  const seen = new Set<string>();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  for (const c of shuffled) {
    const parts = c.name.trim().split(/\s+/);
    if (parts.length >= 2 && !seen.has(c.id)) {
      seen.add(c.id);
      picks.push(c);
      if (picks.length >= 4) break;
    }
  }
  if (picks.length === 0) return all.slice(0, 3).map((c) => c.name).join("\n");
  return picks.map((c) => c.name).join("\n");
}

function generateRandomOcr(): string {
  if (Math.random() < 0.74) return randomNoiseOcr();
  return multiNameOcr();
}

export default function ScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<"auto" | "manual">("auto");
  const [frozen, setFrozen] = useState(false);
  const [matches, setMatches] = useState<Candidate[]>([]);
  const [scanning, setScanning] = useState(false);
  const [ballotLoading, setBallotLoading] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);

  const repeatOcrRef = useRef<string | null>(null);
  const lastSigRef = useRef("");
  const stableCountRef = useRef(0);

  useEffect(() => {
    refreshInBackground();
  }, []);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam || !scanning) return;
    if (frozen) {
      void cam.pausePreview().catch(() => {});
    } else {
      void cam.resumePreview().catch(() => {});
    }
  }, [frozen, scanning]);

  const resetSearchState = useCallback(() => {
    setFrozen(false);
    setMatches([]);
    repeatOcrRef.current = null;
    lastSigRef.current = "";
    stableCountRef.current = 0;
  }, []);

  const runOcrPipeline = useCallback(
    (ocrText: string) => {
      const matcher = getMatcher();
      const found = matcher.matchAll(ocrText);
      const sig = found
        .map((m) => m.id)
        .sort()
        .join(",");

      if (found.length === 0) {
        lastSigRef.current = "";
        stableCountRef.current = 0;
        return;
      }

      if (sig === lastSigRef.current) {
        stableCountRef.current += 1;
      } else {
        lastSigRef.current = sig;
        stableCountRef.current = 1;
      }

      if (stableCountRef.current >= 2) {
        setMatches(found);
        setFrozen(true);
        repeatOcrRef.current = null;
      }
    },
    []
  );

  const autoTick = useCallback(() => {
    if (frozen) return;

    let ocr: string;
    if (repeatOcrRef.current !== null) {
      ocr = repeatOcrRef.current;
      repeatOcrRef.current = null;
    } else {
      ocr = generateRandomOcr();
      const trial = getMatcher().matchAll(ocr);
      if (trial.length > 0) {
        repeatOcrRef.current = ocr;
      }
    }

    runOcrPipeline(ocr);
  }, [frozen, runOcrPipeline]);

  useEffect(() => {
    if (!scanning || frozen || scanMode !== "auto") return;
    const id = setInterval(autoTick, 680);
    return () => clearInterval(id);
  }, [scanning, frozen, scanMode, autoTick]);

  useEffect(() => {
    const active = scanning && !frozen;
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, frozen, scanLineAnim]);

  const onManualScan = useCallback(() => {
    const ocr = multiNameOcr();
    const found = getMatcher().matchAll(ocr);
    if (found.length > 0) {
      setMatches(found);
      setFrozen(true);
    }
  }, []);

  const onCameraReady = useCallback(() => {
    setScanning(true);
  }, []);

  const openBallot = useCallback(
    (stateCode: string) => {
      navigation.navigate("BallotForState", { stateCode: stateCode.toUpperCase() });
    },
    [navigation]
  );

  const onBallotForStatePress = useCallback(async () => {
    setBallotLoading(true);
    try {
      const code = await resolveStateFromLocation();
      if (code) {
        openBallot(code);
      } else {
        setStatePickerVisible(true);
      }
    } finally {
      setBallotLoading(false);
    }
  }, [openBallot]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permCard}>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permBody}>
            ScanAIPAC needs camera access to scan candidate names from printed text.
          </Text>
          <Text style={styles.permButton} onPress={requestPermission}>
            Grant Camera Access
          </Text>
        </View>
      </View>
    );
  }

  const cameraHeight = SCREEN_H * CAMERA_RATIO;
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cameraHeight - 4],
  });

  const showScanLine = scanning && !frozen;
  const searchingActive = scanning && !frozen;

  return (
    <View style={styles.container}>
      <View style={[styles.cameraWrap, { height: cameraHeight }]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={onCameraReady}
        />
        {frozen && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
        {showScanLine && (
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]}
          />
        )}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        <View style={styles.modeBar}>
          {frozen ? (
            <TouchableOpacity style={styles.resetChip} onPress={resetSearchState} activeOpacity={0.75}>
              <Text style={styles.resetChipText}>Reset</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.modeChip, scanMode === "auto" && styles.modeChipOn]}
                onPress={() => {
                  setScanMode("auto");
                  resetSearchState();
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modeChipText, scanMode === "auto" && styles.modeChipTextOn]}>Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, scanMode === "manual" && styles.modeChipOn]}
                onPress={() => {
                  setScanMode("manual");
                  resetSearchState();
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modeChipText, scanMode === "manual" && styles.modeChipTextOn]}>
                  Manual
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.resultWrap}>
        {frozen && matches.length > 0 ? (
          <ResultsList candidates={matches} />
        ) : (
          <>
            <InstructionsCard scanning={searchingActive} scanMode={scanMode} />
            <TouchableOpacity
              style={[styles.ballotBtn, ballotLoading && styles.ballotBtnDisabled]}
              onPress={onBallotForStatePress}
              disabled={ballotLoading}
              activeOpacity={0.85}
            >
              {ballotLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <View style={styles.ballotBtnRow}>
                  <Ionicons name="map-outline" size={20} color={colors.text} />
                  <Text style={styles.ballotBtnText}>Ballot for your State</Text>
                </View>
              )}
            </TouchableOpacity>
            {scanMode === "manual" && searchingActive && (
              <TouchableOpacity style={styles.manualScanBtn} onPress={onManualScan} activeOpacity={0.85}>
                <Text style={styles.manualScanText}>Scan</Text>
              </TouchableOpacity>
            )}
            <StatePickerModal
              visible={statePickerVisible}
              onClose={() => setStatePickerVisible(false)}
              onSelect={(code) => openBallot(code)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;
const cornerBase = {
  position: "absolute" as const,
  width: CORNER_SIZE,
  height: CORNER_SIZE,
  borderColor: colors.accent,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  cameraWrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  lockedBanner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 12,
  },
  lockedText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    backgroundColor: "rgba(12,12,14,0.85)",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.45,
    borderRadius: 1,
  },
  cornerTL: {
    ...cornerBase,
    top: 12,
    left: 12,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    ...cornerBase,
    top: 12,
    right: 12,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    ...cornerBase,
    bottom: 12,
    left: 12,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    ...cornerBase,
    bottom: 12,
    right: 12,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  modeBar: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  modeChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(12,12,14,0.75)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipOn: {
    borderColor: colors.accent,
    backgroundColor: "rgba(125, 160, 255, 0.2)",
  },
  modeChipText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  modeChipTextOn: {
    color: colors.accent,
  },
  resetChip: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(125, 160, 255, 0.22)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resetChipText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  resultWrap: {
    flex: 1,
    paddingTop: 12,
  },
  manualScanBtn: {
    marginHorizontal: 32,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "rgba(125, 160, 255, 0.18)",
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
  },
  manualScanText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "700",
  },
  ballotBtn: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  ballotBtnDisabled: {
    opacity: 0.7,
  },
  ballotBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ballotBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  permText: {
    color: colors.textDim,
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
  permCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  permBody: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permButton: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    overflow: "hidden",
  },
});
