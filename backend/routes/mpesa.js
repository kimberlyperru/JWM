// ============================================================
// M-PESA ROUTES - Safaricom Daraja STK Push
// ============================================================
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { appendRecord } = require('../utils/storage');
const { appendPayment } = require('../utils/sheetsService');

const MPESA_BASE = process.env.MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Get OAuth token from Safaricom
async function getMpesaToken() {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const res = await axios.get(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` }
  });
  return res.data.access_token;
}

// Generate the password (base64 of Shortcode+Passkey+Timestamp)
function generatePassword(timestamp) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

// POST /api/mpesa/stkpush
router.post('/stkpush', async (req, res) => {
  let { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ message: 'Phone number and amount are required.' });
  }

  // Format phone: ensure it starts with 254
  phone = phone.toString().replace(/^0/, '254').replace(/^\+/, '');
  amount = Math.ceil(Number(amount));

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Please enter a valid amount.' });
  }

  try {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = generatePassword(timestamp);

    const stkRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: 'JWM Kajiado',
        TransactionDesc: 'Church Offering/Tithe'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save to local storage with pending status
    appendRecord('payments', { phone, amount, status: 'Pending', checkoutRequestId: stkRes.data.CheckoutRequestID });
    await appendPayment({ phone, amount, status: 'Pending' });

    res.json({
      success: true,
      message: 'A payment prompt has been sent to your phone. Please enter your M-Pesa PIN.',
      checkoutRequestId: stkRes.data.CheckoutRequestID
    });
  } catch (err) {
    console.error('M-Pesa error:', err.response?.data || err.message);
    res.status(500).json({
      message: 'Payment initiation failed. Please check your phone number and try again.',
      error: err.response?.data || err.message
    });
  }
});

// POST /api/mpesa/callback - Safaricom sends payment result here
router.post('/callback', async (req, res) => {
  const body = req.body?.Body?.stkCallback;
  if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = body;

  let mpesaCode = '';
  let amount = '';
  let phone = '';

  if (ResultCode === 0 && CallbackMetadata?.Item) {
    CallbackMetadata.Item.forEach(item => {
      if (item.Name === 'MpesaReceiptNumber') mpesaCode = item.Value;
      if (item.Name === 'Amount') amount = item.Value;
      if (item.Name === 'PhoneNumber') phone = item.Value;
    });

    // Update payment record
    const { readData, writeData } = require('../utils/storage');
    const payments = readData('payments');
    const updated = payments.map(p => {
      if (p.checkoutRequestId === CheckoutRequestID) {
        return { ...p, status: 'Success', mpesaCode, amount, phone };
      }
      return p;
    });
    writeData('payments', updated);
    await appendPayment({ phone, amount, mpesaCode, status: 'Success' });
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// GET /api/mpesa/status/:checkoutId - Poll payment status
router.get('/status/:checkoutId', (req, res) => {
  const { readData } = require('../utils/storage');
  const payments = readData('payments');
  const payment = payments.find(p => p.checkoutRequestId === req.params.checkoutId);
  if (!payment) return res.json({ status: 'Pending' });
  res.json({ status: payment.status, mpesaCode: payment.mpesaCode });
});

module.exports = router;
