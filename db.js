// db.js - LocalStorage Database Layer for Smart Turkistan

const DEFAULT_USERS = [
  {
    id: 1,
    name: "Администратор",
    email: "admin@smart-turkistan.kz",
    password: "admin123", // Simplified mock password check
    role: "admin"
  },
  {
    id: 2,
    name: "Әлихан Қанат",
    email: "alikhan@mail.ru",
    password: "user123",
    role: "user"
  }
];

const DEFAULT_PLACES = [
  {
    id: 1,
    name: "Қожа Ахмет Ясауи кесенесі",
    description: "XIV ғасырдың соңында Әмір Темірдің бұйрығымен салынған, Түркістанның басты тарихи және рухани символы. ЮНЕСКО-ның бүкіләлемдік мұралар тізіміне енген сәулет өнерінің жауһары. Мұнда орта ғасырлық Тайқазан, қабірхана және мешіт орналасқан.",
    category: "historical",
    lat: 43.2982,
    lng: 68.2711,
    images: ["https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 5.0
  },
  {
    id: 2,
    name: "Керуен-сарай туристік кешені",
    description: "\"Орталық Азиядағы Венеция\" деп аталатын, заманауи ірі туристік кешен. Мұнда су айдындары, қайықтар шеруі, «Ұшатын театр», амфитеатр, қонақ үйлер және ұлттық нақыштағы мейрамханалар орналасқан.",
    category: "leisure",
    lat: 43.2935,
    lng: 68.2678,
    images: ["https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.8
  },
  {
    id: 3,
    name: "Қылует жерасты мешіті",
    description: "Қожа Ахмет Ясауи бабамыз пайғамбар жасына (63 жас) толғаннан кейін өмірінің соңына дейін құлшылық етіп, кітап жазған тарихи жерасты мешіті. Кесене маңында орналасқан, тереңдігі 4 метр.",
    category: "historical",
    lat: 43.2965,
    lng: 68.2725,
    images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.9
  },
  {
    id: 4,
    name: "Түркістан облыстық тарихи-өлкетану музейі",
    description: "Түркістан өңірінің көне заманнан бүгінгі күнге дейінгі бай тарихын, археологиялық жәдігерлерін, этнографиялық бұйымдары мен хандар шежіресін қамтитын негізгі мәдени орталық.",
    category: "cultural",
    lat: 43.3020,
    lng: 68.2780,
    images: ["https://images.unsplash.com/photo-1582882757627-117b934335aa?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.7
  },
  {
    id: 5,
    name: "Көне Жұма мешіті",
    description: "XVIII-XIX ғасырларға жататын, Ясауи кесенесінің жанында орналасқан тарихи мешіт. Қазіргі кезде мұражай ретінде жұмыс істейді және сол кезеңнің құрылыс стилін толық сипаттайды.",
    category: "historical",
    lat: 43.2974,
    lng: 68.2705,
    images: ["https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.6
  },
  {
    id: 6,
    name: "Ясауи саябағы",
    description: "Кесене маңындағы жасыл желекке толы, субұрқақтары бар, серуендеуге және демалуға таптырмас әдемі саябақ. Туристер мен қала тұрғындарының сүйікті демалыс орны.",
    category: "leisure",
    lat: 43.3000,
    lng: 68.2680,
    images: ["https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.8
  },
  {
    id: 7,
    name: "Rixos Khadisha Turkistan қонақ үйі",
    description: "Түркістан қаласындағы жоғары сапалы 5 жұлдызды сәнді қонақ үй. Керуен-сарай кешенінің маңында, туристер үшін толық жайлылық, СПА және мейрамхана қызметтерін ұсынады.",
    category: "hotel",
    lat: 43.2870,
    lng: 68.2750,
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.9
  },
  {
    id: 8,
    name: "Dariya Cafe & Restaurant",
    description: "Түркістанның ұлттық және еуропалық тағамдарын, дәмді кәуаптары мен қымыз, шұбатын ұсынатын Керуен-сарайға жақын жердегі танымал дәмхана.",
    category: "food",
    lat: 43.2950,
    lng: 68.2650,
    images: ["https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.5
  },
  {
    id: 9,
    name: "Орталық кезекші дәріхана",
    description: "Кесене мен басты қонақ үйлерге жақын орналасқан, 24/7 режимінде жұмыс істейтін дәрілік заттар сататын кезекші дәріхана.",
    category: "pharmacy",
    lat: 43.2910,
    lng: 68.2700,
    images: ["https://images.unsplash.com/photo-1607619056574-7b8d304a2c06?auto=format&fit=crop&w=800&q=80"],
    rating_avg: 4.4
  }
];

const DEFAULT_REVIEWS = [
  {
    id: 1,
    user_id: 2,
    place_id: 1,
    user_name: "Әлихан Қанат",
    rating: 5,
    comment: "Өте керемет, рухани байлық алып қайттық! Күмбездің сәулеті таң қалдырады. Міндетті түрде келіңіздер!",
    created_at: "2026-06-10 12:00"
  },
  {
    id: 2,
    user_id: 2,
    place_id: 2,
    user_name: "Әлихан Қанат",
    rating: 5,
    comment: "Керуен-сарайдағы қайықтар шеруі мен Ұшатын театр өте керемет екен! Баруға кеңес беремін.",
    created_at: "2026-06-11 09:30"
  }
];

const DEFAULT_ROUTES = [
  {
    id: 1,
    user_id: 2,
    places_list: [1, 3, 2], // IDs of places
    distance: 1.1,
    time: 15 // minutes
  }
];

// Initialize Storage
function initStorage() {
  if (!localStorage.getItem("st_users")) {
    localStorage.setItem("st_users", JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem("st_places")) {
    localStorage.setItem("st_places", JSON.stringify(DEFAULT_PLACES));
  }
  if (!localStorage.getItem("st_reviews")) {
    localStorage.setItem("st_reviews", JSON.stringify(DEFAULT_REVIEWS));
  }
  if (!localStorage.getItem("st_routes")) {
    localStorage.setItem("st_routes", JSON.stringify(DEFAULT_ROUTES));
  }
}

initStorage();

// Database CRUD Operations Helper Class
export const db = {
  // --- USERS ---
  getUsers() {
    return JSON.parse(localStorage.getItem("st_users"));
  },
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email);
  },
  createUser(name, email, password) {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) {
      throw new Error("Бұл электрондық пошта жүйеде тіркелген!");
    }
    const newUser = {
      id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      email,
      password,
      role: "user"
    };
    users.push(newUser);
    localStorage.setItem("st_users", JSON.stringify(users));
    return newUser;
  },

  // --- PLACES ---
  getPlaces() {
    return JSON.parse(localStorage.getItem("st_places"));
  },
  getPlaceById(id) {
    return this.getPlaces().find(p => p.id === parseInt(id));
  },
  addPlace(placeData) {
    const places = this.getPlaces();
    const newPlace = {
      id: places.length ? Math.max(...places.map(p => p.id)) + 1 : 1,
      name: placeData.name,
      description: placeData.description,
      category: placeData.category,
      lat: parseFloat(placeData.lat),
      lng: parseFloat(placeData.lng),
      images: Array.isArray(placeData.images) ? placeData.images : [placeData.images],
      rating_avg: 5.0
    };
    places.push(newPlace);
    localStorage.setItem("st_places", JSON.stringify(places));
    return newPlace;
  },
  updatePlace(id, placeData) {
    const places = this.getPlaces();
    const index = places.findIndex(p => p.id === parseInt(id));
    if (index === -1) throw new Error("Нысан табылмады!");
    
    places[index] = {
      ...places[index],
      name: placeData.name,
      description: placeData.description,
      category: placeData.category,
      lat: parseFloat(placeData.lat),
      lng: parseFloat(placeData.lng),
      images: Array.isArray(placeData.images) ? placeData.images : [placeData.images]
    };
    localStorage.setItem("st_places", JSON.stringify(places));
    return places[index];
  },
  deletePlace(id) {
    let places = this.getPlaces();
    places = places.filter(p => p.id !== parseInt(id));
    localStorage.setItem("st_places", JSON.stringify(places));
    
    // Also cleanup reviews and routes associated
    let reviews = this.getReviews();
    reviews = reviews.filter(r => r.place_id !== parseInt(id));
    localStorage.setItem("st_reviews", JSON.stringify(reviews));
    return true;
  },

  // --- REVIEWS ---
  getReviews() {
    return JSON.parse(localStorage.getItem("st_reviews"));
  },
  getReviewsByPlaceId(placeId) {
    return this.getReviews().filter(r => r.place_id === parseInt(placeId));
  },
  addReview(userId, userName, placeId, rating, comment) {
    const reviews = this.getReviews();
    const newReview = {
      id: reviews.length ? Math.max(...reviews.map(r => r.id)) + 1 : 1,
      user_id: parseInt(userId),
      user_name: userName,
      place_id: parseInt(placeId),
      rating: parseInt(rating),
      comment,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    reviews.push(newReview);
    localStorage.setItem("st_reviews", JSON.stringify(reviews));
    
    // Recalculate place rating_avg
    this.recalculatePlaceRating(placeId);
    
    return newReview;
  },
  recalculatePlaceRating(placeId) {
    const reviews = this.getReviewsByPlaceId(placeId);
    if (reviews.length === 0) return;
    
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = parseFloat((sum / reviews.length).toFixed(1));
    
    const places = this.getPlaces();
    const index = places.findIndex(p => p.id === parseInt(placeId));
    if (index !== -1) {
      places[index].rating_avg = avg;
      localStorage.setItem("st_places", JSON.stringify(places));
    }
  },

  // --- ROUTES ---
  getRoutes() {
    return JSON.parse(localStorage.getItem("st_routes"));
  },
  getRoutesByUserId(userId) {
    return this.getRoutes().filter(r => r.user_id === parseInt(userId));
  },
  addRoute(userId, placesList, distance, time) {
    const routes = this.getRoutes();
    const newRoute = {
      id: routes.length ? Math.max(...routes.map(r => r.id)) + 1 : 1,
      user_id: parseInt(userId),
      places_list: placesList,
      distance: parseFloat(distance),
      time: parseInt(time)
    };
    routes.push(newRoute);
    localStorage.setItem("st_routes", JSON.stringify(routes));
    return newRoute;
  },
  deleteRoute(id) {
    let routes = this.getRoutes();
    routes = routes.filter(r => r.id !== parseInt(id));
    localStorage.setItem("st_routes", JSON.stringify(routes));
    return true;
  }
};
