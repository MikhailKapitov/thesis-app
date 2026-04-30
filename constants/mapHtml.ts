// Auto-generated from map-viewer/viewer.html – do not edit manually.
export const MAP_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <title>Noise Map (IDW)</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body,
      #map {
        width: 100%;
        height: 100%;
        background: #0f0f0f;
      }
      #loading {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(0, 0, 0, 0.6);
        color: #ccc;
        font-family: monospace;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 20px;
        z-index: 1000;
        display: none;
        pointer-events: none;
      }

      #time-panel {
        position: absolute;
        top: 48px;
        left: 12px;
        right: 12px;
        max-width: 320px;
        background: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 12px;
        border-radius: 12px;
        z-index: 1000;
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        font-size: 14px;
        backdrop-filter: blur(8px);
        border: 1px solid #444;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      #time-panel label {
        display: block;
        margin-bottom: 4px;
        color: #aaa;
        font-size: 12px;
        font-weight: 500;
      }

      .time-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .time-row input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #2563eb;
      }

      .datetime-inputs {
        display: flex;
        gap: 8px;
      }

      .datetime-inputs input {
        flex: 1;
        background: #222;
        color: white;
        border: 1px solid #555;
        padding: 10px 8px;
        border-radius: 8px;
        font-size: 15px;
        font-family: system-ui;
      }

      .datetime-inputs input:disabled {
        opacity: 0.5;
        background: #1a1a1a;
      }

      .datetime-inputs input::-webkit-calendar-picker-indicator {
        filter: invert(1);
        opacity: 0.8;
        cursor: pointer;
      }

      @media (max-width: 400px) {
        .datetime-inputs {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="loading">Loading IDW layer…</div>

    <!-- Time selection panel with separate date/time and current toggle. -->
    <div id="time-panel">
      <div class="time-row">
        <input type="checkbox" id="use-current-time" checked />
        <label for="use-current-time" style="display: inline; margin: 0"
          >🕒 Use current time</label
        >
      </div>
      <div id="manual-time-controls" style="display: none; margin-top: 10px">
        <label>📅 Date</label>
        <input type="date" id="date-picker" disabled />
        <label style="margin-top: 8px">⏰ Time</label>
        <input type="time" id="time-picker" disabled />
      </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet.idw@0.0.1/src/leaflet-idw.js"></script>

    <script>
      (function () {
        // Hard-coded (For now?).
        const PREDICTION_API_URL = "http://10.0.2.2:5000";
        const MAPPING_API_URL =
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

        // Remove these later; purely testing data.
        const FALLBACK_POINTS = [
          [43.2567, 76.9286, 0.05],
          [43.255, 76.925, 0.05],
          [43.258, 76.931, 0.05],
          [43.2195, 76.8448, 0.1],
          [43.222, 76.8512, 0.1],
          [43.235, 76.86, 0.9],
          [43.272, 76.88, 0.85],
          [43.275, 76.91, 0.1],
          [43.23, 76.96, 0.1],
          [44.23, 76.96, 0.0],
          [44.24, 76.96, 0.0],
          [44.25, 76.96, 0.0],
        ];

        const urlParams = new URLSearchParams(window.location.search);
        const startLat = parseFloat(urlParams.get("lat")) || 43.2567;
        const startLon = parseFloat(urlParams.get("lon")) || 76.9286;
        const startZoom = parseInt(urlParams.get("zoom")) || 11;

        // Disable default zoom control so we can place it elsewhere.
        const map = L.map("map", { zoomControl: false }).setView(
          [startLat, startLon],
          startZoom,
        );

        // Add zoom control at the bottom right.
        L.control.zoom({ position: "bottomleft" }).addTo(map);

        L.tileLayer(MAPPING_API_URL, {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(map);

        const idwLayer = L.idwLayer([], {
          opacity: 0.25, // Overall transparency of the overlay.
          cellSize: 15, // Resolution. Higher values look worse, but compute quicker.
          exp: 1.01, // Weighting exponent. Higher values lead to sharper, more localized "blobs".
          max: 1.0, // The maximum intensity value in the predictions.
          gradient: {
            // Custom gradient.
            0.0: "lime",
            0.4: "yellow",
            0.7: "orange",
            1.0: "red",
          },
        }).addTo(map);

        const loadingEl = document.getElementById("loading");

        // Time selection logic.
        const useCurrentCheckbox = document.getElementById("use-current-time");
        const manualControls = document.getElementById("manual-time-controls");
        const datePicker = document.getElementById("date-picker");
        const timePicker = document.getElementById("time-picker");

        // Pre‑fill the manual pickers with the current local time.
        const now = new Date();
        const localNow = new Date(
          now.getTime() - now.getTimezoneOffset() * 60000,
        );
        datePicker.value = localNow.toISOString().slice(0, 10); // YYYY-MM-DD
        timePicker.value = localNow.toISOString().slice(11, 16); // HH:MM

        // Return an ISO string with seconds based on the current selection.
        function getSelectedTimeISO() {
          if (useCurrentCheckbox.checked) {
            const d = new Date();
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 19);
          } else {
            const date = datePicker.value;
            const time = timePicker.value;
            if (!date || !time) return null;
            return \`\${date}T\${time}:00\`;
          }
        }

        // Show/hide manual controls and enable/disable the inputs.
        function toggleManualControls() {
          const isManual = !useCurrentCheckbox.checked;
          manualControls.style.display = isManual ? "block" : "none";
          datePicker.disabled = !isManual;
          timePicker.disabled = !isManual;
        }

        useCurrentCheckbox.addEventListener("change", () => {
          toggleManualControls();
          fetchDataAndUpdate(); // Immediately refresh with new time mode.
        });

        // When the user manually changes date or time, fetch fresh data after a tiny debounce.
        let timeChangeDebounce;
        function handleManualTimeChange() {
          if (useCurrentCheckbox.checked) return;
          clearTimeout(timeChangeDebounce);
          timeChangeDebounce = setTimeout(() => {
            fetchDataAndUpdate();
          }, 200);
        }
        datePicker.addEventListener("change", handleManualTimeChange);
        timePicker.addEventListener("change", handleManualTimeChange);

        // Initial state: manual controls hidden (checkbox is checked).
        toggleManualControls();

        // IDW layer update.
        function updateIDWLayer(points) {
          if (!points || points.length === 0) return;
          // Expects [lat, lng, intensity] format, which matches our data.
          idwLayer.setLatLngs(points);
        }

        // Fetch prediction data from the backend using the currently selected time.
        async function fetchDataAndUpdate() {
          const selectedTimeISO = getSelectedTimeISO();
          if (!selectedTimeISO) {
            console.warn("No valid time selected.");
            return;
          }

          loadingEl.style.display = "block";
          try {
            const bounds = map.getBounds();
            const bbox = \`\${bounds.getWest()},\${bounds.getSouth()},\${bounds.getEast()},\${bounds.getNorth()}\`;
            const url = \`\${PREDICTION_API_URL}/predict?bbox=\${bbox}&time=\${encodeURIComponent(selectedTimeISO)}\`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const geojson = await res.json();

            const points = geojson.features.map((f) => {
              const [lon, lat] = f.geometry.coordinates;
              const intensity = Math.min(
                1,
                Math.max(0, f.properties.prediction),
              );
              return [lat, lon, intensity];
            });

            currentPoints = points;
            updateIDWLayer(points);
          } catch (err) {
            console.warn("IDW fetch failed, using fallback", err);
            currentPoints = FALLBACK_POINTS;
            updateIDWLayer(FALLBACK_POINTS);
          } finally {
            loadingEl.style.display = "none";
          }
        }

        let currentPoints = FALLBACK_POINTS;

        // Debounced fetch when the user stops moving the map.
        let fetchDebounce;
        function handleMoveEnd() {
          clearTimeout(fetchDebounce);
          fetchDebounce = setTimeout(fetchDataAndUpdate, 300);
        }

        map.on("moveend", handleMoveEnd);

        // Initialise with fallback data, then fetch real data.
        map.whenReady(() => {
          updateIDWLayer(FALLBACK_POINTS);
          fetchDataAndUpdate();
        });

        // External communication (for React Native "goto" commands).
        let marker = null;
        function handleMessage(raw) {
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "goto") {
              map.setView([msg.lat, msg.lon], msg.zoom || 14);
              if (marker) marker.remove();
              marker = L.marker([msg.lat, msg.lon])
                .addTo(map)
                .bindPopup(msg.label || "")
                .openPopup();
            }
          } catch (e) {}
        }
        window.handleMessage = handleMessage;
        document.addEventListener("message", (e) => handleMessage(e.data));
        window.addEventListener("message", (e) => handleMessage(e.data));
      })();
    </script>
  </body>
</html>
`;
