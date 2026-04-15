// ============================================================
// APPOINTMENTS ROUTES - FIXED
// BUG: new Date('YYYY-MM-DD') parses as UTC midnight.
// On Render (UTC server), Wednesday in EAT becomes Tuesday UTC.
// FIX: Parse year/month/day manually → always local date.
// ============================================================
const express = require('express');
const router  = express.Router();
const { readData, appendRecord } = require('../utils/storage');
const { sendEmail, appointmentEmailHtml } = require('../utils/emailService');
const { appendAppointment } = require('../utils/sheetsService');
const { generateAppointmentPDF } = require('../utils/pdfService');

function generateSlots() {
  const slots = [];
  for (let hour = 9; hour < 15; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const start   = `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
      const endHour = min === 30 ? hour + 1 : hour;
      const endMin  = min === 30 ? '00' : '30';
      const end     = `${String(endHour).padStart(2,'0')}:${endMin}`;
      slots.push(`${start} - ${end}`);
    }
  }
  return slots; // 12 slots
}
const ALL_SLOTS = generateSlots();

// ✅ FIXED: Parse YYYY-MM-DD as LOCAL date (avoids UTC timezone shift)
function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // month is 0-indexed
}

function isWednesday(dateStr) {
  return parseDateLocal(dateStr).getDay() === 3;
}

// GET /api/appointments/slots?date=YYYY-MM-DD
router.get('/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  if (!isWednesday(date)) {
    return res.status(400).json({ message: 'Appointments are only available on Wednesdays.' });
  }

  const appointments = readData('appointments');
  const bookedSlots  = appointments.filter(a => a.date === date).map(a => a.timeSlot);
  const slotsWithStatus = ALL_SLOTS.map(slot => ({
    slot, available: !bookedSlots.includes(slot)
  }));

  res.json({ date, slots: slotsWithStatus });
});

// POST /api/appointments/book
router.post('/book', async (req, res) => {
  const { name, phone, date, timeSlot, purpose } = req.body;
  if (!name || !phone || !date || !timeSlot) {
    return res.status(400).json({ message: 'Name, phone, date and time slot are required.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: 'Invalid date format.' });
  }
  if (!isWednesday(date)) {
    return res.status(400).json({ message: 'Appointments are only available on Wednesdays.' });
  }
  if (!ALL_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ message: 'Invalid time slot.' });
  }

  const appointments = readData('appointments');
  const slotTaken    = appointments.some(a => a.date === date && a.timeSlot === timeSlot);
  if (slotTaken) {
    return res.status(409).json({
      message: 'Sorry, this slot was just booked. Please try another time or date.'
    });
  }

  const newAppt = appendRecord('appointments', { name, phone, date, timeSlot, purpose: purpose || '' });

  // Non-blocking side effects
  sendEmail({
    to: process.env.CHURCH_EMAIL,
    subject: `New Appointment — ${name} on ${date} at ${timeSlot}`,
    html: appointmentEmailHtml({ name, phone, date, timeSlot, purpose })
  }).catch(e => console.error('Email:', e.message));

  generateAppointmentPDF({ name, phone, date, timeSlot, purpose })
    .then(pdf => sendEmail({
      to: process.env.CHURCH_EMAIL,
      subject: `Appointment PDF — ${name}`,
      html: '<p>Appointment PDF attached.</p>',
      attachments: [{ filename: `appt_${name.replace(/\s+/g,'_')}.pdf`, content: pdf }]
    }))
    .catch(e => console.error('PDF:', e.message));

  appendAppointment({ name, phone, date, timeSlot, purpose })
    .catch(e => console.error('Sheets:', e.message));

  res.json({
    success: true,
    message: `Appointment confirmed for ${date} at ${timeSlot}. Please arrive 5 minutes early.`,
    appointment: newAppt
  });
});

module.exports = router;
