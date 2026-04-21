import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { extractTextFromImage, isSupported as ocrSupported } from "expo-text-extractor";
import { getMatcher, refreshInBackground } from "../utils/dataStore";
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

const AUTO_OCR_GAP_MS = 400;
const MANUAL_SCAN_SWEEP_MS = 520;
const AUTO_PREVIEW_MAX_LEN = 15;

function previewSnippet(t: string, max: number): string {
  const s = t.replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
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
  const [ocrBusy, setOcrBusy] = useState(false);
  const [manualNoMatchOcr, setManualNoMatchOcr] = useState<string | null>(null);
  const [autoOcrPreview, setAutoOcrPreview] = useState("");
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const previewPulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);

  const lastSigRef = useRef("");
  const stableCountRef = useRef(0);
  const processingRef = useRef(false);
  const autoOcrSessionRef = useRef(0);
  const scanningRef = useRef(false);
  const frozenRef = useRef(false);
  const scanModeRef = useRef<"auto" | "manual">("auto");

  scanningRef.current = scanning;
  frozenRef.current = frozen;
  scanModeRef.current = scanMode;

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
    setManualNoMatchOcr(null);
    setAutoOcrPreview("");
    lastSigRef.current = "";
    stableCountRef.current = 0;
  }, []);

  const runOcrPipeline = useCallback((ocrText: string): boolean => {
    const matcher = getMatcher();
    const found = matcher.matchAll(ocrText);
    const sig = found
      .map((m) => m.id)
      .sort()
      .join(",");

    if (found.length === 0) {
      lastSigRef.current = "";
      stableCountRef.current = 0;
      return false;
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
      setManualNoMatchOcr(null);
      return true;
    }
    return false;
  }, []);

  const captureAndRecognize = useCallback(async (): Promise<string> => {
    const cam = cameraRef.current;
    if (!cam) return "";
    const photo = await cam.takePictureAsync({
      quality: 0.45,
      skipProcessing: false,
      shutterSound: false,
    });
    const lines = await extractTextFromImage(photo.uri);
    return lines.join("\n");
  }, []);

  useEffect(() => {
    if (!scanning || frozen || scanMode !== "auto" || !ocrSupported) {
      autoOcrSessionRef.current += 1;
      return;
    }
    autoOcrSessionRef.current += 1;
    const session = autoOcrSessionRef.current;

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const runLoop = async () => {
      while (session === autoOcrSessionRef.current) {
        if (!scanningRef.current || scanModeRef.current !== "auto") break;
        if (processingRef.current) {
          await sleep(120);
          continue;
        }
        const cam = cameraRef.current;
        if (!cam) {
          await sleep(350);
          continue;
        }
        processingRef.current = true;
        setOcrBusy(true);
        let didFreeze = false;
        try {
          const text = await captureAndRecognize();
          setAutoOcrPreview(previewSnippet(text, AUTO_PREVIEW_MAX_LEN));
          didFreeze = runOcrPipeline(text);
        } catch {
          // ignore failed capture or OCR
        } finally {
          processingRef.current = false;
          setOcrBusy(false);
        }
        if (session !== autoOcrSessionRef.current || didFreeze) break;
        await sleep(AUTO_OCR_GAP_MS);
      }
    };

    void runLoop();
    return () => {
      autoOcrSessionRef.current += 1;
    };
  }, [scanning, frozen, scanMode, ocrSupported, captureAndRecognize, runOcrPipeline]);

  useEffect(() => {
    const active = scanning && !frozen && scanMode === "auto";
    if (!active) return;
    scanLineAnim.setValue(0);
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
  }, [scanning, frozen, scanMode, scanLineAnim]);

  useEffect(() => {
    const active = scanning && !frozen && scanMode === "auto" && ocrSupported;
    if (!active) {
      previewPulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(previewPulseAnim, {
          toValue: 0.48,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(previewPulseAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      previewPulseAnim.setValue(1);
    };
  }, [scanning, frozen, scanMode, ocrSupported, previewPulseAnim]);

  const onManualScan = useCallback(async () => {
    if (!ocrSupported || processingRef.current) return;
    if (!cameraRef.current) return;
    scanLineAnim.setValue(0);
    Animated.timing(scanLineAnim, {
      toValue: 1,
      duration: MANUAL_SCAN_SWEEP_MS,
      useNativeDriver: true,
    }).start();
    processingRef.current = true;
    setOcrBusy(true);
    try {
      const text = await captureAndRecognize();
      const found = getMatcher().matchAll(text);
      if (found.length > 0) {
        setMatches(found);
        setFrozen(true);
        setManualNoMatchOcr(null);
      } else {
        setMatches([]);
        setFrozen(true);
        setManualNoMatchOcr(text);
      }
    } catch {
      // ignore
    } finally {
      processingRef.current = false;
      setOcrBusy(false);
    }
  }, [captureAndRecognize]);

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
            ScanAIPAC needs camera access to read text from printed material. Recognition runs on your device; camera
            images are not uploaded.
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

  const showScanLine =
    scanning &&
    !frozen &&
    (scanMode === "auto" || (scanMode === "manual" && ocrBusy));
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

        {ocrBusy && (
          <View style={styles.ocrBusyPill}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.ocrBusyText}>Reading…</Text>
          </View>
        )}

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
        ) : frozen && manualNoMatchOcr !== null ? (
          <View style={styles.noMatchWrap}>
            <Text style={styles.noMatchTitle}>No matching candidates found</Text>
            <Text style={styles.noMatchHint}>Text read from image:</Text>
            <ScrollView style={styles.noMatchScroll} contentContainerStyle={styles.noMatchScrollContent}>
              <Text style={styles.noMatchOcr} selectable>
                {manualNoMatchOcr.trim() ? manualNoMatchOcr : "(No text detected)"}
              </Text>
            </ScrollView>
          </View>
        ) : (
          <>
            <InstructionsCard scanning={searchingActive} scanMode={scanMode} />
            {scanMode === "auto" && searchingActive && ocrSupported && (
              <View style={styles.autoPreviewWrap}>
                <View style={styles.autoPreviewRow}>
                  <Text style={styles.autoPreviewPrefix} numberOfLines={1}>
                    Searching for names:{" "}
                  </Text>
                  <Animated.Text
                    style={[styles.autoPreviewValue, { opacity: previewPulseAnim }]}
                    numberOfLines={1}
                  >
                    {autoOcrPreview || "—"}
                  </Animated.Text>
                </View>
              </View>
            )}
            {!ocrSupported && (
              <Text style={styles.ocrUnsupported}>
                Text recognition is not available in this environment. Use a development or production build on a
                physical device.
              </Text>
            )}
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
              <TouchableOpacity
                style={[styles.manualScanBtn, (!ocrSupported || ocrBusy) && styles.manualScanBtnDisabled]}
                onPress={onManualScan}
                disabled={!ocrSupported || ocrBusy}
                activeOpacity={0.85}
              >
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
  autoPreviewWrap: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  autoPreviewPrefix: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 0,
    letterSpacing: 0.2,
  },
  autoPreviewValue: {
    flex: 1,
    minWidth: 0,
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  noMatchWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noMatchTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  noMatchHint: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 8,
  },
  noMatchScroll: {
    flexGrow: 0,
    maxHeight: 220,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noMatchScrollContent: {
    padding: 12,
  },
  noMatchOcr: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      default: { fontFamily: "monospace" },
    }),
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
  manualScanBtnDisabled: {
    opacity: 0.45,
  },
  ocrBusyPill: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(12,12,14,0.88)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ocrBusyText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  ocrUnsupported: {
    color: colors.stanceRed,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 24,
    marginBottom: 8,
    textAlign: "center",
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
