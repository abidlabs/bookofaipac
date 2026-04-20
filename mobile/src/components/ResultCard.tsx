import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Candidate } from "../utils/fuzzyMatch";
import { colors, stanceColors } from "../theme";
import { candidateDetailUrl } from "../utils/siteLinks";

interface Props {
  candidate: Candidate;
}

export default function ResultCard({ candidate }: Props) {
  const stance = stanceColors(candidate.stanceLabel);

  const openDetail = () => {
    void Linking.openURL(candidateDetailUrl(candidate.id));
  };

  const showPositiveFunding =
    candidate.stanceLabel === "Pro-Israel" &&
    candidate.total !== null &&
    candidate.total > 0;
  const showZeroFunding =
    candidate.stanceLabel === "Pro-Palestine" ||
    (candidate.total !== null && !Number.isNaN(candidate.total) && candidate.total === 0);
  const showFundingRow = showPositiveFunding || showZeroFunding;

  return (
    <View style={[styles.card, { borderColor: stance.border }]}>
      <View style={[styles.stanceBadge, { backgroundColor: stance.bg, borderColor: stance.border }]}>
        <Text style={[styles.stanceText, { color: stance.text }]}>
          {candidate.stanceLabel}
        </Text>
      </View>

      <Text style={styles.name}>{candidate.name}</Text>

      <Text style={styles.office}>
        {candidate.party} — {candidate.office}
      </Text>

      {showFundingRow && (
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Israel lobby funding</Text>
          <Text style={[styles.amountValue, { color: stance.text }]}>
            {showPositiveFunding ? candidate.totalDisplay : "$0"}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={openDetail} activeOpacity={0.7}>
        <Text style={styles.linkText}>View full profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 16,
  },
  stanceBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  stanceText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  office: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    color: colors.textDim,
    fontSize: 14,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  linkButton: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  linkText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
});
