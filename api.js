// api.js - Dual-Mode API Server client for Smart Turkistan
import { db } from './db.js';

const BASE_URL = '/api';

// Detect whether Express backend is offline
let isBackendOffline = false;

// Simulated network latency for LocalStorage fallback (in milliseconds)
const LATENCY = 300;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to calculate distance in km using Haversine formula
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// AI Chatbot Knowledge Base fallback
const BOT_RESPONSES = [
  {
    keywords: ['ясауи', 'кесене', 'кесенесі', 'ахмет', 'ахмед', 'yasawi'],
    response: "Қожа Ахмет Ясауи кесенесі — XIV ғасырдың соңында Әмір Темірдің бұйрығымен салынған сәулет өнерінің ғажайып ескерткіші. Оның биіктігі 39 метр, ал күмбезі Орталық Азиядағы ең үлкен кірпіш күмбездердің бірі болып табылады. Кесене ЮНЕСКО мұралары тізіміне енген."
  },
  {
    keywords: ['керуен', 'керуен-сарай', 'керуенсарай', 'кешен', 'венеция'],
    response: "Керуен-сарай — Түркістандағы жаңа заманауи туристік кешен. Оны «Орталық Азиядағы Венеция» деп атайды. Мұнда қайық шеруі, қазақтың «Қыз Жібек пен Төлеген» махаббат хикаясына негізделген театрландырылған шоуы және «Ұшатын театр» (Самұрық) орналасқан."
  },
  {
    keywords: ['қылует', 'жерасты', 'мешіт'],
    response: "Қылует жерасты мешіті — Қожа Ахмет Ясауи бабамыз 63 жасқа (пайғамбар жасына) толған соң, қалған өмірін өткізген жер асты мекені. Мұнда ол құлшылық қылып, өзінің әйгілі «Диуани Хикмет» (Даналық кітабы) еңбегін жазған."
  },
  {
    keywords: ['мұражай', 'музей'],
    response: "Түркістан облыстық тарихи-өлкетану музейі қаланың мәдени орталығы болып табылады. Онда өңірдің көне дәуірден бүгінге дейінгі жәдігерлері, сауыт-саймандары мен археологиялық табылымдары қойылған."
  },
  {
    keywords: ['қонақ', 'hotel', 'үй', 'риксос', 'rixos', 'жататын'],
    response: "Түркістандағы ең танымал қонақ үйлер: 5 жұлдызды Rixos Khadisha Turkistan, Керуен-сарай ішіндегі Karavansaray Hotel, және жайлы Hampton by Hilton. Олардың барлығы тарихи орталыққа өте жақын."
  },
  {
    keywords: ['тамақ', 'кафе', 'мейрамхана', 'food', 'restaurant', 'дәрия', 'шұбат', 'қымыз'],
    response: "Түркістанда ұлттық тағамдардан дәм тату үшін «Dariya Cafe», Керуен-сарайдағы мейрамханалар желісі немесе жергілікті «Сандық» ұлттық мейрамханасына баруға кеңес беремін. Түркістанның кәуабы мен шұбаты ерекше дәмді!"
  },
  {
    keywords: ['дәріхана', 'аптека', 'pharmacy', 'дәрі'],
    response: "Қалада 24/7 жұмыс істейтін орталық кезекші дәріханалар бар. Олардың бірі Ясауи даңғылында, Керуен-сарайдан 1 км қашықтықта орналасқан. Карта бөлімінен дәріхана сүзгісін қосып, ең жақынын таба аласыз."
  },
  {
    keywords: ['маршрут', 'бағыт', 'қалай', 'жол'],
    response: "Ақылды маршрут құру үшін «Маршрут» мәзіріне өтіп, өзіңіз барғыңыз келетін орындарды таңдаңыз. Жүйе автоматты түрде олардың арасындағы ең қысқа бағытты сызып, қашықтығы мен жүру уақытын есептеп береді."
  },
  {
    keywords: ['сәлем', 'ассалаумағалейкум', 'привет', 'hello', 'hi'],
    response: "Сәлеметсіз бе! Smart Turkistan көмекшісіне қош келдіңіз. Мен сізге қала орындары, ауа райы немесе маршруттар жайлы ақпарат беруге дайынмын."
  }
];

