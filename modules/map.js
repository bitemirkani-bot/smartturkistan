// modules/map.js - Leaflet.js Map Module for Smart Turkistan
import { api } from '../api.js';

let map = null;
let markersLayer = null;
let routeLine = null;

// Simulated user GPS location (starts near Karavansaray)
export let userLocation = {
  lat: 43.2900,
  lng: 68.2650,
  marker: null
};

// Custom Marker Icons (using Leaflet DivIcon for premium styling)
function createCustomMarkerIcon(category, number = null) {
  let color = '#06b6d4'; // default turquoise
  let emoji = '📍';
  
  if (category === 'historical') {
    color = '#ef4444'; // red
    emoji = '🕌';
  } else if (category === 'cultural') {
    color = '#10b981'; // green
    emoji = '🏛️';
  } else if (category === 'leisure') {
    color = '#f59e0b'; // gold
    emoji = '🎡';
  } else if (category === 'hotel') {
    color = '#a855f7'; // purple
    emoji = '🏨';
  } else if (category === 'food') {
    color = '#ec4899'; // pink
    emoji = '🍔';
  } else if (category === 'pharmacy') {
    color = '#06b6d4'; // teal
    emoji = '💊';
  }

  const html = `
    <div style="
      background-color: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      position: relative;
    ">
      ${emoji}
      ${number ? `<span style="
        position: absolute;
        top: -8px;
        right: -8px;
        background: #fff;
        color: #000;
        border: 1px solid ${color};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      ">${number}</span>` : ''}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

export const MapModule = {
  init() {
    if (map) return;

    // 1. Initialize map centered on Turkistan
    map = L.map('map-container', {
      zoomControl: false // we will use custom styled controls or default
    }).setView([43.296, 68.270], 14);

    // 2. Add OpenStreetMap dark-themed tiles (CartoDB Dark Matter fits our premium styling!)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add zoom control back at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    
    // 3. Initialize GPS User Simulator Marker
    this.initGPSMarker();
    
    // 4. Load places from API and show on map
    this.reloadMarkers();
    
    // Trigger resize to fix leaflet gray box issue
    setTimeout(() => {
      map.invalidateSize();
    }, 400);
  },

  invalidateSize() {
    if (map) {
      map.invalidateSize();
    }
  },

  initGPSMarker() {
    const gpsIcon = L.divIcon({
      html: `
        <div class="gps-pulse-container" style="position: relative; width: 24px; height: 24px;">
          <div class="gps-pulse" style="
            position: absolute;
            width: 100%;
            height: 100%;
            background: rgba(6, 182, 212, 0.4);
            border-radius: 50%;
            animation: gps-pulse-anim 2s infinite ease-out;
          "></div>
          <div class="gps-center" style="
            position: absolute;
            top: 4px;
            left: 4px;
            width: 16px;
            height: 16px;
            background: #06b6d4;
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(0,0,0,0.5);
          "></div>
        </div>
        <style>
          @keyframes gps-pulse-anim {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        </style>
      `,
      className: 'gps-user-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    userLocation.marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: gpsIcon,
      draggable: true
    }).addTo(map);

    userLocation.marker.bindPopup("<b>Сіз осындасыз (Симулятор)</b><br>Орынды өзгерту үшін мені сүйреңіз.").openPopup();

    userLocation.marker.on('dragend', (e) => {
      const position = userLocation.marker.getLatLng();
      userLocation.lat = position.lat;
      userLocation.lng = position.lng;
      
      // Notify Nearby Module to refresh
      document.dispatchEvent(new CustomEvent('gps-updated', { detail: userLocation }));
    });
  },

  centerOnUser() {
    if (map && userLocation.marker) {
      map.setView([userLocation.lat, userLocation.lng], 15);
      userLocation.marker.openPopup();
    }
  },

  async reloadMarkers(selectedCategory = 'all', searchQuery = '') {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    try {
      const places = await api.getPlaces(searchQuery, selectedCategory);
      
      places.forEach(place => {
        const marker = L.marker([place.lat, place.lng], {
          icon: createCustomMarkerIcon(place.category)
        });

        // Popup Content
        const popupContent = document.createElement('div');
        popupContent.style.width = '200px';
        popupContent.innerHTML = `
          <h4>${place.name}</h4>
          <p>${place.description.substring(0, 80)}...</p>
          <div style="display: flex; gap: 4px; margin-top: 8px;">
            <button class="leaflet-popup-btn view-detail-btn" data-id="${place.id}">Толығырақ</button>
            <button class="leaflet-popup-btn add-to-route-btn" data-id="${place.id}" style="background: #f59e0b;">+ Маршрут</button>
          </div>
        `;

        // Bind events on popup open
        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);

        marker.on('popupopen', () => {
          // Add event listeners inside popup
          popupContent.querySelector('.view-detail-btn').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            document.dispatchEvent(new CustomEvent('open-place-detail', { detail: id }));
            map.closePopup();
          });

          popupContent.querySelector('.add-to-route-btn').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            document.dispatchEvent(new CustomEvent('add-place-to-route', { detail: id }));
            map.closePopup();
          });
        });
      });
    } catch (error) {
      console.error("Error loading map markers:", error);
    }
  },

  // Highlight and focus a specific place on map
  focusPlace(lat, lng, name) {
    if (map) {
      map.setView([lat, lng], 16);
      // Open popup if marker exists at this coordinate
      markersLayer.eachLayer(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lng) < 0.0001) {
          marker.openPopup();
        }
      });
    }
  },

  // Draw Route Polyline
  drawRoute(places) {
    if (!map) return;

    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    if (places.length < 2) return;

    const latlngs = places.map(p => [p.lat, p.lng]);
    
    // Draw route line with glowing cyan color
    routeLine = L.polyline(latlngs, {
      color: '#06b6d4',
      weight: 5,
      opacity: 0.8,
      dashArray: '10, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Fit map bounds to show the entire route
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
  },

  clearRoute() {
    if (routeLine && map) {
      map.removeLayer(routeLine);
      routeLine = null;
    }
  }
};
