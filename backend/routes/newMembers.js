// ============================================================
// NEW MEMBERS ROUTES
// ============================================================
const express = require('express');
const router = express.Router();
const { appendRecord } = require('../utils/storage');
const { sendEmail, memberEmailHtml } = require('../utils/emailService');
const { appendMember } = require('../utils/sheetsService');
const { generateMemberPDF } = require('../utils/pdfService');

// POST /api/members/register
router.post('/register', async (req, res) => {
  const { name, phone, gender, age, maritalStatus, spouseName, kids } = req.body;

  if (!name || !phone || !gender || !age || !maritalStatus) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  const member = appendRecord('members', {
    name, phone, gender, age, maritalStatus,
    spouseName: spouseName || '',
    kids: kids || []
  });

  // Email to church
  await sendEmail({
    to: process.env.CHURCH_EMAIL,
    subject: `New Member Registration - ${name}`,
    html: memberEmailHtml({ name, phone, gender, age, maritalStatus, spouseName, kids })
  });

  // PDF attachment
  try {
    const pdfBuffer = await generateMemberPDF({ name, phone, gender, age, maritalStatus, spouseName, kids });
    await sendEmail({
      to: process.env.CHURCH_EMAIL,
      subject: `New Member PDF - ${name}`,
      html: '<p>New member registration PDF attached.</p>',
      attachments: [{ filename: `member_${name.replace(/\s/g,'_')}.pdf`, content: pdfBuffer }]
    });
  } catch (err) {
    console.error('PDF error:', err.message);
  }

  // Google Sheets
  await appendMember({ name, phone, gender, age, maritalStatus, spouseName, kids });

  res.json({
    success: true,
    message: 'Welcome to JWM Kajiado! We are glad you are here. God bless you.',
    member
  });
});

module.exports = router;
