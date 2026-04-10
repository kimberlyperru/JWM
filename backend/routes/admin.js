// ============================================================
// ADMIN ROUTES - Protected, requires JWT token
// ============================================================
const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const { readData, deleteRecord } = require('../utils/storage');

// All admin routes require authentication
router.use(authMiddleware);

// GET /api/admin/appointments
router.get('/appointments', (req, res) => {
  const data = readData('appointments');
  res.json({ success: true, data, count: data.length });
});

// GET /api/admin/members
router.get('/members', (req, res) => {
  const data = readData('members');
  res.json({ success: true, data, count: data.length });
});

// GET /api/admin/pledges
router.get('/pledges', (req, res) => {
  const data = readData('pledges');
  res.json({ success: true, data, count: data.length });
});

// GET /api/admin/payments
router.get('/payments', (req, res) => {
  const data = readData('payments');
  res.json({ success: true, data, count: data.length });
});

// GET /api/admin/summary
router.get('/summary', (req, res) => {
  const appointments = readData('appointments');
  const members = readData('members');
  const pledges = readData('pledges');
  const payments = readData('payments');

  const totalPledges = pledges.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const successfulPayments = payments.filter(p => p.status === 'Success');
  const totalCollected = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  res.json({
    success: true,
    summary: {
      totalAppointments: appointments.length,
      totalMembers: members.length,
      totalPledges: pledges.length,
      totalPledgeAmount: totalPledges,
      totalPayments: successfulPayments.length,
      totalCollected
    }
  });
});

// DELETE /api/admin/:type/:id
router.delete('/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const validTypes = ['appointments', 'members', 'pledges', 'payments'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid type' });
  }
  deleteRecord(type, id);
  res.json({ success: true, message: 'Record deleted' });
});

module.exports = router;
