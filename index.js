require('dotenv').config()
const express = require('express');
const path = require('path');
const favicon = require("serve-favicon");
const cookieParser = require('cookie-parser');
const cache = require('memory-cache');
const animeRouter = require('./routes/route');
const app = express();
const PORT = process.env.PORT || 3110;

// Setting EJS sebagai view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, "public", 'images', "favicon.png")));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Maelyn Group');
  res.setHeader('X-System-By', 'Archia');
  res.setHeader('X-Developed-By', 'Clayza Aubert');
  next();
});

// Middleware untuk menggunakan cache
const cacheMiddleware = (duration) => (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url;
    let cachedBody = cache.get(key);

    if (cachedBody) {
        res.send(cachedBody);
        return;
    } else {
        res.sendResponse = res.send;
        res.send = (body) => {
            cache.put(key, body, duration * 1000);
            res.sendResponse(body);
        };
        next();
    }
};

// Gunakan middleware cache untuk semua route
app.use(cacheMiddleware(60 * 10)); // Cache selama 10 menit

// Gunakan router
app.use('/', animeRouter);

app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const acceptHeader = req.headers['accept'];
    
    if (userAgent && !userAgent.includes('Mozilla')) {
        return res.status(403).send('Nonton Anime, Donghua dan baca komik hanya di https://realmtaku.uno');
    }
    
    if (req.method === 'GET' && acceptHeader && acceptHeader.includes('text/html') && !userAgent.includes('Mozilla')) {
        return res.status(403).send('Nonton Anime, Donghua dan baca komik hanya di https://realmtaku.uno');
    }

    if (req.method === 'GET' && acceptHeader && acceptHeader.includes('application/json')) {
        return res.status(403).json({ message: "Nonton Anime, Donghua dan baca komik hanya di https://realmtaku.uno" });
    }

    next();
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
