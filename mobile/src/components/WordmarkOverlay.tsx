import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { colors } from "../theme";

interface Props {
  style?: TextStyle;
  fontSize?: number;
}

export default function WordmarkOverlay({ style, fontSize = 34 }: Props) {
  return <Text style={[styles.wordmark, { fontSize }, style]}>ScanAIPAC</Text>;
}

const styles = StyleSheet.create({
  wordmark: {
    color: colors.text,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
