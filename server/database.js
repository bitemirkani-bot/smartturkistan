const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'turkistan.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Run migrations and seed data
function initDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )`);

    // 2. Places Table
    db.run(`CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      images TEXT NOT NULL,
      rating_avg REAL DEFAULT 5.0
    )`);

    // 3. Routes Table
    db.run(`CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      places_list TEXT NOT NULL,
      distance REAL NOT NULL,
      time INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 4. Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      place_id INTEGER,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(place_id) REFERENCES places(id)
    )`);

    // Seed Admin User
    const adminEmail = 'admin@smart-turkistan.kz';
    db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
      if (err) console.error(err);
      if (!row) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['Администратор', adminEmail, hash, 'admin'],
          (err) => {
            if (err) console.error('Error seeding admin user:', err.message);
            else console.log('Admin user seeded successfully.');
          }
        );
      }
    });

    // Seed Places
    const samplePlaces = [
      {
        name: 'Қожа Ахмет Ясауи кесенесі',
        description: 'XIV ғасырдың соңында Әмір Темірдің бұйрығымен салынған, Түркістанның басты тарихи және рухани символы. ЮНЕСКО-ның бүкіләлемдік мұралар тізіміне енген сәулет өнерінің жауһары.',
        category: 'historical',
        lat: 43.2982,
        lng: 68.2711,
        images: JSON.stringify(['https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 5.0
      },
      {
        name: 'Керуен-сарай туристік кешені',
        description: '"Орталық Азиядағы Венеция" деп аталатын, заманауи ірі туристік кешен. Мұнда су айдындары, қайықтар шеруі, «Ұшатын театр», амфитеатр, қонақ үйлер және мейрамханалар орналасқан.',
        category: 'leisure',
        lat: 43.2935,
        lng: 68.2678,
        images: JSON.stringify(['https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.8
      },
      {
        name: 'Қылует жерасты мешіті',
        description: 'Қожа Ахмет Ясауи бабамыз пайғамбар жасына (63 жас) толғаннан кейін өмірінің соңына дейін құлшылық етіп, кітап жазған тарихи жерасты мешіті. Кесене маңында орналасқан.',
        category: 'historical',
        lat: 43.2965,
        lng: 68.2725,
        images: JSON.stringify(['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.9
      },
      {
        name: 'Түркістан облыстық тарихи-өлкетану музейі',
        description: 'Түркістан өңірінің көне заманнан бүгінгі күнге дейінгі бай тарихын, археологиялық және этнографиялық жәдігерлерін қамтитын негізгі мәдени орталық.',
        category: 'cultural',
        lat: 43.3020,
        lng: 68.2780,
        images: JSON.stringify(['https://images.unsplash.com/photo-1582882757627-117b934335aa?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.7
      },
      {
        name: 'Көне Жұма мешіті',
        description: 'XVIII-XIX ғасырларға жататын, Ясауи кесенесінің жанында орналасқан тарихи мешіт. Қазіргі кезде мұражай ретінде жұмыс істейді және сол кезеңнің құрылыс стилін көрсетеді.',
        category: 'historical',
        lat: 43.2974,
        lng: 68.2705,
        images: JSON.stringify(['https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.6
      },
      {
        name: 'Ясауи саябағы',
        description: 'Кесене маңындағы жасыл желекке толы, субұрқақтары бар, серуендеуге және демалуға таптырмас әдемі саябақ. Туристер мен қала тұрғындарының сүйікті орны.',
        category: 'leisure',
        lat: 43.3000,
        lng: 68.2680,
        images: JSON.stringify(['https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.8
      },
      {
        name: 'Rixos Khadisha Turkistan қонақ үйі',
        description: 'Түркістан қаласындағы жоғары сапалы 5 жұлдызды сәнді қонақ үй. Керуен-сарай кешенінің маңында, туристер үшін толық жайлылық ұсынады.',
        category: 'hotel',
        lat: 43.2870,
        lng: 68.2750,
        images: JSON.stringify(['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.9
      },
      {
        name: 'Dariya Cafe & Restaurant',
        description: 'Түркістанның ұлттық және еуропалық тағамдарын, дәмді кәуаптары мен шұбатын ұсынатын танымал дәмхана.',
        category: 'food',
        lat: 43.2950,
        lng: 68.2650,
        images: JSON.stringify(['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.5
      },
      {
        name: 'Орталық кезекші дәріхана',
        description: 'Кесене мен басты қонақ үйлерге жақын орналасқан, 24/7 режимінде жұмыс істейтін кезекші дәріхана.',
        category: 'pharmacy',
        lat: 43.2910,
        lng: 68.2700,
        images: JSON.stringify(['https://images.unsplash.com/photo-1607619056574-7b8d304a2c06?auto=format&fit=crop&w=800&q=80']),
        rating_avg: 4.4
      }
    ];

    db.get('SELECT COUNT(*) AS count FROM places', (err, row) => {
      if (err) console.error(err);
      if (row && row.count === 0) {
        const stmt = db.prepare('INSERT INTO places (name, description, category, lat, lng, images, rating_avg) VALUES (?, ?, ?, ?, ?, ?, ?)');
        samplePlaces.forEach((p) => {
          stmt.run(p.name, p.description, p.category, p.lat, p.lng, p.images, p.rating_avg);
        });
        stmt.finalize((err) => {
          if (err) console.error('Error seeding places:', err.message);
          else console.log('Sample places seeded successfully.');
        });
      }
    });

    // Seed Reviews
    db.get('SELECT COUNT(*) AS count FROM reviews', (err, row) => {
      if (err) console.error(err);
      if (row && row.count === 0) {
        db.run(`INSERT INTO reviews (user_id, place_id, user_name, rating, comment, created_at) VALUES 
          (1, 1, 'Әлихан', 5, 'Өте керемет, рухани байлық алып қайттық! Күмбездің сәулеті таң қалдырады.', '2026-06-10 12:00'),
          (1, 2, 'Аружан', 5, 'Керуен-сарайдағы қайықтар шеруі өте керемет екен! Баруға кеңес беремін.', '2026-06-11 09:30')
        `);
        console.log('Sample reviews seeded.');
      }
    });
  });
}

initDatabase();

// Expose promise-based wrappers for async/await usage
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

module.exports = db;
