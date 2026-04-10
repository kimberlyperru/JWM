// ============================================================
// JWM KAJIADO CHURCH - MAIN SERVER
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const newMemberRoutes = require('./routes/newMembers');
const pledgeRoutes = require('./routes/pledges');
const mpesaRoutes = require('./routes/mpesa');
const adminRoutes = require('./routes/admin');
const pdfRoutes = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://*.onrender.com'
  ],
  credentials: true
}));

app.use(express.json());

// Rate limiting - prevent spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
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
  res.json({ status: 'ok', message: 'JWM Church Server is running' });
});

app.listen(PORT, () => {
  console.log(`✅ JWM Church Server running on port ${PORT}`);
});

module.exports = app;
