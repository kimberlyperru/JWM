// ============================================================
// JWM KAJIADO CHURCH - MAIN SERVER (FIXED)
// FIXES:
// 1. CORS now accepts BOTH localhost AND Render frontend URL
// 2. Added origin whitelist to prevent blocking live site
// 3. Added trust proxy for Render deployment
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const newMemberRoutes  = require('./routes/newMembers');
const pledgeRoutes     = require('./routes/pledges');
const mpesaRoutes      = require('./routes/mpesa');
const adminRoutes      = require('./routes/admin');
const pdfRoutes        = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ FIXED: Trust Render's proxy (needed for rate limiting on cloud)
app.set('trust proxy', 1);

// ✅ FIXED: CORS — allow localhost AND Render frontend AND any onrender.com subdomain
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  // Catch-all for any Render subdomain
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, Safaricom callback)
    if (!origin) return callback(null, true);
    // Allow any onrender.com URL (covers all Render deployments)
    if (origin.endsWith('.onrender.com')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a moment and try again.' }
});
app.use('/api/', limiter);

// ---- Routes ----
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/members',      newMemberRoutes);
app.use('/api/pledges',      pledgeRoutes);
app.use('/api/mpesa',        mpesaRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/pdf',          pdfRoutes);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'JWM Church Server is running',
    env: process.env.MPESA_ENV || 'not set',
    time: new Date().toISOString()
  });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// ---- Global error handler ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`✅ JWM Church Server running on port ${PORT}`);
  console.log(`   M-Pesa mode: ${process.env.MPESA_ENV || 'not configured'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
});

module.exports = app;
