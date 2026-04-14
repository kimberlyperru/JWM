// ============================================================
// APPOINTMENTS ROUTES - FIXED
// BUG FIX: new Date('YYYY-MM-DD') parses as UTC midnight.
// In EAT (UTC+3), that becomes 3am Wednesday = Wednesday ✓
// BUT on the server (often UTC), it's midnight Tuesday = getDay()===2 ✗
// FIX: Parse year/month/day manually to avoid timezone shift.
// ============================================================
const express = require('express');
const router = express.Router();
const { readData, appendRecord } = require('../utils/storage');
const { sendEmail, appointmentEmailHtml } = require('../utils/emailService');
const { appendAppointment } = require('../utils/sheetsService');
const { generateAppointmentPDF } = require('../utils/pdfService');

// Generate all 30-min slots from 9:00 AM to 3:00 PM (12 slots)
function generateSlots() {
  const slots = [];
  for (let hour = 9; hour < 15; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const start = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const endHour = min === 30 ? hour + 1 : hour;
      const endMin = min === 30 ? '00' : '30';
      const end = `${String(endHour).padStart(2, '0')}:${endMin}`;
      slots.push(`${start} - ${end}`);
    }
  }
  return slots;
}

const ALL_SLOTS = generateSlots();

// ✅ FIXED: Parse date string as LOCAL date (not UTC) to avoid day-shift bugs
function parseDateLocal(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number);
  // month is 0-indexed in JS
  return new Date(year, month - 1, day);
}

function isWednesday(dateStr) {
  const d = parseDateLocal(dateStr);
  return d.getDay() === 3;
}

// GET /api/appointments/slots?date=YYYY-MM-DD
router.get('/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date is required.' });

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  if (!isWednesday(date)) {
    return res.status(400).json({
      message: 'Appointments are only available on Wednesdays. Please select a Wednesday.'
    });
  }

  const appointments = readData('appointments');
  const bookedSlots = appointments
    .filter(a => a.date === date)
    .map(a => a.timeSlot);

  const slotsWithStatus = ALL_SLOTS.map(slot => ({
    slot,
    available: !bookedSlots.includes(slot)
  }));

  res.json({ date, slots: slotsWithStatus });
});

// POST /api/appointments/book
router.post('/book', async (req, res) => {
  const { name, phone, date, timeSlot, purpose } = req.body;

  if (!name || !phone || !date || !timeSlot) {
    return res.status(400).json({ message: 'Name, phone, date and time slot are all required.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  // ✅ FIXED: Use local date parser
  if (!isWednesday(date)) {
    return res.status(400).json({
      message: 'Appointments are only available on Wednesdays.'
    });
  }

  // Validate slot is one of the allowed slots
  if (!ALL_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ message: 'Invalid time slot selected.' });
  }

  // ✅ Real-time slot check to prevent race conditions / overbooking
  const appointments = readData('appointments');
  const slotTaken = appointments.some(
    a => a.date === date && a.timeSlot === timeSlot
  );

  if (slotTaken) {
    return res.status(409).json({
      message: 'Sorry, this slot has just been booked. Please try another time or date.'
    });
  }

  // Save the appointment
  const newAppointment = appendRecord('appointments', {
    name, phone, date, timeSlot, purpose: purpose || ''
  });

  // Send email to church (non-blocking — don't fail booking if email fails)
  sendEmail({
    to: process.env.CHURCH_EMAIL,
    subject: `New Appointment — ${name} on ${date} at ${timeSlot}`,
    html: appointmentEmailHtml({ name, phone, date, timeSlot, purpose })
  }).catch(err => console.error('Email error:', err.message));

  // Generate and attach PDF (non-blocking)
  generateAppointmentPDF({ name, phone, date, timeSlot, purpose })
    .then(pdfBuffer => sendEmail({
      to: process.env.CHURCH_EMAIL,
      subject: `Appointment PDF — ${name}`,
      html: '<p>Appointment confirmation PDF attached.</p>',
      attachments: [{
        filename: `appointment_${name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer
      }]
    }))
    .catch(err => console.error('PDF/email error:', err.message));

  // Append to Google Sheets (non-blocking)
  appendAppointment({ name, phone, date, timeSlot, purpose })
    .catch(err => console.error('Sheets error:', err.message));

  res.json({
    success: true,
    message: `✅ Appointment confirmed for ${date} at ${timeSlot}. Please arrive 5 minutes early.`,
    appointment: newAppointment
  });
});

module.exports = router;
