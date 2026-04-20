import React, { type ReactElement } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ListRenderItem,
} from "react-native";
import { Candidate } from "../utils/fuzzyMatch";
import { colors, stanceColors } from "../theme";
import { candidateDetailUrl } from "../utils/siteLinks";

interface Props {
  candidates: Candidate[];
  listFooterComponent?: ReactElement | null;
}

function openDetail(candidate: Candidate) {
  void Linking.openURL(candidateDetailUrl(candidate.id));
}

function CandidateRow({ candidate }: { candidate: Candidate }) {
  const stance = stanceColors(candidate.stanceLabel);
  const showPositiveFunding =
    candidate.stanceLabel === "Pro-Israel" &&
    candidate.total !== null &&
    candidate.total > 0;
  const showZeroFunding =
    candidate.stanceLabel === "Pro-Palestine" ||
    (candidate.total !== null && !Number.isNaN(candidate.total) && candidate.total === 0);
  const showFundingRow = showPositiveFunding || showZeroFunding;

  return (
    <TouchableOpacity
      style={[styles.row, { borderLeftColor: stance.border }]}
      onPress={() => openDetail(candidate)}
      activeOpacity={0.75}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <View style={[styles.stanceBadge, { backgroundColor: stance.bg, borderColor: stance.border }]}>
            <Text style={[styles.stanceText, { color: stance.text }]} numberOfLines={1}>
              {candidate.stanceLabel}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {candidate.name}
          </Text>
        </View>
        <Text style={styles.office} numberOfLines={2}>
          {candidate.party} — {candidate.office}
        </Text>
        <View style={styles.linkButton}>
          <Text style={styles.linkText}>View profile</Text>
        </View>
      </View>
      {showFundingRow && (
        <View style={styles.amountColumn}>
          <Text style={[styles.amountValue, { color: stance.text }]} numberOfLines={1}>
            {showPositiveFunding ? candidate.totalDisplay : "$0"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ResultsList({ candidates, listFooterComponent }: Props) {
  const renderItem: ListRenderItem<Candidate> = ({ item }) => <CandidateRow candidate={item} />;

  const header = (
    <Text style={styles.header}>
      {candidates.length === 1 ? "1 match" : `${candidates.length} matches`}
    </Text>
  );

  return (
    <FlatList
      data={candidates}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={listFooterComponent ?? null}
      ItemSeparatorComponent={Separator}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  list: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stanceBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: "42%",
    marginRight: 8,
  },
  stanceText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  office: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  },
  amountColumn: {
    marginLeft: 10,
    maxWidth: "42%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  linkButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 2,
  },
  linkText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
});
