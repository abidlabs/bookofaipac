import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ScanScreen from "./src/screens/ScanScreen";
import BallotForStateScreen from "./src/screens/BallotForStateScreen";
import type { RootStackParamList } from "./src/navigation/types";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BallotForState" component={BallotForStateScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