// Helper to make API requests with automatic fallback to db.js
async function request(endpoint, options = {}, mockFallback) {
  if (isBackendOffline) {
    return await mockFallback();
  }

  const token = localStorage.getItem("st_session_token");
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Серверлік қате: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // If connection/network fails, perform fallback to localStorage db.js
    if (err instanceof TypeError || err.message === 'Failed to fetch' || err.message.includes('fetch')) {
      console.warn("Backend server connection failed. Switching to LocalStorage database mock...", err);
      isBackendOffline = true;
      
      // Fire global status change event for display
      document.dispatchEvent(new CustomEvent('backend-status', { detail: { online: false } }));
      
      return await mockFallback();
    }
    
    // Otherwise, it is a valid validation/auth exception, throw it
    throw err;
  }
}

// Active session states in memory
let currentSessionToken = localStorage.getItem("st_session_token") || null;
let currentUserObj = localStorage.getItem("st_session_user") ? JSON.parse(localStorage.getItem("st_session_user")) : null;

export const api = {
  // Check if authenticated
  isAuthenticated() {
    return !!localStorage.getItem("st_session_token");
  },
  
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("st_session_user"));
    } catch(e) {
      return null;
    }
  },

  // POST /auth/login
  async login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = db.getUserByEmail(email);
      if (!user || user.password !== password) {
        throw new Error("Қате электрондық пошта немесе құпия сөз!");
      }
      const mockToken = `jwt_token_${Math.random().toString(36).substring(2)}_${user.id}`;
      currentUserObj = { id: user.id, name: user.name, email: user.email, role: user.role };
      localStorage.setItem("st_session_token", mockToken);
      localStorage.setItem("st_session_user", JSON.stringify(currentUserObj));
      return { token: mockToken, user: currentUserObj };
    }).then(res => {
      // Save session if from Express
      if (res && res.token) {
        localStorage.setItem("st_session_token", res.token);
        localStorage.setItem("st_session_user", JSON.stringify(res.user));
      }
      return res;
    });
  },

  // POST /auth/register
  async register(name, email, password) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = db.createUser(name, email, password);
      const mockToken = `jwt_token_${Math.random().toString(36).substring(2)}_${user.id}`;
      currentUserObj = { id: user.id, name: user.name, email: user.email, role: user.role };
      localStorage.setItem("st_session_token", mockToken);
      localStorage.setItem("st_session_user", JSON.stringify(currentUserObj));
      return { token: mockToken, user: currentUserObj };
    }).then(res => {
      // Save session if from Express
      if (res && res.token) {
        localStorage.setItem("st_session_token", res.token);
        localStorage.setItem("st_session_user", JSON.stringify(res.user));
      }
      return res;
    });
  },

  // Logout
  logout() {
    localStorage.removeItem("st_session_token");
    localStorage.removeItem("st_session_user");
    // Attempt backend logout if online
    if (!isBackendOffline) {
      fetch(`${BASE_URL}/auth/logout`, { method: 'POST' }).catch(() => {});
    }
  },

  // GET /places
  async getPlaces(search = "", category = "all") {
    const query = new URLSearchParams({ search, category }).toString();
    return request(`/places?${query}`, { method: 'GET' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      let places = db.getPlaces();
      
      if (category === "all") {
        places = places.filter(p => ['historical', 'cultural', 'leisure'].includes(p.category));
      } else {
        places = places.filter(p => p.category === category);
      }
      
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        places = places.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q)
        );
      }
      return places;
    });
  },

  // GET /places/:id
  async getPlaceById(id) {
    return request(`/places/${id}`, { method: 'GET' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const place = db.getPlaceById(id);
      if (!place) throw new Error("Нысан табылмады!");
      const reviews = db.getReviewsByPlaceId(id);
      return { ...place, reviews };
    });
  },

  // POST /places (Admin only)
  async addPlace(placeData) {
    return request('/places', {
      method: 'POST',
      body: JSON.stringify(placeData)
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user || user.role !== "admin") {
        throw new Error("Рұқсат етілмеген әрекет!");
      }
      return db.addPlace(placeData);
    });
  },

  // PUT /places/:id (Admin only)
  async updatePlace(id, placeData) {
    return request(`/places/${id}`, {
      method: 'PUT',
      body: JSON.stringify(placeData)
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user || user.role !== "admin") {
        throw new Error("Рұқсат етілмеген әрекет!");
      }
      return db.updatePlace(id, placeData);
    });
  },

  // DELETE /places/:id (Admin only)
  async deletePlace(id) {
    return request(`/places/${id}`, { method: 'DELETE' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user || user.role !== "admin") {
        throw new Error("Рұқсат етілмеген әрекет!");
      }
      return db.deletePlace(id);
    });
  },

  // POST /places/:id/reviews
  async addReview(placeId, rating, comment) {
    return request(`/places/${placeId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error("Пікір қалдыру үшін алдымен жүйеге кіріңіз!");
      }
      return db.addReview(user.id, user.name, placeId, rating, comment);
    });
  },

  // POST /routes
  async createRoute(placesList, distance, time) {
    return request('/routes', {
      method: 'POST',
      body: JSON.stringify({ places_list: placesList, distance, time })
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error("Маршрутты сақтау үшін жүйеге кіріңіз!");
      }
      return db.addRoute(user.id, placesList, distance, time);
    });
  },

  // GET /routes
  async getRoutes() {
    return request('/routes', { method: 'GET' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const user = this.getCurrentUser();
      if (!user) return [];
      return db.getRoutesByUserId(user.id);
    });
  },
  
  // DELETE /routes/:id
  async deleteRoute(id) {
    return request(`/routes/${id}`, { method: 'DELETE' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      return db.deleteRoute(id);
    });
  },

  // GET /nearby
  async getNearby(lat, lng, radiusKm = 5, category = "all") {
    const query = new URLSearchParams({ lat, lng, radius: radiusKm, category }).toString();
    return request(`/nearby?${query}`, { method: 'GET' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const allPlaces = db.getPlaces();
      
      return allPlaces
        .map(p => {
          const dist = getDistanceKm(lat, lng, p.lat, p.lng);
          return { ...p, distance: parseFloat(dist.toFixed(2)) };
        })
        .filter(p => {
          const inRadius = p.distance <= radiusKm;
          const matchCategory = category === "all" 
            ? ['food', 'hotel', 'pharmacy'].includes(p.category)
            : p.category === category;
          return inRadius && matchCategory;
        })
        .sort((a, b) => a.distance - b.distance);
    });
  },

  // GET /weather
  async getWeather() {
    return request('/weather', { method: 'GET' }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      return {
        current: {
          temp: 34,
          feels_like: 32,
          humidity: 20,
          wind_speed: 4.5,
          icon: '☀️',
          condition: 'Ашық аспан',
          humidity_icon: '💧',
          wind_icon: '💨'
        },
        forecast: [
          { day: 'Бүгін', temp: 34, icon: '☀️', condition: 'Ашық' },
          { day: 'Жұма', temp: 35, icon: '☀️', condition: 'Ашық' },
          { day: 'Сен', temp: 36, icon: '☀️', condition: 'Ашық' },
          { day: 'Жек', temp: 33, icon: '⛅', condition: 'Аздап бұлтты' },
          { day: 'Дүй', temp: 32, icon: '☀️', condition: 'Ашық' },
          { day: 'Сей', temp: 34, icon: '☀️', condition: 'Ашық' },
          { day: 'Сәр', temp: 35, icon: '☀️', condition: 'Ашық' }
        ]
      };
    });
  },

  // POST /chat
  async sendChatMessage(message) {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    }, async () => {
      // LocalStorage Fallback
      await delay(LATENCY);
      const msgLower = message.toLowerCase();
      let bestMatch = null;
      for (const item of BOT_RESPONSES) {
        const match = item.keywords.some(keyword => msgLower.includes(keyword));
        if (match) {
          bestMatch = item.response;
          break;
        }
      }
      if (bestMatch) {
        return { response: bestMatch };
      }
      return { 
        response: "Кешіріңіз, бұл сұраққа жауап таба алмадым. Менен Қожа Ахмет Ясауи кесенесі, Керуен-сарай, жақын маңдағы қонақ үйлер немесе кезекші дәріханалар туралы сұрап көріңіз. Сонымен қатар, қалай маршрут құру керектігін айта аламын!" 
      };
    });
  }
};
