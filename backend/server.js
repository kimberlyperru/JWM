// ============================================================
// JWM CHURCH SERVER - FIXED
// ============================================================
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes        = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const newMemberRoutes   = require('./routes/newMembers');
const pledgeRoutes      = require('./routes/pledges');
const mpesaRoutes       = require('./routes/mpesa');
const adminRoutes       = require('./routes/admin');
const pdfRoutes         = require('./routes/pdf');

const app  = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// ✅ CORS: allow localhost + any *.onrender.com automatically
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman, curl, Safaricom callbacks
    if (origin.endsWith('.onrender.com'))   return callback(null, true);
    if (origin.includes('localhost'))       return callback(null, true);
    if (origin === process.env.FRONTEND_URL) return callback(null, true);
    console.warn('CORS blocked:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests. Please wait and try again.' }
});
app.use('/api/', limiter);

// ✅ Routes — all mounted under /api/
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/members',      newMemberRoutes);
app.use('/api/pledges',      pledgeRoutes);
app.use('/api/mpesa',        mpesaRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/pdf',          pdfRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JWM Church Server running', time: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// Global error
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ JWM Server on port ${PORT} | M-Pesa: ${process.env.MPESA_ENV || 'not set'}`);
});

module.exports = app;
