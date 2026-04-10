// ============================================================
// PLEDGES ROUTES
// ============================================================
const express = require('express');
const router = express.Router();
const { appendRecord } = require('../utils/storage');
const { sendEmail, pledgeEmailHtml } = require('../utils/emailService');
const { appendPledge } = require('../utils/sheetsService');
const { generatePledgePDF } = require('../utils/pdfService');

// POST /api/pledges/submit
router.post('/submit', async (req, res) => {
  const { name, phone, amount, paymentDate, pledgeFor } = req.body;

  if (!name || !phone || !amount || !paymentDate || !pledgeFor) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Please enter a valid amount.' });
  }

  const pledge = appendRecord('pledges', { name, phone, amount, paymentDate, pledgeFor });

  // Email to church
  await sendEmail({
    to: process.env.CHURCH_EMAIL,
    subject: `New Pledge - ${name} | KES ${amount}`,
    html: pledgeEmailHtml({ name, phone, amount, paymentDate, pledgeFor })
  });

  // PDF attachment
  try {
    const pdfBuffer = await generatePledgePDF({ name, phone, amount, paymentDate, pledgeFor });
    await sendEmail({
      to: process.env.CHURCH_EMAIL,
      subject: `Pledge PDF - ${name}`,
      html: '<p>New pledge PDF attached.</p>',
      attachments: [{ filename: `pledge_${name.replace(/\s/g,'_')}.pdf`, content: pdfBuffer }]
    });
  } catch (err) {
    console.error('PDF error:', err.message);
  }

  // Google Sheets
  await appendPledge({ name, phone, amount, paymentDate, pledgeFor });

  res.json({
    success: true,
    message: 'Your pledge has been received. God bless your generosity!',
    pledge
  });
});

module.exports = router;
