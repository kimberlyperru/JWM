// ============================================================
// APPOINTMENTS ROUTES
// Wednesday only, 9am-3pm, 30-min slots, anti-overbooking
// ============================================================
const express = require('express');
const router = express.Router();
const { readData, appendRecord } = require('../utils/storage');
const { sendEmail, appointmentEmailHtml } = require('../utils/emailService');
const { appendAppointment } = require('../utils/sheetsService');
const { generateAppointmentPDF } = require('../utils/pdfService');

// Generate all 30-min slots from 9:00 AM to 3:00 PM
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
  return slots; // 12 slots: 9:00-9:30, 9:30-10:00 ... 14:30-15:00
}

const ALL_SLOTS = generateSlots();

// GET /api/appointments/slots?date=YYYY-MM-DD
router.get('/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date required' });

  // Validate it's a Wednesday
  const dayOfWeek = new Date(date).getDay();
  // new Date('YYYY-MM-DD') gives local midnight. Use UTC to avoid timezone issues.
  const d = new Date(date + 'T00:00:00');
  if (d.getDay() !== 3) {
    return res.status(400).json({ message: 'Appointments are only available on Wednesdays.' });
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
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate Wednesday
  const d = new Date(date + 'T00:00:00');
  if (d.getDay() !== 3) {
    return res.status(400).json({ message: 'Appointments are only on Wednesdays.' });
  }

  // Check slot availability (real-time check to prevent race conditions)
  const appointments = readData('appointments');
  const slotTaken = appointments.some(a => a.date === date && a.timeSlot === timeSlot);
  if (slotTaken) {
    return res.status(409).json({
      message: 'Sorry, this slot is already booked. Please try another time or date.'
    });
  }

  const newAppointment = appendRecord('appointments', { name, phone, date, timeSlot, purpose });

  // Send email to church
  await sendEmail({
    to: process.env.CHURCH_EMAIL,
    subject: `New Appointment - ${name} on ${date} at ${timeSlot}`,
    html: appointmentEmailHtml({ name, phone, date, timeSlot, purpose })
  });

  // Generate PDF and send confirmation to church
  try {
    const pdfBuffer = await generateAppointmentPDF({ name, phone, date, timeSlot, purpose });
    await sendEmail({
      to: process.env.CHURCH_EMAIL,
      subject: `Appointment PDF - ${name}`,
      html: '<p>Please find the appointment confirmation PDF attached.</p>',
      attachments: [{ filename: `appointment_${name.replace(/\s/g,'_')}.pdf`, content: pdfBuffer }]
    });
  } catch (err) {
    console.error('PDF generation error:', err.message);
  }

  // Append to Google Sheets
  await appendAppointment({ name, phone, date, timeSlot, purpose });

  res.json({
    success: true,
    message: `Appointment booked for ${date} at ${timeSlot}. See you then!`,
    appointment: newAppointment
  });
});

module.exports = router;
