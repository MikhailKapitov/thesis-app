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
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLanguage } from '@/context/LanguageContext';

const COUNTDOWN_SEC = 5;
const RECORD_DURATION_MS = 2000;
const CHANNEL_ID = "recorder";

export default function RecorderScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentMetering, setCurrentMetering] = useState(-160);

  const isRecordingRef = useRef(false);
  const isPreparedRef = useRef(false);
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderStatus = useAudioRecorderState(audioRecorder);

  const { lastLocation, isAcquiring } = useLocation();
  const colors = useThemeColors();
  const { t } = useLanguage();

  const log = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }, []);

  const prepare = useCallback(async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      isPreparedRef.current = true;
    } catch (e: any) {
      // If the recorder is already prepared (e.g. after a Fast Refresh), treat it as ready instead of failing.
      if (e?.message?.includes('already been prepared')) { // Yes, I hate this check.
        isPreparedRef.current = true;
        return;
      }
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

      prepare();

      if (!uri) {
        log("⚠️ No URI after stop — upload skipped");
        return;
      }

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
    // Runs only once on mount. Language changes and such should not re‑prepare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (recorderStatus.isRecording) {
      interval = setInterval(async () => {
        try {
          const status = await audioRecorder.getStatus();
          if (status.metering !== undefined) {
            setCurrentMetering(status.metering);
          }
        } catch {}
      }, 50);
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
    ? t('recorder.ready')
    : isAcquiring
      ? t('recorder.acquiring')
      : t('recorder.noLocation');

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.title, { color: colors.textColor }]}>{t('recorder.title')}</Text>
      <Text style={[styles.locationStatus, { color: colors.isDark ? '#aaa' : '#6b7280' }]}>{locationStatus}</Text>

      {isRunning && (
        <View style={styles.timerBox}>
          <Text style={[styles.timerNumber, { color: colors.textColor }]}>{countdown}</Text>
          <Text style={[styles.timerLabel, { color: colors.isDark ? '#888' : '#6b7280' }]}>
            {isRecordingRef.current ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textColor }}>{t('recorder.recording')}</Text>
                <View style={[styles.meterContainer, { backgroundColor: colors.isDark ? '#333' : '#e5e7eb' }]}>
                  <View style={[styles.meterBar, {
                    width: `${Math.min(100, Math.max(0, (currentMetering + 60) * 2))}%`,
                    backgroundColor: currentMetering > -20 ? '#dc2626' : currentMetering > -40 ? '#f59e0b' : '#22c55e'
                  }]} />
                </View>
              </View>
            ) : (
              t('recorder.secondsUntil')
            )}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, isRunning && styles.btnStop, { backgroundColor: isRunning ? '#dc2626' : colors.linkColor }]}
        onPress={toggle}
      >
        <Text style={styles.btnText}>{isRunning ? t('recorder.stop') : t('recorder.start')}</Text>
      </TouchableOpacity>

      <ScrollView
        style={[styles.logBox, { backgroundColor: colors.inputBg }]}
        contentContainerStyle={styles.logContent}
      >
        {logs.length === 0 ? (
          <Text style={[styles.logEmpty, { color: colors.isDark ? '#444' : '#9ca3af' }]}>{t('recorder.logsEmpty')}</Text>
        ) : (
          logs.map((l, i) => (
            <Text key={i} style={[styles.logLine, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>
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
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  locationStatus: {
    fontSize: 13,
    marginBottom: 24,
    fontFamily: "monospace",
  },
  timerBox: { alignItems: "center", marginBottom: 32 },
  timerNumber: {
    fontSize: 80,
    fontWeight: "200",
    lineHeight: 88,
  },
  timerLabel: { fontSize: 14, marginTop: 4 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 50,
    marginBottom: 32,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  logBox: {
    width: "100%",
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  logContent: { gap: 4 },
  logLine: { fontFamily: "monospace", fontSize: 12 },
  logEmpty: { fontSize: 13, textAlign: "center", marginTop: 16 },
  meterContainer: {
    width: 100,
    height: 8,
    borderRadius: 4,
    marginVertical: 4,
    overflow: 'hidden',
  },
  meterBar: {
    height: '100%',
    borderRadius: 4,
  },
  btnStop: { backgroundColor: '#dc2626' },
});