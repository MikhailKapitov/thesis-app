const {
  withAndroidManifest,
  withProjectBuildGradle,
} = require("@expo/config-plugins");

module.exports = (config) => {
  // ── 1. Patch build.gradle with local notifee maven repo ──────────────────
  config = withProjectBuildGradle(config, (config) => {
    if (
      !config.modResults.contents.includes("@notifee/react-native/android/libs")
    ) {
      config.modResults.contents = config.modResults.contents.replace(
        `maven { url 'https://www.jitpack.io' }`,
        `maven { url 'https://www.jitpack.io' }\n        maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`,
      );
    }
    return config;
  });

  // ── 2. Patch AndroidManifest.xml ─────────────────────────────────────────
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    // Add tools namespace
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    // Notifee foreground service with microphone + location types
    if (!application.service) application.service = [];
    const existing = application.service.find(
      (s) => s.$?.["android:name"] === "app.notifee.core.ForegroundService",
    );
    if (existing) {
      existing.$["android:foregroundServiceType"] = "microphone|location";
      existing.$["tools:replace"] = "android:foregroundServiceType";
    } else {
      application.service.push({
        $: {
          "android:name": "app.notifee.core.ForegroundService",
          "android:foregroundServiceType": "microphone|location",
          "tools:replace": "android:foregroundServiceType",
        },
      });
    }

    // Background location permission
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const hasBackgroundLocation = manifest["uses-permission"].some(
      (p) =>
        p.$?.["android:name"] ===
        "android.permission.ACCESS_BACKGROUND_LOCATION",
    );
    if (!hasBackgroundLocation) {
      manifest["uses-permission"].push({
        $: { "android:name": "android.permission.ACCESS_BACKGROUND_LOCATION" },
      });
    }

    // Inject Google Maps API key placeholder so react-native-maps doesn't crash
    if (!application["meta-data"]) application["meta-data"] = [];
    const googleMapsEntry = application["meta-data"].find(
      (m) => m.$?.["android:name"] === "com.google.android.geo.API_KEY",
    );
    if (googleMapsEntry) {
      googleMapsEntry.$["android:value"] = "placeholder";
    } else {
      application["meta-data"].push({
        $: {
          "android:name": "com.google.android.geo.API_KEY",
          "android:value": "placeholder",
        },
      });
    }

    return config;
  });

  return config;
};
