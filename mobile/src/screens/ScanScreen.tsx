import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  TouchableOpacity,
  Pressable,
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
import WordmarkOverlay from "../components/WordmarkOverlay";
import StatePickerModal from "../components/StatePickerModal";
import { resolveStateFromLocation } from "../utils/resolveStateFromLocation";
import { clearOnboardingComplete } from "../utils/onboardingStorage";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const VIEWFINDER_INSET = 28;

const AUTO_OCR_GAP_MS = 400;
const MANUAL_SCAN_SWEEP_MS = 520;
const AUTO_PREVIEW_MAX_LEN = 15;

function previewSnippet(t: string, max: number): string {
  const s = t.replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
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
  const [cameraLayoutH, setCameraLayoutH] = useState(300);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    const active = scanning && !frozen && scanMode === "auto" && ocrSupported;
    if (!active) {
      progressAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, frozen, scanMode, ocrSupported, progressAnim]);

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

  const onWordmarkLongPress = useCallback(async () => {
    await clearOnboardingComplete();
    navigation.reset({
      index: 0,
      routes: [{ name: "Landing" }],
    });
  }, [navigation]);

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

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(cameraLayoutH - VIEWFINDER_INSET * 2 - 4, 0)],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["12%", "88%"],
  });

  const showScanLine =
    scanning &&
    !frozen &&
    (scanMode === "auto" || (scanMode === "manual" && ocrBusy));
  const searchingActive = scanning && !frozen;
  const showScanningStatus =
    searchingActive && (scanMode === "auto" ? ocrSupported : true) && (scanMode === "auto" || ocrBusy);
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onLongPress={onWordmarkLongPress}
          delayLongPress={500}
          style={styles.headerWordmarkPress}
          accessibilityLabel="ScanAIPAC"
          accessibilityHint="Long press to open welcome screen"
        >
          <WordmarkOverlay fontSize={36} style={styles.headerWordmark} />
        </Pressable>
        {!frozen && <InstructionsCard scanMode={scanMode} />}
        <View style={styles.toolbar}>
          {frozen ? (
            <TouchableOpacity onPress={resetSearchState} activeOpacity={0.7}>
              <Text style={styles.resetLinkText}>Scan again</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modeToggle} accessibilityRole="tablist">
              <TouchableOpacity
                style={[styles.modeSegment, scanMode === "auto" && styles.modeSegmentOn]}
                onPress={() => {
                  setScanMode("auto");
                  resetSearchState();
                }}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: scanMode === "auto" }}
              >
                <Text style={[styles.modeLabel, scanMode === "auto" && styles.modeLabelOn]}>Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeSegment, scanMode === "manual" && styles.modeSegmentOn]}
                onPress={() => {
                  setScanMode("manual");
                  resetSearchState();
                }}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: scanMode === "manual" }}
              >
                <Text style={[styles.modeLabel, scanMode === "manual" && styles.modeLabelOn]}>Manual</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            onPress={onBallotForStatePress}
            disabled={ballotLoading}
            activeOpacity={0.7}
            style={styles.ballotLink}
          >
            {ballotLoading ? (
              <ActivityIndicator color={colors.textDim} size="small" />
            ) : (
              <View style={styles.ballotRow}>
                <Ionicons name="map-outline" size={17} color={colors.textDim} />
                <Text style={styles.ballotLinkText}>State Ballot</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[styles.cameraWrap, frozen && styles.cameraWrapFrozen]}
        onLayout={(e) => setCameraLayoutH(e.nativeEvent.layout.height)}
      >
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
        <View style={[styles.viewfinder, { top: VIEWFINDER_INSET, bottom: VIEWFINDER_INSET, left: VIEWFINDER_INSET, right: VIEWFINDER_INSET }]}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          {showScanLine && (
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]}
            />
          )}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          frozen && styles.footerExpanded,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {frozen && matches.length > 0 ? (
          <View style={styles.resultArea}>
            <ResultsList candidates={matches} />
          </View>
        ) : frozen && manualNoMatchOcr !== null ? (
          <View style={styles.noMatchWrap}>
            <Text style={styles.noMatchTitle}>No match found</Text>
            <ScrollView style={styles.noMatchScroll} contentContainerStyle={styles.noMatchScrollContent}>
              <Text style={styles.noMatchOcr} selectable>
                {manualNoMatchOcr.trim() ? manualNoMatchOcr : "(No text detected)"}
              </Text>
            </ScrollView>
          </View>
        ) : (
          <>
            {showScanningStatus && (
              <Text style={styles.scanningLabel}>
                {ocrBusy ? "SCANNING…" : scanMode === "auto" ? "SCANNING…" : "READY"}
              </Text>
            )}
            {!scanning && (
              <Text style={styles.scanningLabel}>Starting camera…</Text>
            )}
            {scanMode === "auto" && searchingActive && ocrSupported && (
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            )}
            {scanMode === "auto" && searchingActive && ocrSupported && autoOcrPreview ? (
              <Animated.Text
                style={[styles.livePreview, { opacity: previewPulseAnim }]}
                numberOfLines={1}
              >
                {autoOcrPreview}
              </Animated.Text>
            ) : null}
            {scanMode === "manual" && searchingActive && (
              <TouchableOpacity
                style={[styles.scanBtn, (!ocrSupported || ocrBusy) && styles.scanBtnDisabled]}
                onPress={onManualScan}
                disabled={!ocrSupported || ocrBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.scanBtnText}>{ocrBusy ? "SCANNING…" : "SCAN"}</Text>
              </TouchableOpacity>
            )}
            {!ocrSupported && (
              <Text style={styles.ocrUnsupported}>
                OCR requires a physical device build — not available in this environment.
              </Text>
            )}
          </>
        )}
      </View>
      <StatePickerModal
        visible={statePickerVisible}
        onClose={() => setStatePickerVisible(false)}
        onSelect={(code) => openBallot(code)}
      />
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 2;
const cornerBase = {
  position: "absolute" as const,
  width: CORNER_SIZE,
  height: CORNER_SIZE,
  borderColor: colors.text,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    alignItems: "center",
    paddingBottom: 10,
  },
  headerWordmarkPress: {
    alignSelf: "center",
    marginBottom: -2,
  },
  headerWordmark: {
    alignSelf: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    alignSelf: "stretch",
    width: "100%",
    paddingLeft: 12,
    paddingRight: 22,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 6,
    padding: 2,
  },
  modeSegment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  modeSegmentOn: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  modeLabel: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  modeLabelOn: {
    color: colors.text,
    fontWeight: "700",
  },
  resetLinkText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  cameraWrap: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#000",
    minHeight: 200,
  },
  cameraWrapFrozen: {
    flex: 0,
    height: 200,
    minHeight: 0,
  },
  viewfinder: {
    position: "absolute",
    pointerEvents: "none",
  },
  lockedBanner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.stanceRed,
    opacity: 0.85,
    shadowColor: colors.stanceRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  cornerTL: {
    ...cornerBase,
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    ...cornerBase,
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    ...cornerBase,
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    ...cornerBase,
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 32,
    minHeight: 140,
  },
  footerExpanded: {
    flex: 1,
  },
  scanningLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  progressTrack: {
    width: "72%",
    maxWidth: 280,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.textDim,
    borderRadius: 2,
  },
  livePreview: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 14,
    maxWidth: "90%",
    textAlign: "center",
  },
  scanBtn: {
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scanBtnDisabled: {
    opacity: 0.4,
  },
  scanBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  ballotLink: {
    paddingVertical: 6,
    justifyContent: "center",
    marginLeft: "auto",
  },
  ballotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ballotLinkText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: "600",
  },
  resultArea: {
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
    minHeight: 120,
  },
  noMatchWrap: {
    alignSelf: "stretch",
    width: "100%",
    paddingHorizontal: 8,
  },
  noMatchTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  noMatchScroll: {
    maxHeight: 120,
  },
  noMatchScrollContent: {
    paddingHorizontal: 4,
  },
  noMatchOcr: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      default: { fontFamily: "monospace" },
    }),
  },
  ocrUnsupported: {
    color: colors.stanceRed,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    textAlign: "center",
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
