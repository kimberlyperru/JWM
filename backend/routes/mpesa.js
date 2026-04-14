// ============================================================
// M-PESA ROUTES - FIXED
// FIXES:
// 1. Sandbox callback URL won't work if Render server is asleep.
//    Added manual "confirm" endpoint so admin can mark paid.
// 2. The timeout closure captured stale 'status' value.
//    Fixed by using a separate flag ref.
// 3. Added better error messages for common Daraja failures.
// 4. Phone formatting now handles 254 prefix correctly.
// ============================================================
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { appendRecord, readData, writeData } = require('../utils/storage');
const { appendPayment } = require('../utils/sheetsService');

// ✅ FIXED: Determine base URL once at startup (not per-request)
const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE = MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Get OAuth token from Safaricom
async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured.');

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` }, timeout: 15000 }
  );
  return res.data.access_token;
}

// Generate password: base64(Shortcode + Passkey + Timestamp)
function generatePassword(timestamp) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

// ✅ Format phone number to 254XXXXXXXXX
function formatPhone(phone) {
  let p = String(phone).replace(/\s+/g, '').replace(/^\+/, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

// POST /api/mpesa/stkpush
router.post('/stkpush', async (req, res) => {
  let { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ message: 'Phone number and amount are required.' });
  }

  const formattedPhone = formatPhone(phone);
  const parsedAmount = Math.ceil(Number(amount));

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Please enter a valid amount (minimum KES 1).' });
  }

  // Validate phone format
  if (!/^2547\d{8}$|^2541\d{8}$/.test(formattedPhone)) {
    return res.status(400).json({
      message: 'Please enter a valid Safaricom number (07XX or 01XX format).'
    });
  }

  try {
    const token = await getMpesaToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const password = generatePassword(timestamp);

    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) throw new Error('MPESA_CALLBACK_URL not configured.');

    const stkRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: parsedAmount,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: 'JWM Kajiado',
        TransactionDesc: 'Church Offering/Tithe'
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      }
    );

    const checkoutRequestId = stkRes.data.CheckoutRequestID;

    // Save to local storage with pending status
    appendRecord('payments', {
      phone: formattedPhone,
      amount: parsedAmount,
      status: 'Pending',
      checkoutRequestId,
      environment: MPESA_ENV
    });

    // Log to Google Sheets (non-blocking)
    appendPayment({ phone: formattedPhone, amount: parsedAmount, status: 'Pending' })
      .catch(err => console.error('Sheets error:', err.message));

    res.json({
      success: true,
      message: 'Payment prompt sent! Check your phone and enter your M-Pesa PIN.',
      checkoutRequestId
    });

  } catch (err) {
    const errData = err.response?.data;
    console.error('M-Pesa STK Push error:', errData || err.message);

    // Give helpful messages for common Daraja errors
    let userMessage = 'Payment initiation failed. Please try again.';
    if (err.message.includes('credentials')) userMessage = 'M-Pesa is not configured. Please contact the church.';
    if (errData?.errorCode === '400.002.02') userMessage = 'Invalid phone number. Please use your Safaricom number.';
    if (err.code === 'ECONNABORTED') userMessage = 'Request timed out. Please check your connection and try again.';

    res.status(500).json({ message: userMessage, error: errData || err.message });
  }
});

// POST /api/mpesa/callback — Safaricom sends result here
router.post('/callback', async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = body;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      let mpesaCode = '', amount = '', phone = '';

      CallbackMetadata.Item.forEach(item => {
        if (item.Name === 'MpesaReceiptNumber') mpesaCode = item.Value;
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'PhoneNumber') phone = String(item.Value);
      });

      // Update payment record to Success
      const payments = readData('payments');
      const updated = payments.map(p =>
        p.checkoutRequestId === CheckoutRequestID
          ? { ...p, status: 'Success', mpesaCode, amount, phone }
          : p
      );
      writeData('payments', updated);

      // Update Google Sheets
      appendPayment({ phone, amount, mpesaCode, status: 'Success' })
        .catch(err => console.error('Sheets callback error:', err.message));

      console.log(`✅ M-Pesa payment confirmed: ${mpesaCode} — KES ${amount} from ${phone}`);
    } else {
      // Payment failed or cancelled — update status
      const payments = readData('payments');
      const updated = payments.map(p =>
        p.checkoutRequestId === CheckoutRequestID
          ? { ...p, status: 'Failed' }
          : p
      );
      writeData('payments', updated);
      console.log(`❌ M-Pesa payment failed/cancelled. Code: ${ResultCode}`);
    }
  } catch (err) {
    console.error('Callback processing error:', err.message);
  }

  // Always respond 200 to Safaricom
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// GET /api/mpesa/status/:checkoutId — Frontend polls this
router.get('/status/:checkoutId', (req, res) => {
  const payments = readData('payments');
  const payment = payments.find(p => p.checkoutRequestId === req.params.checkoutId);

  if (!payment) {
    return res.json({ status: 'Pending', message: 'Payment not found yet.' });
  }

  res.json({
    status: payment.status,
    mpesaCode: payment.mpesaCode || null,
    amount: payment.amount || null,
    phone: payment.phone || null
  });
});

// ✅ NEW: POST /api/mpesa/confirm — Manual confirmation for sandbox/testing
// Use this when the callback doesn't fire (e.g. Render server was asleep)
router.post('/confirm', (req, res) => {
  const { checkoutId, mpesaCode } = req.body;
  if (!checkoutId) return res.status(400).json({ message: 'checkoutId is required.' });

  const payments = readData('payments');
  const idx = payments.findIndex(p => p.checkoutRequestId === checkoutId);

  if (idx === -1) return res.status(404).json({ message: 'Payment record not found.' });

  payments[idx].status = 'Success';
  payments[idx].mpesaCode = mpesaCode || 'MANUAL';
  writeData('payments', payments);

  res.json({ success: true, message: 'Payment marked as successful.' });
});

module.exports = router;
