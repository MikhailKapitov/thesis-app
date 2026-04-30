import { useEffect, useRef, useState, useCallback } from "react";
import {
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
} from "@notifee/react-native";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { useLocation } from "@/context/LocationContext";

const COUNTDOWN_SEC = 5;
const RECORD_DURATION_MS = 2000;
const CHANNEL_ID = "recorder";

const randomStr = (len = 4) =>
  Math.random()
    .toString(36)
    .slice(2, 2 + len);
const formatTimestamp = (date: Date) =>
  date.toISOString().replace(/\..+/, "").replace(/:/g, "-");

export default function RecorderScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [logs, setLogs] = useState<string[]>([]);

  const isRecordingRef = useRef(false);
  const isPreparedRef = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const { lastLocation, isAcquiring } = useLocation();

  const log = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }, []);

  const prepare = useCallback(async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      isPreparedRef.current = true;
    } catch (e: any) {
      isPreparedRef.current = false;
      log(`⚠️ Prepare failed: ${e.message}`);
    }
  }, [audioRecorder, log]);

  const triggerRecording = useCallback(async () => {
    if (!isPreparedRef.current) {
      log("⚠️ Recorder not ready — attempting re‑prepare…");
      await prepare();
      if (!isPreparedRef.current) {
        log("❌ Re‑prepare failed, skipping this cycle");
        return;
      }
    }

    isRecordingRef.current = true;
    isPreparedRef.current = false;
    log(`▶ Recording for ${RECORD_DURATION_MS / 1000}s…`);

    try {
      // Grab the latest location from the context (this will be fresh now).
      const location = lastLocation;
      if (!location) {
        log(`⚠️ Location unavailable ${isAcquiring ? "(acquiring…)" : ""}`);
      }

      audioRecorder.record();
      await new Promise((res) => setTimeout(res, RECORD_DURATION_MS));

      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      } else {
        log("⚠️ Recorder stopped unexpectedly");
      }

      const uri = audioRecorder.uri;

      // Re‑prepare for the next cycle.
      prepare();

      if (!uri) {
        log("⚠️ No URI after stop — skipping save");
        return;
      }

      const lat = location?.coords.latitude.toFixed(6) ?? null;
      const lon = location?.coords.longitude.toFixed(6) ?? null;
      const accuracy = location?.coords.accuracy ?? null;

      const coordStr = lat && lon ? `${lat}_${lon}` : "unknown";
      const filename = `noiseapp_${coordStr}_${formatTimestamp(new Date())}_${randomStr()}.wav`;
      const dest = FileSystem.cacheDirectory + filename;

      await FileSystem.copyAsync({ from: uri, to: dest });
      const asset = await MediaLibrary.createAssetAsync(dest);
      const album = await MediaLibrary.getAlbumAsync("NoiseApp");
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
      } else {
        await MediaLibrary.createAlbumAsync("NoiseApp", asset, true);
      }
      await FileSystem.deleteAsync(dest, { idempotent: true });

      log(`✅ Saved: ${filename}`);
      if (lat && lon) {
        log(
          `📍 ${lat}, ${lon}${accuracy != null ? ` (±${accuracy.toFixed(0)}m)` : ""}`,
        );
      }
    } catch (e: any) {
      log(`❌ ${e.message}`);
    } finally {
      isRecordingRef.current = false;
    }
  }, [lastLocation, isAcquiring, audioRecorder, log, prepare]);

  // Keep a ref to the latest triggerRecording to avoid stale closures in the interval.
  const triggerRecordingRef = useRef(triggerRecording);
  useEffect(() => {
    triggerRecordingRef.current = triggerRecording;
  }, [triggerRecording]);

  // Request permissions specific to this screen.
  useEffect(() => {
    (async () => {
      await AudioModule.requestRecordingPermissionsAsync();
      await MediaLibrary.requestPermissionsAsync();

      if (Platform.OS === "android" && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      await notifee.createChannel({
        id: CHANNEL_ID,
        name: "Recorder",
        importance: AndroidImportance.MIN,
      });

      await prepare();
    })();
  }, [prepare]);

  // Countdown timer.
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Use the ref to always call the latest triggerRecording.
          if (!isRecordingRef.current) triggerRecordingRef.current();
          return COUNTDOWN_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const toggle = async () => {
    if (!isRunning) {
      setCountdown(COUNTDOWN_SEC);
      setIsRunning(true);
      await notifee.displayNotification({
        title: "Periodic Recorder",
        body: `Recording every ${COUNTDOWN_SEC} seconds…`,
        android: {
          channelId: CHANNEL_ID,
          asForegroundService: true,
          foregroundServiceTypes: [
            AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION,
          ],
          ongoing: true,
          pressAction: { id: "default" },
        },
      });
    } else {
      setIsRunning(false);
      await notifee.stopForegroundService();
    }
  };

  const locationStatus = lastLocation
    ? "📍 Ready"
    : isAcquiring
      ? "🔄 Acquiring GPS…"
      : "⚠️ No location";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Periodic Recorder</Text>
      <Text style={styles.locationStatus}>{locationStatus}</Text>

      {isRunning && (
        <View style={styles.timerBox}>
          <Text style={styles.timerNumber}>{countdown}</Text>
          <Text style={styles.timerLabel}>
            {isRecordingRef.current
              ? "🔴 Recording…"
              : "seconds until next recording"}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, isRunning && styles.btnStop]}
        onPress={toggle}
      >
        <Text style={styles.btnText}>{isRunning ? "Stop" : "Start"}</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.logBox}
        contentContainerStyle={styles.logContent}
      >
        {logs.length === 0 ? (
          <Text style={styles.logEmpty}>Logs will appear here…</Text>
        ) : (
          logs.map((l, i) => (
            <Text key={i} style={styles.logLine}>
              {l}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: "#0f0f0f",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 8 },
  locationStatus: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 24,
    fontFamily: "monospace",
  },
  timerBox: { alignItems: "center", marginBottom: 32 },
  timerNumber: {
    fontSize: 80,
    fontWeight: "200",
    color: "#fff",
    lineHeight: 88,
  },
  timerLabel: { fontSize: 14, color: "#888", marginTop: 4 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 50,
    backgroundColor: "#2563eb",
    marginBottom: 32,
  },
  btnStop: { backgroundColor: "#dc2626" },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  logBox: {
    width: "100%",
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
  },
  logContent: { gap: 4 },
  logLine: { color: "#ccc", fontFamily: "monospace", fontSize: 12 },
  logEmpty: { color: "#444", fontSize: 13, textAlign: "center", marginTop: 16 },
});
