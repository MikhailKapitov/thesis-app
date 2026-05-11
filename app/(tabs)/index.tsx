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
// import { Picker } from "@react-native-picker/picker";
import { WebView } from "react-native-webview";
import { MAP_HTML } from "@/constants/mapHtml";
import { useLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:5000";

export default function MapScreen() {
  const webRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentNoiseClass, setCommentNoiseClass] = useState("");
  const [commentNoiseLevel, setCommentNoiseLevel] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const { lastLocation, isAcquiring } = useLocation();
  const { user } = useAuth(); // needed to ensure user is logged in

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
        "You are here",
        16,
      );
    } else {
      Alert.alert(
        isAcquiring ? "Still acquiring GPS signal…" : "Location not available",
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
      Alert.alert("Comment added", "Your comment has been posted.");
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
    <View style={styles.container}>
      <WebView
        ref={webRef}
        style={styles.map}
        source={{ html: finalHtml }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />

      {/* Add comment button – only visible if logged in */}
      {user && (
        <TouchableOpacity
          style={[styles.commentBtn, !isLocationReady && styles.commentBtnDisabled]}
          onPress={() => {
            if (isLocationReady) setCommentModalVisible(true);
            else Alert.alert("Location required", "Wait for a GPS fix before adding a comment.");
          }}
          disabled={!isLocationReady}
        >
          <Text style={styles.commentBtnText}>💬</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.locateBtn}
        onPress={locateMe}
        disabled={locating}
      >
        {locating ? (
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Comment</Text>

            <TextInput
              style={styles.commentInput}
              placeholder="What do you want to say about this location?"
              placeholderTextColor="#888"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <Text style={styles.label}>Noise class (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. traffic, music"
              placeholderTextColor="#888"
              value={commentNoiseClass}
              onChangeText={setCommentNoiseClass}
            />

            {/* <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={commentNoiseClass}
                onValueChange={setCommentNoiseClass}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="None" value="" />
                <Picker.Item label="Traffic" value="traffic" />
                <Picker.Item label="Construction" value="construction" />
                <Picker.Item label="Voices" value="voices" />
                <Picker.Item label="Music" value="music" />
                <Picker.Item label="Nature" value="nature" />
                <Picker.Item label="Siren" value="siren" />
                <Picker.Item label="Industrial" value="industrial" />
              </Picker>
            </View> */}

            <Text style={styles.label}>Noise level (dB, optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 72.5"
              placeholderTextColor="#888"
              value={commentNoiseLevel}
              onChangeText={setCommentNoiseLevel}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, !commentText.trim() && styles.disabledBtn]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Post</Text>
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
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  map: { flex: 1, backgroundColor: "#0f0f0f" },

  // ── Floating buttons ──
  commentBtn: {
    position: "absolute",
    bottom: 106,   // right above the locate button
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  commentBtnDisabled: {
    backgroundColor: "#555",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    color: "#fff",
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
    backgroundColor: "#444",
  },
  cancelBtnText: {
    color: "#fff",
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#22c55e",
  },
  disabledBtn: {
    backgroundColor: "#555",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});