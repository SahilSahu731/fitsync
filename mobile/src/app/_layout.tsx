import "../../global.css";

import {
  Stack,
} from "expo-router";

import {
  StatusBar,
} from "expo-status-bar";

import {
  AppProvider,
} from "@/providers/app-provider";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar
        style="light"
      />

      <Stack
        screenOptions={{
          headerShown: false,

          contentStyle: {
            backgroundColor: "#080808",
          },
        }}
      >
        <Stack.Screen
          name="(auth)"
        />
      </Stack>
    </AppProvider>
  );
}