// app.js - Main Application Controller for Smart Turkistan
import { api } from './api.js';
import { MapModule, userLocation } from './modules/map.js';
import { WeatherModule } from './modules/weather.js';
import { NearbyModule } from './modules/nearby.js';
import { QrModule } from './modules/qr.js';
import { ChatModule } from './modules/chat.js';
import { AdminModule } from './modules/admin.js';

// Application State
let currentActiveView = 'map';
let activeRouteStops = []; // Array of place objects in current route builder

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Load Auth session if exists
  checkAuthSession();

  // 3. Setup Routing Navigation Listeners
  setupNavigation();

  // 4. Setup Authentication Modal Event Listeners
  setupAuthEvents();

  // 5. Setup Places View Event Listeners & Grid
  setupPlacesView();

  // 6. Setup Place Details Modal Event Listeners
  setupPlaceDetailModal();

  // 7. Setup Route Planner & Saved Routes
  setupRouteBuilder();

  // 8. Initialize Leaflet Map initially since it is the default page
  MapModule.init();

  // 9. Initialize Nearby Places list on map view
  NearbyModule.init();

  // 10. Listen for Global Custom Events
  setupGlobalEvents();
});

// ROUTING: Switch between tabs/views
function switchView(viewName) {
  currentActiveView = viewName;

  // Toggle active class on sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });

  // Toggle active class on navigation buttons (sidebar + mobile bar)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Perform module specific reload actions
  if (viewName === 'map') {
    MapModule.init();
    MapModule.invalidateSize();
    NearbyModule.loadNearby();
  } else if (viewName === 'places') {
    renderPlacesGrid();
  } else if (viewName === 'weather') {
    WeatherModule.render();
  } else if (viewName === 'qr') {
    QrModule.init();
  } else if (viewName === 'chat') {
    ChatModule.init();
  } else if (viewName === 'admin') {
    AdminModule.init();
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const viewName = e.currentTarget.getAttribute('data-view');
      switchView(viewName);
    });
  });

  // GPS Simulator button click
  const gpsBtn = document.getElementById('gps-simulator-btn');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      MapModule.centerOnUser();
      // Show confirmation celebration
      if (window.confetti) {
        window.confetti({ particleCount: 30, spread: 40 });
      }
    });
  }
}

// CHECK AUTH: Update UI based on session
function checkAuthSession() {
  const profileWidget = document.getElementById('user-profile');
  const loginBtn = document.getElementById('login-trigger');
  
  const user = api.getCurrentUser();

  if (api.isAuthenticated() && user) {
    // Show Profile
    profileWidget.classList.remove('hidden');
    loginBtn.classList.add('hidden');

    document.getElementById('profile-name').innerText = user.name;
    document.getElementById('profile-role').innerText = user.role === 'admin' ? 'Администратор' : 'Турист';
    document.getElementById('profile-avatar').innerText = user.name.charAt(0).toUpperCase();

    // Show Admin Nav Button if Admin
    const adminNavBtn = document.querySelector('.nav-btn.admin-only');
    if (user.role === 'admin') {
      adminNavBtn.classList.remove('hidden');
    } else {
      adminNavBtn.classList.add('hidden');
    }
  } else {
    // Show Login trigger
    profileWidget.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    document.querySelector('.nav-btn.admin-only').classList.add('hidden');
  }
}

function setupAuthEvents() {
  const loginTrigger = document.getElementById('login-trigger');
  const mobileLoginTrigger = document.getElementById('mobile-login-trigger');
  const logoutBtn = document.getElementById('logout-btn');
  const authModal = document.getElementById('auth-modal');
  const authClose = document.getElementById('auth-close-btn');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');

  const openAuth = () => {
    authModal.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    document.getElementById('auth-title').innerText = "Жүйеге кіру";
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
  };

  if (loginTrigger) loginTrigger.addEventListener('click', openAuth);
  if (mobileLoginTrigger) mobileLoginTrigger.addEventListener('click', openAuth);

  if (authClose) {
    authClose.addEventListener('click', () => {
      authModal.classList.add('hidden');
    });
  }

  // Switch between Forms
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      document.getElementById('auth-title').innerText = "Тіркелу";
    });
  }

  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      document.getElementById('auth-title').innerText = "Жүйеге кіру";
    });
  }

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error');

      try {
        await api.login(email, password);
        authModal.classList.add('hidden');
        loginForm.reset();
        checkAuthSession();
        
        // Refresh saved routes
        loadSavedRoutes();
        
        if (window.confetti) {
          window.confetti({ particleCount: 50, spread: 60 });
        }
      } catch (err) {
        errorMsg.innerText = err.message;
        errorMsg.classList.remove('hidden');
      }
    });
  }

  // Handle Register Form Submit
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const errorMsg = document.getElementById('register-error');

      try {
        await api.register(name, email, password);
        authModal.classList.add('hidden');
        registerForm.reset();
        checkAuthSession();
        
        // Refresh saved routes
        loadSavedRoutes();

        if (window.confetti) {
          window.confetti({ particleCount: 50, spread: 60 });
        }
      } catch (err) {
        errorMsg.innerText = err.message;
        errorMsg.classList.remove('hidden');
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.logout();
      checkAuthSession();
      switchView('map');
      
      // Refresh saved routes to empty
      loadSavedRoutes();
    });
  }
}

