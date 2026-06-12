// modules/admin.js - Admin Dashboard Module for Smart Turkistan
import { api } from '../api.js';
import { MapModule } from './map.js';

export const AdminModule = {
  init() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const form = document.getElementById('admin-place-form');
    const cancelBtn = document.getElementById('admin-cancel-btn');

    if (!form) return;

    // 1. Admin Tab Navigation
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.getAttribute('data-admin-tab');
        this.switchTab(tabName);
      });
    });

    // 2. Form Submit (Create or Update)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.savePlace();
    });

    // 3. Cancel Button Click
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.resetForm();
        this.switchTab('places-list');
      });
    }

    // Initial table load
    this.loadPlacesTable();
  },

  switchTab(tabName) {
    // Buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tabName);
    });

    // Contents
    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `admin-tab-${tabName}`);
    });

    if (tabName === 'places-list') {
      this.loadPlacesTable();
    }
  },

  async loadPlacesTable() {
    const tbody = document.getElementById('admin-places-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Жүктелуде...</td></tr>`;

    try {
      const places = await api.getPlaces("", "all");
      
      if (places.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Орындар табылмады.</td></tr>`;
        return;
      }

      tbody.innerHTML = places.map(p => `
        <tr>
          <td><b>${p.id}</b></td>
          <td>${p.name}</td>
          <td><span class="category-badge" style="position: static; font-size: 9px;">${p.category}</span></td>
          <td>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</td>
          <td class="actions">
            <button class="btn btn-sm btn-outline edit-place-btn" data-id="${p.id}"><i data-lucide="edit-2" style="width: 12px; height: 12px;"></i> Өңдеу</button>
            <button class="btn btn-sm btn-danger delete-place-btn" data-id="${p.id}"><i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Өшіру</button>
          </td>
        </tr>
      `).join('');

      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Action Listeners
      tbody.querySelectorAll('.edit-place-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          this.editPlace(id);
        });
      });

      tbody.querySelectorAll('.delete-place-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm("Бұл орынды өшіруді растайсыз ба?")) {
            this.deletePlace(id);
          }
        });
      });

    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-danger)">Жүктеу қатесі!</td></tr>`;
    }
  },

  async editPlace(id) {
    try {
      const place = await api.getPlaceById(id);
      
      document.getElementById('admin-place-id').value = place.id;
      document.getElementById('admin-place-name').value = place.name;
      document.getElementById('admin-place-category').value = place.category;
      document.getElementById('admin-place-description').value = place.description;
      document.getElementById('admin-place-lat').value = place.lat;
      document.getElementById('admin-place-lng').value = place.lng;
      document.getElementById('admin-place-image').value = place.images[0];

      document.getElementById('admin-form-title').innerText = "Орынды өңдеу (ID: " + place.id + ")";
      document.getElementById('admin-save-btn').innerText = "Жаңарту";

      this.switchTab('place-form-tab');

    } catch (error) {
      alert("Орын мәліметін жүктеу мүмкін болмады: " + error.message);
    }
  },

  async deletePlace(id) {
    try {
      await api.deletePlace(id);
      
      // Refresh Map, table and trigger custom events
      MapModule.reloadMarkers();
      this.loadPlacesTable();
      
      // Dispatch event to refresh places grids elsewhere
      document.dispatchEvent(new Event('places-updated'));
      
      alert("Орын сәтті өшірілді.");
    } catch (error) {
      alert("Өшіру қатесі: " + error.message);
    }
  },

  async savePlace() {
    const id = document.getElementById('admin-place-id').value;
    const name = document.getElementById('admin-place-name').value.trim();
    const category = document.getElementById('admin-place-category').value;
    const description = document.getElementById('admin-place-description').value.trim();
    const lat = parseFloat(document.getElementById('admin-place-lat').value);
    const lng = parseFloat(document.getElementById('admin-place-lng').value);
    const image = document.getElementById('admin-place-image').value.trim();

    const placeData = { name, category, description, lat, lng, images: [image] };

    try {
      if (id) {
        // Edit Mode
        await api.updatePlace(id, placeData);
        alert("Орын сәтті жаңартылды.");
      } else {
        // Create Mode
        await api.addPlace(placeData);
        alert("Жаңа орын сәтті қосылды.");
      }

      this.resetForm();
      this.switchTab('places-list');
      
      // Reload markers and notify places views
      MapModule.reloadMarkers();
      document.dispatchEvent(new Event('places-updated'));

    } catch (error) {
      alert("Сақтау мүмкін болмады: " + error.message);
    }
  },

  resetForm() {
    document.getElementById('admin-place-id').value = "";
    document.getElementById('admin-place-form').reset();
    document.getElementById('admin-form-title').innerText = "Жаңа туристік орын қосу";
    document.getElementById('admin-save-btn').innerText = "Сақтау";
  }
};
