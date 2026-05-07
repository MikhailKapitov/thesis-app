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
import * as Device from "expo-device";
import notifee, {
  AndroidForegroundServiceType,
  AndroidImportance,
} from "@notifee/react-native";
import { AudioModule, RecordingPresets, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useLocation } from "@/context/LocationContext";
import { api } from "@/services/api";

const COUNTDOWN_SEC = 5;
const RECORD_DURATION_MS = 2000;
const CHANNEL_ID = "recorder";

export default function RecorderScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentMetering, setCurrentMetering] = useState(-160); // -160 dB = silence

  const isRecordingRef = useRef(false);
  const isPreparedRef = useRef(false);
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderStatus = useAudioRecorderState(audioRecorder);

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

      // Re‑prepare for the next cycle
      prepare();

      if (!uri) {
        log("⚠️ No URI after stop — upload skipped");
        return;
      }

      // Build metadata for upload
      const lat = location?.coords.latitude;
      const lon = location?.coords.longitude;
      if (lat == null || lon == null) {
        log("❌ No location data, upload skipped");
        return;
      }

      const metadata = {
        latitude: lat,
        longitude: lon,
        deviceModel: Device.modelName || "Unknown",
        recordedAt: new Date().toISOString(),
      };

      log("📤 Uploading recording…");
      try {
        const result = await api.uploadRecording(uri, metadata);
        log(`✅ Uploaded: ID ${result.id || "unknown"}`);
      } catch (uploadErr: any) {
        log(`❌ Upload failed: ${uploadErr.message}`);
      }
    } catch (e: any) {
      log(`❌ ${e.message}`);
    } finally {
      isRecordingRef.current = false;
    }
  }, [lastLocation, isAcquiring, audioRecorder, log, prepare]);

  const triggerRecordingRef = useRef(triggerRecording);
  useEffect(() => {
    triggerRecordingRef.current = triggerRecording;
  }, [triggerRecording]);

  useEffect(() => {
    (async () => {
      await AudioModule.requestRecordingPermissionsAsync();
      // MediaLibrary permissions no longer needed
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

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (!isRecordingRef.current) triggerRecordingRef.current();
          return COUNTDOWN_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    let interval: ReturnType<typeof setInterval>;
    // Start polling when a recording is actually going on
    if (recorderStatus.isRecording) {
      interval = setInterval(async () => {
        try {
          const status = await audioRecorder.getStatus();
          if (status.metering !== undefined) {
            setCurrentMetering(status.metering);
          }
        } catch {}
      }, 50); // Update delay in ms
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, recorderStatus.isRecording, audioRecorder]);

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
            {isRecordingRef.current ? (
              // Metering bar during recording
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>🔴 Recording…</Text>
                <View style={styles.meterContainer}>
                  <View style={[styles.meterBar, {
                    width: `${Math.min(100, Math.max(0, (currentMetering + 60) * 2))}%`, // maps -60..-10 dB to 0..100%
                    backgroundColor: currentMetering > -20 ? '#dc2626' : currentMetering > -40 ? '#f59e0b' : '#22c55e'
                  }]} />
                </View>
                {/* <Text style={styles.meterText}>{currentMetering.toFixed(1)} dB</Text> */}
              </View>
            ) : (
              "seconds until next recording"
            )}
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
  meterContainer: {
  width: 100,
  height: 8,
  backgroundColor: '#333',
  borderRadius: 4,
  marginVertical: 4,
  overflow: 'hidden',
  },
  meterBar: {
    height: '100%',
    borderRadius: 4,
  },
  meterText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },
});