import { DEFAULT_MAP_CENTER } from './data.js';
import { floodPins, getFloodStatus } from './store.js';
import { isSupabaseConfigured } from './supabase-client.js';
import { escapeHtml } from './utils.js';

const mapInstances = new Map();
const pendingMaps = new WeakSet();
let leafletPromise;

function getGeoapifyApiKey() {
  const apiKey = window.CMB_GEOAPIFY_CONFIG?.apiKey;
  return typeof apiKey === 'string' && apiKey.length > 0 && !apiKey.includes('YOUR_') ? apiKey : '';
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'node_modules/leaflet/dist/leaflet.js';
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error('Leaflet did not load correctly.'));
    };
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error('โหลดไลบรารีแผนที่ไม่สำเร็จ'));
    };
    document.head.append(script);
  });
  return leafletPromise;
}

function isValidLocation(pin) {
  return Number.isFinite(pin.latitude) && pin.latitude >= -90 && pin.latitude <= 90
    && Number.isFinite(pin.longitude) && pin.longitude >= -180 && pin.longitude <= 180;
}

function pinsForMap(element) {
  return element.dataset.mapPublic === 'true' && isSupabaseConfigured()
    ? floodPins.filter((pin) => pin.verified)
    : floodPins;
}

function showMapError(canvas, message) {
  if (canvas.querySelector('.geoapify-map-error')) return;
  const errorPanel = document.createElement('div');
  errorPanel.className = 'geoapify-map-error';
  errorPanel.setAttribute('role', 'status');
  errorPanel.innerHTML = `
    <strong>โหลดแผนที่ไม่สำเร็จ</strong>
    <p>${escapeHtml(message)}</p>
    <button class="button button-primary button-small" type="button" data-action="manual-flood-report">กรอกพิกัดด้วยตนเอง</button>`;
  canvas.append(errorPanel);
}

function createMarkerIcon(L, status) {
  return L.divIcon({
    className: 'flood-marker-icon',
    html: `<span class="flood-map-marker ${status.className}"><span></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function clearMarkers(instance) {
  instance.markers.clearLayers();
}

function renderMarkers(instance, pins, onPinClick) {
  clearMarkers(instance);
  pins.filter(isValidLocation).forEach((pin) => {
    const status = getFloodStatus(pin.status);
    const verification = pin.verified ? 'ยืนยันแล้ว' : 'รอตรวจสอบ';
    const marker = window.L.marker([pin.latitude, pin.longitude], {
      icon: createMarkerIcon(window.L, status),
      title: `${pin.area} · ${status.label} · ${verification}`,
      keyboard: true,
    });
    marker.on('click', () => onPinClick(pin.id));
    instance.markers.addLayer(marker);
  });
}

async function createMap(element, onMapPick, onPinClick) {
  const canvas = element.querySelector('.geoapify-map-canvas');
  if (!canvas) return;

  const apiKey = getGeoapifyApiKey();
  if (!apiKey) {
    showMapError(canvas, 'กรุณาตั้งค่า Geoapify API key ใน geoapify-config.js');
    return;
  }

  try {
    const L = await loadLeaflet();
    if (!element.isConnected || element.getClientRects().length === 0) return;
    canvas.querySelector('.geoapify-map-error')?.remove();

    const map = L.map(canvas, {
      zoomControl: element.dataset.mapInteractive !== 'false',
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], Number(element.dataset.mapZoom) || 12);
    const markers = L.layerGroup().addTo(map);
    const instance = { element, canvas, map, markers, visible: true };
    const tileLayer = L.tileLayer(
      `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`,
      {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>',
      },
    );
    tileLayer.once('tileerror', () => {
      showMapError(canvas, 'ตรวจสอบ Geoapify API key, สิทธิ์ Map Tiles และข้อจำกัด HTTP referrer');
    });
    tileLayer.addTo(map);

    if (element.dataset.mapInteractive !== 'false') {
      map.on('click', (event) => {
        onMapPick({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
    }
    mapInstances.set(element.id, instance);
    renderMarkers(instance, pinsForMap(element), onPinClick);
  } catch (error) {
    console.error('Unable to initialize Geoapify map:', error);
    showMapError(canvas, error.message || 'ตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง');
  }
}

function removeMap(instance) {
  clearMarkers(instance);
  instance.map.remove();
}

export function syncGeoapifyMaps({ onMapPick, onPinClick } = {}) {
  const elements = [...document.querySelectorAll('[data-flood-map]')];
  const connectedIds = new Set(elements.map((element) => element.id));
  mapInstances.forEach((instance, id) => {
    if (!connectedIds.has(id) || document.getElementById(id) !== instance.element) {
      removeMap(instance);
      mapInstances.delete(id);
    }
  });

  elements.forEach((element) => {
    if (!element.id) return;
    if (element.getClientRects().length === 0) {
      const hiddenInstance = mapInstances.get(element.id);
      if (hiddenInstance) hiddenInstance.visible = false;
      return;
    }

    const existing = mapInstances.get(element.id);
    if (!existing) {
      if (pendingMaps.has(element)) return;
      pendingMaps.add(element);
      void createMap(element, onMapPick, onPinClick).finally(() => pendingMaps.delete(element));
      return;
    }
    if (!existing.visible) {
      existing.visible = true;
      window.requestAnimationFrame(() => existing.map.invalidateSize());
    }
    renderMarkers(existing, pinsForMap(element), onPinClick);
  });
}

export function focusGeoapifyMap({ lat, lng, source }) {
  const mapId = source === 'admin' ? 'admin-flood-map' : 'public-flood-map';
  const instance = mapInstances.get(mapId);
  if (instance) instance.map.setView([lat, lng], Math.max(instance.map.getZoom(), 15));
}
