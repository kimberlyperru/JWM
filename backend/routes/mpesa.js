// ============================================================
// backend/routes/mpesa.js  ← THIS IS A BACKEND FILE (Node.js)
// DO NOT confuse with frontend/src/pages/Mpesa.js (React)
// ============================================================
const express = require('express');
const axios   = require('axios');
const router  = express.Router();
const { appendRecord, readData, writeData } = require('../utils/storage');
const { appendPayment } = require('../utils/sheetsService');

const MPESA_ENV  = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE = MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Get Daraja OAuth token with retry (survives Render cold starts)
async function getMpesaToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET not set.');
  const creds = Buffer.from(`${key}:${secret}`).toString('base64');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(
        `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${creds}` }, timeout: 20000 }
      );
      return res.data.access_token;
    } catch (err) {
      console.warn(`Daraja token attempt ${attempt}/3:`, err.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
      else throw err;
    }
  }
}

function getTimestamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function getPassword(ts) {
  return Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`
  ).toString('base64');
}

function formatPhone(raw) {
  let p = String(raw).replace(/\s+/g, '').replace(/^\+/, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

// GET /api/mpesa/ping — lightweight check, no Daraja call
router.get('/ping', (req, res) => {
  res.json({ alive: true, time: new Date().toISOString() });
});

// POST /api/mpesa/stkpush
router.post('/stkpush', async (req, res) => {
  let { phone, amount } = req.body;
  if (!phone || !amount) {
    return res.status(400).json({ message: 'Phone number and amount are required.' });
  }
  const formattedPhone = formatPhone(phone);
  const parsedAmount   = Math.ceil(Number(amount));
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    return res.status(400).json({ message: 'Enter a valid amount (minimum KES 1).' });
  }
  if (!/^2547\d{8}$|^2541\d{8}$/.test(formattedPhone)) {
    return res.status(400).json({ message: 'Enter a valid Safaricom number (07XX or 01XX).' });
  }
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!callbackUrl) return res.status(500).json({ message: 'MPESA_CALLBACK_URL not configured.' });

  try {
    const token     = await getMpesaToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);
    const stkRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            parsedAmount,
        PartyA:            formattedPhone,
        PartyB:            process.env.MPESA_SHORTCODE,
        PhoneNumber:       formattedPhone,
        CallBackURL:       callbackUrl,
        AccountReference:  'JWM Kajiado',
        TransactionDesc:   'Church Offering/Tithe'
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 45000 }
    );
    const checkoutRequestId = stkRes.data.CheckoutRequestID;
    appendRecord('payments', {
      phone: formattedPhone, amount: parsedAmount,
      status: 'Pending', checkoutRequestId, environment: MPESA_ENV
    });
    appendPayment({ phone: formattedPhone, amount: parsedAmount, status: 'Pending' })
      .catch(e => console.error('Sheets:', e.message));
    res.json({
      success: true,
      message: 'Payment prompt sent! Enter your M-Pesa PIN on your phone.',
      checkoutRequestId
    });
  } catch (err) {
    const d = err.response?.data;
    console.error('STK Push error:', JSON.stringify(d || err.message));
    let msg = 'Payment failed. Please try again in a moment.';
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      msg = 'Connection timed out. Please try again — the server is warming up.';
    } else if (d?.errorCode === '400.002.02') {
      msg = 'Invalid phone number. Use your Safaricom number (07XX format).';
    } else if (d?.errorMessage?.includes('wrong credentials') || err.message?.includes('not set')) {
      msg = 'M-Pesa is not properly configured. Contact the church admin.';
    } else if (d?.ResultDesc) {
      msg = d.ResultDesc;
    }
    res.status(500).json({ message: msg });
  }
});

// GET /api/mpesa/query/:checkoutId — ask Daraja directly for payment status
router.get('/query/:checkoutId', async (req, res) => {
  const { checkoutId } = req.params;
  try {
    const token     = await getMpesaToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);
    const queryRes  = await axios.post(
      `${MPESA_BASE}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutId
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
    );
    const code = Number(queryRes.data.ResultCode);
    if (code === 0) {
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === checkoutId ? { ...p, status: 'Success' } : p
      ));
      return res.json({ status: 'Success' });
    }
    if (code === 1032) return res.json({ status: 'Cancelled' });
    return res.json({ status: 'Pending' });
  } catch (err) {
    const d = err.response?.data;
    if (d?.errorCode === '500.001.1001') return res.json({ status: 'Pending' });
    console.error('Query error:', d || err.message);
    res.status(500).json({ status: 'Error', message: 'Could not check status.' });
  }
});

// GET /api/mpesa/status/:checkoutId — local record lookup
router.get('/status/:checkoutId', (req, res) => {
  const payments = readData('payments');
  const payment  = payments.find(p => p.checkoutRequestId === req.params.checkoutId);
  if (!payment) return res.json({ status: 'Pending' });
  res.json({ status: payment.status, mpesaCode: payment.mpesaCode || null });
});

// POST /api/mpesa/callback — Safaricom calls this after payment
router.post('/callback', async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    const { ResultCode, CheckoutRequestID, CallbackMetadata } = body;
    if (Number(ResultCode) === 0 && CallbackMetadata?.Item) {
      let mpesaCode = '', amount = '', phone = '';
      CallbackMetadata.Item.forEach(item => {
        if (item.Name === 'MpesaReceiptNumber') mpesaCode = item.Value;
        if (item.Name === 'Amount')             amount    = String(item.Value);
        if (item.Name === 'PhoneNumber')        phone     = String(item.Value);
      });
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === CheckoutRequestID
          ? { ...p, status: 'Success', mpesaCode, amount, phone } : p
      ));
      appendPayment({ phone, amount, mpesaCode, status: 'Success' })
        .catch(e => console.error('Sheets callback:', e.message));
      console.log('M-Pesa paid:', mpesaCode, 'KES', amount);
    }
  } catch (err) { console.error('Callback error:', err.message); }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
