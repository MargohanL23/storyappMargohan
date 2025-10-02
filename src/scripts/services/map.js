import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let mapInstance = null;
let markersLayer = null;
const markerIndex = [];

// === Default Leaflet Marker Icon ===
function ensureDefaultIcon() {
  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  L.Marker.prototype.options.icon = defaultIcon;
}

// === INIT MAP ===
function initMap(containerId, { center = [0, 0], zoom = 2, withLayerControl = true } = {}) {
  ensureDefaultIcon();

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Map container #${containerId} not found`);
    return null;
  }

  // Bersihkan map sebelumnya (jika ada)
  if (mapInstance) {
    try {
      mapInstance.off();
      mapInstance.remove();
    } catch (e) {
      console.warn('Error cleaning old map:', e);
    }
    mapInstance = null;
  }

  // Buat instance baru tanpa tile layer terlebih dahulu
  mapInstance = L.map(containerId, { preferCanvas: true, center, zoom });

  // Base layers
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  });

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  });

  // Tambah default layer (street)
  street.addTo(mapInstance);

  // Layer group untuk marker
  markersLayer = L.layerGroup().addTo(mapInstance);
  markerIndex.length = 0;

  // Layer control jika diminta
  if (withLayerControl) {
    const baseMaps = {
      'Street': street,
      'Satellite': satellite
    };
    L.control.layers(baseMaps).addTo(mapInstance);
  }

  // Fix ukuran container supaya map tampil benar setelah render
  setTimeout(() => {
    try { mapInstance.invalidateSize(); } catch (e) {/* ignore */ }
  }, 100);

  return mapInstance;
}

// === ADD MARKER ===
function addMarker({ id = null, lat, lon, popupHtml = '' }) {
  if (!markersLayer || !mapInstance) return null;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const marker = L.marker([lat, lon]).addTo(markersLayer);

  if (popupHtml) {
    marker.bindPopup(popupHtml);
  }

  markerIndex.push({ id, marker, popupHtml });
  return marker;
}

// === CLEAR MARKERS ===
function clearMarkers() {
  if (markersLayer) markersLayer.clearLayers();
  markerIndex.length = 0;
}

// === OPEN MARKER BY ID ===
function openMarkerForId(id) {
  const rec = markerIndex.find((r) => r.id === id);
  if (rec && mapInstance) {
    mapInstance.setView(rec.marker.getLatLng(), Math.max(mapInstance.getZoom(), 8), { animate: true });
    rec.marker.openPopup();
  }
}

// === HANDLE MAP CLICK ===
function onMapClick(callback) {
  if (mapInstance) {
    mapInstance.on('click', (e) => {
      callback(e.latlng);

      // Tambahkan marker otomatis tiap klik (hanya 1 marker)
      clearMarkers();
      addMarker({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        popupHtml: `Lokasi dipilih:<br>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`
      });
    });
  }
}

// === FIT MAP TO MARKERS ===
function fitMarkers() {
  if (!markersLayer || markerIndex.length === 0 || !mapInstance) return;
  const group = L.featureGroup(markerIndex.map((m) => m.marker));
  mapInstance.fitBounds(group.getBounds().pad(0.2));
}

export {
  initMap,
  addMarker,
  clearMarkers,
  onMapClick,
  openMarkerForId,
  fitMarkers,
};
