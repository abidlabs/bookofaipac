import * as Location from "expo-location";
import { regionStringToStateCode } from "./states";

export async function resolveStateFromLocation(): Promise<string | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const results = await Location.reverseGeocodeAsync({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  });

  const result = results[0];
  if (!result) return null;

  if (result.isoCountryCode && result.isoCountryCode !== "US") {
    return null;
  }

  const fromRegion = regionStringToStateCode(result.region);
  if (fromRegion) return fromRegion;

  return regionStringToStateCode(result.subregion);
}
