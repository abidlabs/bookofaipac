import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ScanScreen from "./src/screens/ScanScreen";
import BallotForStateScreen from "./src/screens/BallotForStateScreen";
import LandingScreen from "./src/screens/LandingScreen";
import type { RootStackParamList } from "./src/navigation/types";
import { colors } from "./src/theme";
import { getOnboardingComplete } from "./src/utils/onboardingStorage";

const Stack = createNativeStackNavigator<RootStackParamList>();

const DEV_FORCE_LANDING = __DEV__ && true;

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<"Landing" | "Scan">("Landing");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (DEV_FORCE_LANDING) {
        if (!cancelled) {
          setInitialRoute("Landing");
          setReady(true);
        }
        return;
      }
      const done = await getOnboardingComplete();
      if (!cancelled) {
        setInitialRoute(done ? "Scan" : "Landing");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        {!ready ? (
          <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={initialRoute}
              screenOptions={{
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
              <Stack.Screen name="BallotForState" component={BallotForStateScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        )}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
