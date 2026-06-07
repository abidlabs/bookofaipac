import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface Props {
  scanMode: "auto" | "manual";
}

export default function InstructionsCard({ scanMode }: Props) {
  const text =
    scanMode === "auto"
      ? "Point your camera at names on a ballot or flyer. Auto-scans on your device, no data is uploaded."
      : "Point your camera at names on a ballot or flyer. Tap Scan when ready, no data is uploaded.";

  return <Text style={styles.instructions}>{text}</Text>;
}

const styles = StyleSheet.create({
  instructions: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
});
