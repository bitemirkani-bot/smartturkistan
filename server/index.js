// server/index.js - Express API Server for Smart Turkistan
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'smart_turkistan_secret_key_123';

app.use(cors());
app.use(express.json());

// Serve frontend static files from root directory
app.use(express.static(path.join(__dirname, '../')));

// Middleware for JWT Authentication
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Жүйеге кіру токені жарамсыз немесе ескірген!' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Бұл әрекетті орындау үшін жүйеге кіру қажет!' });
  }
}

// Middleware for Admin permission check
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Бұл әрекетке рұқсат берілмеген! Тек әкімші орындай алады.' });
  }
}

// --- AUTHENTICATION ---

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Барлық өрістерді толтыру қажет!' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Бұл электрондық пошта жүйеде тіркелген!' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await db.runAsync(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'user']
    );

    const userId = result.lastID;
    const userPayload = { id: userId, name, email, role: 'user' };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: 'Тіркелу кезінде қате орын алды: ' + err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Пошта мен құпия сөзді енгізіңіз!' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Қате электрондық пошта немесе құпия сөз!' });
    }

    const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: 'Жүйеге кіру кезінде қате орын алды: ' + err.message });
  }
});

// --- PLACES ---

// GET /api/places
app.get('/api/places', async (req, res) => {
  const { search, category } = req.query;
  
  let sql = 'SELECT * FROM places';
  const params = [];
  const conditions = [];

  // Filter out categories which are nearby-only in general lists if category is 'all'
  // General categories: 'historical', 'cultural', 'leisure'
  if (!category || category === 'all') {
    conditions.push("category IN ('historical', 'cultural', 'leisure')");
  } else {
    conditions.push('category = ?');
    params.push(category);
  }

  if (search && search.trim() !== '') {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    const likeParam = `%${search}%`;
    params.push(likeParam, likeParam);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const rows = await db.allAsync(sql, params);
    const parsedRows = rows.map(r => ({
      ...r,
      images: JSON.parse(r.images)
    }));
    res.json(parsedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/places/:id
app.get('/api/places/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const place = await db.getAsync('SELECT * FROM places WHERE id = ?', [id]);
    if (!place) {
      return res.status(404).json({ error: 'Нысан табылмады!' });
    }

    place.images = JSON.parse(place.images);
    
    // Load reviews
    const reviews = await db.allAsync('SELECT * FROM reviews WHERE place_id = ? ORDER BY id DESC', [id]);
    place.reviews = reviews;

    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/places (Admin only)
app.post('/api/places', authenticateJWT, requireAdmin, async (req, res) => {
  const { name, description, category, lat, lng, images } = req.body;
  if (!name || !description || !category || lat === undefined || lng === undefined || !images) {
    return res.status(400).json({ error: 'Барлық өрістерді толтыру қажет!' });
  }

  const imagesStr = Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images]);

  try {
    const result = await db.runAsync(
      'INSERT INTO places (name, description, category, lat, lng, images, rating_avg) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, category, parseFloat(lat), parseFloat(lng), imagesStr, 5.0]
    );
    res.status(201).json({ id: result.lastID, name, description, category, lat, lng, images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/places/:id (Admin only)
app.put('/api/places/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, lat, lng, images } = req.body;

  if (!name || !description || !category || lat === undefined || lng === undefined || !images) {
    return res.status(400).json({ error: 'Барлық өрістерді толтыру қажет!' });
  }

  const imagesStr = Array.isArray(images) ? JSON.stringify(images) : JSON.stringify([images]);

  try {
    await db.runAsync(
      'UPDATE places SET name = ?, description = ?, category = ?, lat = ?, lng = ?, images = ? WHERE id = ?',
      [name, description, category, parseFloat(lat), parseFloat(lng), imagesStr, id]
    );
    res.json({ id, name, description, category, lat, lng, images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/places/:id (Admin only)
app.delete('/api/places/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.runAsync('DELETE FROM places WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM reviews WHERE place_id = ?', [id]);
    res.json({ success: true, message: 'Орын сәтті өшірілді.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REVIEWS ---

// POST /api/places/:id/reviews
app.post('/api/places/:id/reviews', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;

  if (rating === undefined || !comment) {
    return res.status(400).json({ error: 'Рейтинг пен пікірді енгізіңіз!' });
  }

  const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

  try {
    await db.runAsync(
      'INSERT INTO reviews (user_id, place_id, user_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, id, userName, rating, comment, createdAt]
    );

    // Recalculate average rating of the place
    const reviews = await db.allAsync('SELECT rating FROM reviews WHERE place_id = ?', [id]);
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = parseFloat((sum / reviews.length).toFixed(1));
      await db.runAsync('UPDATE places SET rating_avg = ? WHERE id = ?', [avg, id]);
    }

    res.status(201).json({ success: true, user_name: userName, rating, comment, created_at: createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTES ---

// POST /api/routes
app.post('/api/routes', authenticateJWT, async (req, res) => {
  const { places_list, distance, time } = req.body;
  const userId = req.user.id;

  if (!places_list || distance === undefined || time === undefined) {
    return res.status(400).json({ error: 'Маршрут деректері толық емес!' });
  }

  const placesListStr = JSON.stringify(places_list);

  try {
    const result = await db.runAsync(
      'INSERT INTO routes (user_id, places_list, distance, time) VALUES (?, ?, ?, ?)',
      [userId, placesListStr, parseFloat(distance), parseInt(time)]
    );
    res.status(201).json({ id: result.lastID, user_id: userId, places_list, distance, time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/routes
app.get('/api/routes', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await db.allAsync('SELECT * FROM routes WHERE user_id = ?', [userId]);
    const parsedRows = rows.map(r => ({
      ...r,
      places_list: JSON.parse(r.places_list)
    }));
    res.json(parsedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/routes/:id
app.delete('/api/routes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    // Ensure the route belongs to the user
    const route = await db.getAsync('SELECT * FROM routes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!route) {
      return res.status(404).json({ error: 'Маршрут табылмады немесе сізге тиесілі емес!' });
    }

    await db.runAsync('DELETE FROM routes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Маршрут сәтті өшірілді.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEARBY ---

// GET /api/nearby
app.get('/api/nearby', async (req, res) => {
  const { lat, lng, radius, category } = req.query;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Координаталар қажет!' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius || 5);
  const cat = category || 'all';

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  try {
    const allPlaces = await db.allAsync('SELECT * FROM places');
    const parsedPlaces = allPlaces.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }));

    const nearby = parsedPlaces
      .map(p => {
        const dist = getDistanceKm(userLat, userLng, p.lat, p.lng);
        return { ...p, distance: parseFloat(dist.toFixed(2)) };
      })
      .filter(p => {
        const inRadius = p.distance <= radiusKm;
        const matchCategory = cat === 'all'
          ? ['food', 'hotel', 'pharmacy'].includes(p.category)
          : p.category === cat;
        return inRadius && matchCategory;
      })
      .sort((a, b) => a.distance - b.distance);

    res.json(nearby);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WEATHER ---

// GET /api/weather
app.get('/api/weather', (req, res) => {
  // High quality Turkistan weather response
  res.json({
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
  });
});

// --- CHATBOT ---

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

// POST /api/chat
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Хабарлама мәтіні бос!' });
  }

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
    return res.json({ response: bestMatch });
  }

  res.json({
    response: "Кешіріңіз, бұл сұраққа жауап таба алмадым. Менен Қожа Ахмет Ясауи кесенесі, Керуен-сарай, жақын маңдағы қонақ үйлер немесе кезекші дәріханалар туралы сұрап көріңіз. Сонымен қатар, қалай маршрут құру керектігін айта аламын!"
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Smart Turkistan server running on http://localhost:${PORT}`);
});
