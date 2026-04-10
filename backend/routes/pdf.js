// ============================================================
// PDF DOWNLOAD ROUTES - Admin only
// ============================================================
const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const { readData } = require('../utils/storage');
const { generateAllRecordsPDF } = require('../utils/pdfService');

router.use(authMiddleware);

// GET /api/pdf/:type - Download all records as PDF
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const validTypes = ['appointments', 'members', 'pledges'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid type' });
  }

  const records = readData(type);
  const pdfBuffer = await generateAllRecordsPDF(type, records);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_report.pdf"`);
  res.send(pdfBuffer);
});

module.exports = router;
