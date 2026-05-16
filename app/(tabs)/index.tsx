import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { MAP_HTML } from "@/constants/mapHtml";
import { useLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:5000";

export default function MapScreen() {
  const webRef = useRef<WebView>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentNoiseClass, setCommentNoiseClass] = useState("");
  const [commentNoiseLevel, setCommentNoiseLevel] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const { lastLocation, isAcquiring } = useLocation();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { t } = useLanguage();

  const finalHtml = MAP_HTML.replace(
    /const API_URL = ['"].*?['"];/,
    `const API_URL = '${API_URL}';`,
  );

  const sendGoto = (lat: number, lon: number, label: string, zoom = 14) => {
    webRef.current?.injectJavaScript(`
      handleMessage(${JSON.stringify(
        JSON.stringify({ type: "goto", lat, lon, label, zoom }),
      )});
    `);
  };

  const locateMe = async () => {
    if (lastLocation) {
      sendGoto(
        lastLocation.coords.latitude,
        lastLocation.coords.longitude,
        t('map.youAreHere'),
        16,
      );
    } else {
      Alert.alert(
        isAcquiring ? t('map.acquiring') : t('map.locationNotAvailable')
      );
    }
  };

  // ── Comment submission ──
  const handleAddComment = async () => {
    if (!lastLocation || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await api.addComment({
        latitude: lastLocation.coords.latitude,
        longitude: lastLocation.coords.longitude,
        text: commentText.trim(),
        noiseClass: commentNoiseClass || undefined,
        noiseLevelDba: commentNoiseLevel ? parseFloat(commentNoiseLevel) : undefined,
      });
      Alert.alert(t('map.commentAdded'), t('map.commentAddedMessage'));
      setCommentText("");
      setCommentNoiseClass("");
      setCommentNoiseLevel("");
      setCommentModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const isLocationReady = lastLocation != null;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <WebView
        ref={webRef}
        style={[styles.map, { backgroundColor: colors.backgroundColor }]}
        source={{ html: finalHtml }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />

      {/* Add comment button – only visible if logged in */}
      {user && (
        <TouchableOpacity
          style={[
            styles.commentBtn,
            !isLocationReady && styles.commentBtnDisabled,
            { backgroundColor: isLocationReady ? "#22c55e" : "#555" },
          ]}
          onPress={() => {
            if (isLocationReady) setCommentModalVisible(true);
            else Alert.alert(t('map.locationRequired'), t('map.locationRequiredMessage'));
          }}
          disabled={!isLocationReady}
        >
          <Text style={styles.commentBtnText}>💬</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.locateBtn}
        onPress={locateMe}
        disabled={lastLocation == null}
      >
        {lastLocation == null ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.locateBtnText}>◎</Text>
        )}
      </TouchableOpacity>

      {/* Comment input modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg || colors.inputBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textColor }]}>{t('map.addComment')}</Text>

            <TextInput
              style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('map.commentPlaceholder')}
              placeholderTextColor={colors.placeholderColor}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <Text style={[styles.label, { color: colors.placeholderColor }]}>{t('map.noiseClassLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('map.noiseClassPlaceholder')}
              placeholderTextColor={colors.placeholderColor}
              value={commentNoiseClass}
              onChangeText={setCommentNoiseClass}
            />

            <Text style={[styles.label, { color: colors.placeholderColor }]}>{t('map.noiseLevelLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('map.noiseLevelPlaceholder')}
              placeholderTextColor={colors.placeholderColor}
              value={commentNoiseLevel}
              onChangeText={setCommentNoiseLevel}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.isDark ? "#444" : "#d1d5db" }]}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textColor }]}>{t('map.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !commentText.trim() && styles.disabledBtn,
                  { backgroundColor: commentText.trim() ? "#22c55e" : "#555" },
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('map.post')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Floating buttons ──
  commentBtn: {
    position: "absolute",
    bottom: 106,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  commentBtnDisabled: {
    opacity: 0.6,
  },
  commentBtnText: {
    fontSize: 24,
    color: "#fff",
  },
  locateBtn: {
    position: "absolute",
    bottom: 36,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  locateBtnText: { color: "#fff", fontSize: 24, lineHeight: 28 },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  commentInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontWeight: "500",
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});