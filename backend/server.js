// ============================================================
// JWM KAJIADO CHURCH - MAIN SERVER
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const newMemberRoutes = require('./routes/newMembers');
const pledgeRoutes = require('./routes/pledges');
const mpesaRoutes = require('./routes/mpesa');
const adminRoutes = require('./routes/admin');
const pdfRoutes = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- CORS Configuration ----
// Updated to handle multiple origins and preflight requests correctly
const allowedOrigins = [
  'http://localhost:3000',
  'https://jwm-frontend.onrender.com', // Replace with your actual frontend URL if different
  process.env.FRONTEND_URL
].filter(Boolean); // Removes undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Simple wildcard check for onrender subdomains if necessary
        const base = allowed.replace('*.', '');
        return origin.endsWith(base);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by JWM CORS Policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ---- Essential Middleware ----
app.use(express.json()); // Must be before routes

// ---- Rate Limiting ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});

// Apply limiter to all /api/ routes
app.use('/api/', limiter);

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/members', newMemberRoutes);
app.use('/api/pledges', pledgeRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'JWM Church Server is running',
    timestamp: new Date().toISOString()
  });
});

// ---- Error Handling Middleware ----
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`✅ JWM Church Server running on port ${PORT}`);
  console.log(`📡 Allowed Origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;