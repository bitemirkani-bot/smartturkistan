// modules/nearby.js - Nearby Places Module for Smart Turkistan
import { api } from '../api.js';
import { userLocation, MapModule } from './map.js';

let activeCategory = 'all';
let activeRadius = 5;

export const NearbyModule = {
  init() {
    const listContainer = document.getElementById('nearby-list');
    const radiusSelect = document.getElementById('nearby-radius');
    const filters = document.querySelectorAll('.nearby-filters button');

    if (!listContainer) return;

    // 1. Listen for radius selector changes
    if (radiusSelect) {
      radiusSelect.addEventListener('change', (e) => {
        activeRadius = parseInt(e.target.value);
        this.loadNearby();
      });
    }

    // 2. Listen for filter button clicks
    filters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCategory = e.target.getAttribute('data-nearby');
        this.loadNearby();
      });
    });

    // 3. Listen for GPS marker drag changes
    document.addEventListener('gps-updated', () => {
      this.loadNearby();
    });

    // Initial load
    this.loadNearby();
  },

  async loadNearby() {
    const listContainer = document.getElementById('nearby-list');
    if (!listContainer) return;

    listContainer.innerHTML = `<div class="sub-text" style="padding: 10px; text-align: center;">Жүктелуде...</div>`;

    try {
      const places = await api.getNearby(
        userLocation.lat,
        userLocation.lng,
        activeRadius,
        activeCategory
      );

      if (places.length === 0) {
        listContainer.innerHTML = `
          <div class="sub-text" style="padding: 16px; text-align: center; font-size: 11px;">
            Бұл радиуста нысандар табылмады.
          </div>
        `;
        return;
      }

      listContainer.innerHTML = places.map(place => {
        let categoryEmoji = '📍';
        if (place.category === 'food') categoryEmoji = '🍔';
        else if (place.category === 'hotel') categoryEmoji = '🏨';
        else if (place.category === 'pharmacy') categoryEmoji = '💊';

        return `
          <div class="nearby-card" data-id="${place.id}" data-lat="${place.lat}" data-lng="${place.lng}" data-name="${place.name}">
            <img class="nearby-img" src="${place.images[0]}" alt="${place.name}">
            <div class="nearby-info">
              <span class="nearby-title">${place.name}</span>
              <span class="nearby-dist">${categoryEmoji} ${place.distance} км қашықтықта</span>
            </div>
            <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: var(--color-text-muted);"></i>
          </div>
        `;
      }).join('');

      // Refresh lucide icons inside nearby cards
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Add click listener to focus on map
      listContainer.querySelectorAll('.nearby-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const currentTarget = e.currentTarget;
          const lat = parseFloat(currentTarget.getAttribute('data-lat'));
          const lng = parseFloat(currentTarget.getAttribute('data-lng'));
          const name = currentTarget.getAttribute('data-name');
          
          MapModule.focusPlace(lat, lng, name);
        });
      });

    } catch (error) {
      console.error("Error loading nearby places:", error);
      listContainer.innerHTML = `<p class="error-text">Жүктеу қатесі.</p>`;
    }
  }
};