// PLACES VIEW: Grid population
let activePlacesFilterCategory = 'all';
let placesSearchText = '';

function setupPlacesView() {
  const searchInput = document.getElementById('places-search-input');
  const filterBtns = document.querySelectorAll('#places-category-filters button');
  
  // Search bar
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      placesSearchText = e.target.value;
      renderPlacesGrid();
    });
  }

  // Filter chips
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activePlacesFilterCategory = e.target.getAttribute('data-category');
      renderPlacesGrid();
    });
  });

  // Same search and category filters on the map view
  const mapSearch = document.getElementById('map-search-input');
  const mapChips = document.querySelectorAll('#category-filters button');

  if (mapSearch) {
    mapSearch.addEventListener('input', (e) => {
      MapModule.reloadMarkers('all', e.target.value);
    });
  }

  mapChips.forEach(btn => {
    btn.addEventListener('click', (e) => {
      mapChips.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.getAttribute('data-category');
      MapModule.reloadMarkers(cat, mapSearch ? mapSearch.value : '');
    });
  });
}

async function renderPlacesGrid() {
  const container = document.getElementById('places-grid-container');
  if (!container) return;

  container.innerHTML = `<div class="sub-text" style="grid-column: span 3; text-align: center; padding: 40px;">Жүктелуде...</div>`;

  try {
    const places = await api.getPlaces(placesSearchText, activePlacesFilterCategory);

    if (places.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: span 3; border: none;">
          <i data-lucide="compass"></i>
          <p>Сұранысқа сай орындар табылмады.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = places.map(place => {
      let catText = 'Тарихи орын';
      if (place.category === 'cultural') catText = 'Мәдени орын';
      else if (place.category === 'leisure') catText = 'Демалыс орны';

      return `
        <article class="place-card glass">
          <div class="place-card-img">
            <img src="${place.images[0]}" alt="${place.name}">
            <span class="category-badge">${catText}</span>
          </div>
          <div class="place-card-content">
            <h3 class="place-card-title">${place.name}</h3>
            <p class="place-card-desc">${place.description}</p>
            
            <div class="place-card-footer">
              <div class="place-rating">
                ★ <span>${place.rating_avg.toFixed(1)}</span>
              </div>
              <button class="btn btn-sm btn-outline view-details-trigger" data-id="${place.id}">
                Толығырақ
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Trigger details trigger click events
    container.querySelectorAll('.view-details-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openPlaceDetailModal(id);
      });
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="error-text" style="grid-column: span 3;">Жүктеу қатесі: ${error.message}</p>`;
  }
}

// DETAILS MODAL
let currentActivePlaceId = null;

function setupPlaceDetailModal() {
  const modal = document.getElementById('place-detail-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const addReviewForm = document.getElementById('add-review-form');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Add Review Form Submit
  if (addReviewForm) {
    addReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!api.isAuthenticated()) {
        alert("Пікір қалдыру үшін жүйеге кіріңіз!");
        document.getElementById('auth-modal').classList.remove('hidden');
        return;
      }

      const rating = parseInt(addReviewForm.querySelector('input[name="rating"]:checked').value);
      const comment = document.getElementById('review-comment').value.trim();

      try {
        await api.addReview(currentActivePlaceId, rating, comment);
        
        // Reset comment and reload place details
        document.getElementById('review-comment').value = "";
        openPlaceDetailModal(currentActivePlaceId);

        // Also refresh places views to reflect new rating average
        renderPlacesGrid();
        MapModule.reloadMarkers();
        
      } catch (error) {
        alert("Пікір қосылмады: " + error.message);
      }
    });
  }

  // Add to Route from modal
  const modalAddRouteBtn = document.getElementById('modal-add-route-btn');
  if (modalAddRouteBtn) {
    modalAddRouteBtn.addEventListener('click', () => {
      if (currentActivePlaceId) {
        addPlaceToRoute(currentActivePlaceId);
        modal.classList.add('hidden');
      }
    });
  }
}

async function openPlaceDetailModal(placeId) {
  currentActivePlaceId = parseInt(placeId);
  const modal = document.getElementById('place-detail-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // Load modal body content
  const titleEl = document.getElementById('modal-place-name');
  const imgEl = document.getElementById('modal-place-image');
  const catBadge = document.getElementById('modal-place-category');
  const starsEl = document.getElementById('modal-place-stars');
  const ratingText = document.getElementById('modal-place-rating-text');
  const descEl = document.getElementById('modal-place-desc');
  const reviewsContainer = document.getElementById('modal-reviews-list');

  // Loading indicator
  titleEl.innerText = "Жүктелуде...";
  descEl.innerText = "";
  reviewsContainer.innerHTML = "";

  try {
    const place = await api.getPlaceById(placeId);

    titleEl.innerText = place.name;
    imgEl.src = place.images[0];
    
    let catText = 'Тарихи орын';
    if (place.category === 'cultural') catText = 'Мәдени орын';
    else if (place.category === 'leisure') catText = 'Демалыс орны';
    else if (place.category === 'food') catText = 'Тамақтану';
    else if (place.category === 'hotel') catText = 'Қонақ үй';
    else if (place.category === 'pharmacy') catText = 'Дәріхана';
    
    catBadge.innerText = catText;

    // Stars rating formatting
    const roundedRating = Math.round(place.rating_avg);
    starsEl.innerText = '⭐'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
    ratingText.innerText = `${place.rating_avg.toFixed(1)} / 5 (${place.reviews ? place.reviews.length : 0} пікір)`;

    descEl.innerText = place.description;

    // Reviews list
    if (!place.reviews || place.reviews.length === 0) {
      reviewsContainer.innerHTML = `<p class="sub-text" style="font-size:12px; font-style:italic;">Бұл орынға пікірлер әлі жазылмаған.</p>`;
    } else {
      // Sort reviews newest first
      const sortedReviews = [...place.reviews].sort((a,b) => b.id - a.id);
      reviewsContainer.innerHTML = sortedReviews.map(r => `
        <div class="review-item">
          <div class="review-header">
            <span class="review-user">${r.user_name}</span>
            <span class="review-date">${r.created_at}</span>
          </div>
          <div class="review-rating">${'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</div>
          <div class="review-comment">${r.comment}</div>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error(error);
    titleEl.innerText = "Қате!";
    descEl.innerText = "Мәліметтерді жүктеу қатесі: " + error.message;
  }
}

// ROUTE BUILDER & SAVED ROUTES
function setupRouteBuilder() {
  const saveBtn = document.getElementById('save-route-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!api.isAuthenticated()) {
        alert("Маршрутты сақтау үшін алдымен жүйеге кіріңіз!");
        document.getElementById('auth-modal').classList.remove('hidden');
        return;
      }

      if (activeRouteStops.length < 2) {
        alert("Маршрут құру үшін кем дегенде 2 орын қосыңыз!");
        return;
      }

      const placesIds = activeRouteStops.map(p => p.id);
      const distText = document.getElementById('route-distance').innerText;
      const distance = parseFloat(distText);
      const timeText = document.getElementById('route-time').innerText;
      const time = parseInt(timeText);

      try {
        await api.createRoute(placesIds, distance, time);
        alert("Маршрут сәтті сақталды!");
        
        // Clear active route builder
        activeRouteStops = [];
        renderRouteBuilderList();
        MapModule.clearRoute();
        
        // Reload saved routes
        loadSavedRoutes();
        
        if (window.confetti) {
          window.confetti({ particleCount: 60, spread: 50 });
        }
      } catch (err) {
        alert("Сақтау қатесі: " + err.message);
      }
    });
  }

  // Load Saved Routes Initially
  loadSavedRoutes();
}

async function addPlaceToRoute(placeId) {
  try {
    const place = await api.getPlaceById(placeId);
    
    // Check if already in active route builder stops
    if (activeRouteStops.find(p => p.id === place.id)) {
      alert("Бұл нысан маршрутта қазірдің өзінде бар!");
      return;
    }

    activeRouteStops.push(place);
    
    // Switch to Route planner tab
    switchView('route');
    renderRouteBuilderList();
    
    // Highlight route line on map
    MapModule.drawRoute(activeRouteStops);
    
  } catch (error) {
    console.error(error);
  }
}

function renderRouteBuilderList() {
  const container = document.getElementById('route-stops-container');
  const summaryPanel = document.getElementById('route-summary-panel');

  if (!container || !summaryPanel) return;

  if (activeRouteStops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="plus-circle"></i>
        <p>Әзірге орындар таңдалмады. Орындар тізімінен немесе картадан «Маршрутқа қосу» батырмасын басыңыз.</p>
      </div>
    `;
    summaryPanel.classList.add('hidden');
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  summaryPanel.classList.remove('hidden');

  container.innerHTML = activeRouteStops.map((p, index) => `
    <div class="route-stop-item">
      <div class="stop-badge">${index + 1}</div>
      <span class="stop-name">${p.name}</span>
      <button class="stop-remove-btn" data-id="${p.id}"><i data-lucide="x" style="width:14px; height:14px;"></i></button>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  // Add remove stop listeners
  container.querySelectorAll('.stop-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      activeRouteStops = activeRouteStops.filter(p => p.id !== id);
      renderRouteBuilderList();
      MapModule.drawRoute(activeRouteStops);
      calculateRouteMetrics();
    });
  });

  calculateRouteMetrics();
}

// Haversine route metric calculator
function calculateRouteMetrics() {
  if (activeRouteStops.length < 2) {
    document.getElementById('route-distance').innerText = "0.0 км";
    document.getElementById('route-time').innerText = "0 мин";
    return;
  }

  let totalDist = 0;
  for (let i = 0; i < activeRouteStops.length - 1; i++) {
    const p1 = activeRouteStops[i];
    const p2 = activeRouteStops[i+1];
    
    // Geometric distance between coordinates
    const R = 6371; // earth radius km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDist += (R * c);
  }

  // Round distance
  totalDist = parseFloat(totalDist.toFixed(2));
  
  // Calculate walking time (average walking speed 5 km/h -> 12 min per km)
  const totalTimeMinutes = Math.round(totalDist * 12);

  document.getElementById('route-distance').innerText = `${totalDist} км`;
  document.getElementById('route-time').innerText = `${totalTimeMinutes} мин`;
}

// Load Saved Routes
async function loadSavedRoutes() {
  const container = document.getElementById('saved-routes-list');
  if (!container) return;

  if (!api.isAuthenticated()) {
    container.innerHTML = `<p class="sub-text" style="font-style:italic;">Сақталған маршруттарыңызды көру үшін жүйеге кіріңіз.</p>`;
    return;
  }

  container.innerHTML = `<p class="sub-text">Жүктелуде...</p>`;

  try {
    const routes = await api.getRoutes();
    const allPlaces = await api.getPlaces();

    if (routes.length === 0) {
      container.innerHTML = `<p class="sub-text" style="font-style:italic;">Сақталған маршруттар жоқ.</p>`;
      return;
    }

    container.innerHTML = routes.map(r => {
      // Find names of places
      const stopNames = r.places_list
        .map(id => allPlaces.find(p => p.id === id))
        .filter(p => !!p)
        .map(p => p.name)
        .join(' ➔ ');

      return `
        <div class="saved-route-card">
          <div class="saved-route-header">
            <span class="saved-route-id">Маршрут #${r.id}</span>
            <button class="saved-route-delete" data-id="${r.id}"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
          </div>
          <div class="saved-route-details">
            <b>Арақашықтық:</b> ${r.distance} км | <b>Уақыт:</b> ${r.time} мин
          </div>
          <div style="font-size: 11px; margin-top: 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${stopNames}">
            ${stopNames}
          </div>
          <div class="saved-route-actions">
            <button class="btn btn-sm btn-outline load-route-trigger" data-id="${r.id}">
              <i data-lucide="eye" style="width:10px; height:10px;"></i> Қарау
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Trigger Load and Delete actions
    container.querySelectorAll('.load-route-trigger').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        await loadSavedRouteToBuilder(id);
      });
    });

    container.querySelectorAll('.saved-route-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        if (confirm("Бұл маршрутты өшіруді растайсыз ба?")) {
          await api.deleteRoute(id);
          loadSavedRoutes();
        }
      });
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="error-text">Жүктеу қатесі.</p>`;
  }
}

async function loadSavedRouteToBuilder(routeId) {
  try {
    const routes = await api.getRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Load places objects
    const places = [];
    for (const id of route.places_list) {
      const p = await api.getPlaceById(id);
      places.push(p);
    }

    activeRouteStops = places;
    
    // Switch to Map tab to show the route
    switchView('map');
    
    // Trigger route drawing
    MapModule.drawRoute(activeRouteStops);
    
    // Keep route builder list updated
    renderRouteBuilderList();

  } catch (e) {
    alert("Маршрутты жүктеу мүмкін болмады: " + e.message);
  }
}

// SETUP CUSTOM & GLOBAL EVENTS
function setupGlobalEvents() {
  // Open place details view
  document.addEventListener('open-place-detail', (e) => {
    const placeId = e.detail;
    openPlaceDetailModal(placeId);
  });

  // Add place directly to route builder
  document.addEventListener('add-place-to-route', (e) => {
    const placeId = e.detail;
    addPlaceToRoute(placeId);
  });

  // Admin place creation/update updates places grid
  document.addEventListener('places-updated', () => {
    if (currentActiveView === 'places') {
      renderPlacesGrid();
    }
  });
}
