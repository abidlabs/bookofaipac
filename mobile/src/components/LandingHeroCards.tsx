import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  ImageSourcePropType,
} from "react-native";
import { colors, stanceColors } from "../theme";

const CARD_WIDTH = 152;
const CARD_HEIGHT = 64;
const SCAN_MS = 1200;

type Placement = {
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
};

interface ShowcaseCandidate {
  name: string;
  district: string;
  funding: string;
  stanceLabel: "Pro-Israel" | "Pro-Palestine";
  image: ImageSourcePropType;
  placement: Placement;
}

const SHOWCASE: ShowcaseCandidate[] = [
  {
    name: "Chuck Schumer",
    district: "NY Senate",
    funding: "$6.5M",
    stanceLabel: "Pro-Israel",
    image: require("../../assets/candidates/chuck-schumer-ny-sen.webp"),
    placement: { top: "12%", left: "6%" },
  },
  {
    name: "Hakeem Jeffries",
    district: "NY-08",
    funding: "$5.5M",
    stanceLabel: "Pro-Israel",
    image: require("../../assets/candidates/hakeem-jeffries-ny-h-08.webp"),
    placement: { top: "25%", right: "5%" },
  },
  {
    name: "Rashida Tlaib",
    district: "MI-12",
    funding: "$0",
    stanceLabel: "Pro-Palestine",
    image: require("../../assets/candidates/rashida-tlaib-mi-h-12.webp"),
    placement: { bottom: "17%", left: "18%" },
  },
];

function cardTopPx(placement: Placement, heroH: number): number {
  if (placement.top) {
    return (parseFloat(placement.top) / 100) * heroH;
  }
  if (placement.bottom) {
    return heroH * (1 - parseFloat(placement.bottom) / 100) - CARD_HEIGHT;
  }
  return 0;
}

function HeroCard({
  candidate,
  scanAnim,
  heroH,
}: {
  candidate: ShowcaseCandidate;
  scanAnim: Animated.Value;
  heroH: number;
}) {
  const stance = stanceColors(candidate.stanceLabel);
  const topPx = cardTopPx(candidate.placement, heroH);
  const startP = heroH > 0 ? topPx / heroH : 0;
  const endP = heroH > 0 ? Math.min(1, (topPx + CARD_HEIGHT) / heroH) : 0;

  const clipHeight = scanAnim.interpolate({
    inputRange: [0, startP, endP, 1],
    outputRange: [0, 0, CARD_HEIGHT, CARD_HEIGHT],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.cardSlot, candidate.placement]} pointerEvents="none">
      <Animated.View style={[styles.cardClip, { height: clipHeight }]}>
        <View style={styles.cardInner}>
          <View
            style={[
              styles.card,
              { borderColor: stance.border, backgroundColor: "rgba(12, 12, 14, 0.88)" },
            ]}
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
        </View>
      </Animated.View>
    </View>
  );
}

export default function LandingHeroCards() {
  const [heroH, setHeroH] = useState(0);
  const [scanFinished, setScanFinished] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (heroH <= 0) return;
    const scan = Animated.timing(scanAnim, {
      toValue: 1,
      duration: SCAN_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    scan.start(({ finished }) => {
      if (finished) setScanFinished(true);
    });
    return () => scan.stop();
  }, [heroH, scanAnim]);

  const scanLineTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(heroH - 2, 0)],
  });

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}
    >
      {heroH > 0 &&
        SHOWCASE.map((candidate) => (
          <HeroCard key={candidate.name} candidate={candidate} scanAnim={scanAnim} heroH={heroH} />
        ))}
      {heroH > 0 && !scanFinished && (
        <Animated.View style={[styles.scanLine, { top: scanLineTop }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.stanceRed,
    opacity: 0.75,
    shadowColor: colors.stanceRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    zIndex: 5,
  },
  cardSlot: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardClip: {
    width: CARD_WIDTH,
    overflow: "hidden",
  },
  cardInner: {
    height: CARD_HEIGHT,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
