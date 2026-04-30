import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { MAP_HTML } from "@/constants/mapHtml";
import { useLocation } from "@/context/LocationContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:5000";

export default function MapScreen() {
  const webRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);

  // Inject the API_URL into the HTML before loading.
  // This replaces the placeholder in the HTML's <script> block.
  // USELESS RN BTW.
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
  const { lastLocation, isAcquiring } = useLocation();

  const locateMe = async () => {
    if (lastLocation) {
      sendGoto(
        lastLocation.coords.latitude,
        lastLocation.coords.longitude,
        "You are here",
        16,
      );
    } else {
      // Optionally show a toast: "Waiting for GPS fix..."
      alert(
        isAcquiring ? "Still acquiring GPS signal…" : "Location not available",
      );
    }
  };

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  map: { flex: 1, backgroundColor: "#0f0f0f" },
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
});
