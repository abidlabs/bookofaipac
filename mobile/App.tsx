import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ScanScreen from "./src/screens/ScanScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ScanScreen />
    </SafeAreaProvider>
  );
}
