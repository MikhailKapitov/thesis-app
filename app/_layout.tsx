import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import notifee from "@notifee/react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

console.log("Registering foreground service...");
notifee.registerForegroundService(() => {
  console.log("Foreground service handler called!");
  return new Promise(() => {});
});

// This component handles protected routes
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated and trying to access auth screens
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f0f0f",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LocationProvider>
      <AuthProvider>
        <AuthGuard>
          <RootLayoutNav />
        </AuthGuard>
      </AuthProvider>
    </LocationProvider>
  );
}
