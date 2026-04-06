import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface Props {
  scanning: boolean;
  scanMode: "auto" | "manual";
}

export default function InstructionsCard({ scanning, scanMode }: Props) {
  const autoBody =
    scanMode === "auto"
      ? "Auto mode searches until it locks onto matching names. Hold the phone steady for a moment."
      : "Manual mode: tap Scan when names are in frame.";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ScanAIPAC</Text>
      <Text style={styles.body}>
        Point your camera at names on a ballot, flyer, or screen. {autoBody}
      </Text>
      <Text style={styles.privacy}>Text is recognized on your device. Camera images are not uploaded.</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, scanning ? styles.dotActive : styles.dotIdle]} />
        <Text style={styles.statusText}>
          {scanning
            ? scanMode === "auto"
              ? "Searching for names..."
              : "Ready — tap Scan"
            : "Camera starting..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginHorizontal: 16,
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  privacy: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 20,
    opacity: 0.9,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.stanceGreen,
  },
  dotIdle: {
    backgroundColor: colors.textDim,
  },
  statusText: {
    color: colors.textDim,
    fontSize: 13,
  },
});
