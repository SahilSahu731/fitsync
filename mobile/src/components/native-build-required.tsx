import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { C } from "@/src/constants/theme";

export function NativeBuildRequired({ missing }: { missing: string[] }) {
  return (
    <SafeAreaView
      style={styles.screen}
      onLayout={() => { void SplashScreen.hideAsync().catch(console.warn); }}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.brand}>FITSYNC</Text>
        <Text accessibilityRole="header" style={styles.title}>Update FitSync to continue</Text>
        <Text style={styles.message}>
          Install the latest app build to enable secure sign-in and profile photos.
        </Text>
        {__DEV__ ? (
          <Text selectable style={styles.details}>
            Missing: {missing.join(", ")}.{"\n\n"}
            Build and install a new Android development client, then run:{"\n"}
            npm start -- --dev-client --clear
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, justifyContent: "center" },
  content: { padding: 28, gap: 18 },
  brand: { color: C.brand, fontWeight: "800", fontSize: 18, letterSpacing: 2 },
  title: { color: C.ink, fontSize: 30, fontWeight: "700" },
  message: { color: C.muted, fontSize: 16, lineHeight: 24 },
  details: { color: C.muted, fontSize: 13, lineHeight: 21 }
});
