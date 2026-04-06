import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ListRenderItem,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { getMergedCandidates, type MergedCandidate } from "../utils/mergedCandidates";
import { invalidateCandidateData } from "../utils/dataStore";
import { resolveOfficeScope } from "../utils/officeScope";
import { getStateName } from "../utils/states";
import { colors, stanceColors, SITE_BASE_URL } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "BallotForState">;

type Section = {
  title: string;
  data: MergedCandidate[];
};

function stanceRank(label: string | undefined): number {
  switch (label) {
    case "Pro-Palestine":
      return 0;
    case "Pro-Israel":
      return 1;
    default:
      return 2;
  }
}

function sortByStanceThenName(candidates: MergedCandidate[]): MergedCandidate[] {
  return [...candidates].sort((a, b) => {
    const ra = stanceRank(a.stanceLabel);
    const rb = stanceRank(b.stanceLabel);
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  });
}

function openDetail(candidate: MergedCandidate) {
  const url = `${SITE_BASE_URL}/detail/?id=${encodeURIComponent(candidate.id)}`;
  Linking.openURL(url);
}

function BallotRow({ candidate }: { candidate: MergedCandidate }) {
  const stance = stanceColors(candidate.stanceLabel);
  const showPositiveFunding =
    typeof candidate.israelLobbyTotal === "number" &&
    !Number.isNaN(candidate.israelLobbyTotal) &&
    candidate.israelLobbyTotal > 0;
  const showZeroFunding =
    candidate.stanceLabel === "Pro-Palestine" ||
    (typeof candidate.israelLobbyTotal === "number" &&
      !Number.isNaN(candidate.israelLobbyTotal) &&
      candidate.israelLobbyTotal === 0);
  const showLobbyLine = showPositiveFunding || showZeroFunding;

  return (
    <TouchableOpacity
      style={[styles.row, { borderLeftColor: stance.border }]}
      onPress={() => openDetail(candidate)}
      activeOpacity={0.75}
    >
      <View style={styles.rowTop}>
        <View style={[styles.badge, { backgroundColor: stance.bg, borderColor: stance.border }]}>
          <Text style={[styles.badgeText, { color: stance.text }]} numberOfLines={1}>
            {candidate.stanceLabel}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {candidate.name || "—"}
        </Text>
      </View>
      <Text style={styles.office} numberOfLines={2}>
        {candidate.party || "Unknown"} — {candidate.districtOrOffice || "—"}
      </Text>
      {showLobbyLine && (
        <Text style={[styles.amount, { color: stance.text }]}>
          Lobby:{" "}
          {showPositiveFunding
            ? candidate.israelLobbyTotalDisplay || `$${candidate.israelLobbyTotal!.toLocaleString()}`
            : "$0"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function BallotForStateScreen({ route, navigation }: Props) {
  const { stateCode } = route.params;
  const upper = stateCode.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<MergedCandidate[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const merged = await getMergedCandidates();
      const filtered = merged.filter((c) => (c.state || "").toUpperCase() === upper);
      setList(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [upper]);

  useEffect(() => {
    load();
  }, [load]);

  const onRetry = useCallback(async () => {
    await invalidateCandidateData();
    load();
  }, [load]);

  const sections: Section[] = useMemo(() => {
    const senate = sortByStanceThenName(list.filter((c) => resolveOfficeScope(c) === "SENATE"));
    const house = sortByStanceThenName(list.filter((c) => resolveOfficeScope(c) === "HOUSE"));
    const other = sortByStanceThenName(
      list.filter((c) => {
        const s = resolveOfficeScope(c);
        return s !== "SENATE" && s !== "HOUSE";
      }),
    );
    const out: Section[] = [
      { title: "U.S. Senate", data: senate },
      { title: "U.S. House of Representatives", data: house },
    ];
    if (other.length > 0) {
      out.push({ title: "Other", data: other });
    }
    return out;
  }, [list]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${getStateName(upper)} · ${upper}`,
      headerTintColor: colors.accent,
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text, fontWeight: "700" },
    });
  }, [navigation, upper]);

  const renderItem: ListRenderItem<MergedCandidate> = ({ item }) => <BallotRow candidate={item} />;

  const keyExtractor = (item: MergedCandidate) => item.id;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.meta}>
        {list.length} {list.length === 1 ? "candidate" : "candidates"}
      </Text>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <Text style={styles.sectionEmpty}>No entries in this section.</Text>
          ) : null
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  meta: {
    color: colors.textDim,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: colors.bg,
  },
  sectionEmpty: {
    color: colors.textDim,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  row: {
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  badge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    maxWidth: "44%",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  office: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  amount: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: colors.textDim,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryText: {
    color: colors.accent,
    fontWeight: "700",
  },
});
