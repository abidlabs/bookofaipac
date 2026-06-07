import React from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType, ViewStyle } from "react-native";
import { colors, stanceColors } from "../theme";

interface ShowcaseCandidate {
  name: string;
  district: string;
  funding: string;
  stanceLabel: "Pro-Israel" | "Pro-Palestine";
  image: ImageSourcePropType;
  style: ViewStyle;
}

const SHOWCASE: ShowcaseCandidate[] = [
  {
    name: "Chuck Schumer",
    district: "NY Senate",
    funding: "$6.5M",
    stanceLabel: "Pro-Israel",
    image: require("../../assets/candidates/chuck-schumer-ny-sen.webp"),
    style: { top: "12%", left: "6%", transform: [{ rotate: "-2.5deg" }] },
  },
  {
    name: "Hakeem Jeffries",
    district: "NY-08",
    funding: "$5.5M",
    stanceLabel: "Pro-Israel",
    image: require("../../assets/candidates/hakeem-jeffries-ny-h-08.webp"),
    style: { top: "25%", right: "5%", transform: [{ rotate: "2deg" }] },
  },
  {
    name: "Rashida Tlaib",
    district: "MI-12",
    funding: "$0",
    stanceLabel: "Pro-Palestine",
    image: require("../../assets/candidates/rashida-tlaib-mi-h-12.webp"),
    style: { bottom: "17%", left: "18%", transform: [{ rotate: "-1.5deg" }] },
  },
];

function HeroCard({ candidate }: { candidate: ShowcaseCandidate }) {
  const stance = stanceColors(candidate.stanceLabel);

  return (
    <View
      style={[
        styles.card,
        { borderColor: stance.border, backgroundColor: "rgba(12, 12, 14, 0.88)" },
        candidate.style,
      ]}
      pointerEvents="none"
    >
      <Image source={candidate.image} style={styles.photo} />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {candidate.name}
        </Text>
        <Text style={styles.district} numberOfLines={1}>
          {candidate.district}
        </Text>
        <Text style={[styles.funding, { color: stance.text }]} numberOfLines={1}>
          {candidate.funding}
        </Text>
      </View>
    </View>
  );
}

export default function LandingHeroCards() {
  return (
    <View style={styles.layer} pointerEvents="none">
      {SHOWCASE.map((candidate) => (
        <HeroCard key={candidate.name} candidate={candidate} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  card: {
    position: "absolute",
    width: 152,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  photo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  district: {
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  funding: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2,
  },
});
