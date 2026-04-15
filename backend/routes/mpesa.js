// ============================================================
// M-PESA ROUTES - FULLY FIXED
// ROOT CAUSE of "still pending after payment":
//   Render free tier sleeps after 15min inactivity.
//   Safaricom's callback hits a sleeping server → callback lost.
//
// FIXES:
// 1. Added GET /query/:checkoutId — directly asks Daraja for status
//    Does NOT rely on callback at all — works on sleeping servers
// 2. /callback still records when server is awake (bonus)
// 3. Fixed phone formatting edge cases
// 4. Better error messages
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

async function getMpesaToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured.');
  const creds = Buffer.from(`${key}:${secret}`).toString('base64');
  const res   = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` }, timeout: 15000 }
  );
  return res.data.access_token;
}

function getTimestamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function getPassword(ts) {
  return Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`).toString('base64');
}

function formatPhone(raw) {
  let p = String(raw).replace(/\s+/g, '').replace(/^\+/, '');
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
  const parsedAmount   = Math.ceil(Number(amount));

  if (isNaN(parsedAmount) || parsedAmount < 1) {
    return res.status(400).json({ message: 'Please enter a valid amount (minimum KES 1).' });
  }
  if (!/^2547\d{8}$|^2541\d{8}$/.test(formattedPhone)) {
    return res.status(400).json({ message: 'Please enter a valid Safaricom number (07XX or 01XX).' });
  }

  try {
    const token     = await getMpesaToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) throw new Error('MPESA_CALLBACK_URL not set.');

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
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
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
      message: 'Payment prompt sent! Please enter your M-Pesa PIN on your phone.',
      checkoutRequestId
    });
  } catch (err) {
    const d = err.response?.data;
    console.error('STK Push error:', d || err.message);
    let msg = 'Payment initiation failed. Please try again.';
    if (err.message.includes('credentials'))            msg = 'M-Pesa is not configured. Contact the church.';
    if (d?.errorCode === '400.002.02')                  msg = 'Invalid phone number. Use your Safaricom number.';
    if (err.code === 'ECONNABORTED')                    msg = 'Request timed out. Please try again.';
    if (d?.errorMessage?.includes('wrong credentials')) msg = 'M-Pesa credentials error. Contact church admin.';
    res.status(500).json({ message: msg, detail: d || err.message });
  }
});

// ✅ GET /api/mpesa/query/:checkoutId
// Queries Daraja DIRECTLY — does NOT depend on callback arriving
// This is the PRIMARY way the frontend checks payment status
router.get('/query/:checkoutId', async (req, res) => {
  const { checkoutId } = req.params;
  try {
    const token     = await getMpesaToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);

    const queryRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutId
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );

    const { ResultCode, ResultDesc } = queryRes.data;
    const code = Number(ResultCode);

    if (code === 0) {
      // Success — update local record
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === checkoutId ? { ...p, status: 'Success' } : p
      ));
      return res.json({ status: 'Success', message: 'Payment confirmed!' });
    }
    if (code === 1032) {
      // Cancelled by user
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === checkoutId ? { ...p, status: 'Cancelled' } : p
      ));
      return res.json({ status: 'Cancelled', message: 'Payment was cancelled.' });
    }
    // Still pending (1037 = request pending, others = processing)
    return res.json({ status: 'Pending', message: ResultDesc || 'Still processing...' });

  } catch (err) {
    const d = err.response?.data;
    console.error('Query error:', d || err.message);
    // errorCode 500.001.1001 = "Request not processed yet" = still pending
    if (d?.errorCode === '500.001.1001') {
      return res.json({ status: 'Pending', message: 'Payment is being processed.' });
    }
    res.status(500).json({ status: 'Error', message: 'Could not check payment status.' });
  }
});

// GET /api/mpesa/status/:checkoutId (local fallback)
router.get('/status/:checkoutId', (req, res) => {
  const payments = readData('payments');
  const payment  = payments.find(p => p.checkoutRequestId === req.params.checkoutId);
  if (!payment) return res.json({ status: 'Pending' });
  res.json({ status: payment.status, mpesaCode: payment.mpesaCode || null });
});

// POST /api/mpesa/callback
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
          ? { ...p, status: 'Success', mpesaCode, amount, phone }
          : p
      ));
      appendPayment({ phone, amount, mpesaCode, status: 'Success' })
        .catch(e => console.error('Sheets callback:', e.message));
      console.log(`✅ M-Pesa paid: ${mpesaCode} KES ${amount}`);
    } else {
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === CheckoutRequestID ? { ...p, status: 'Failed' } : p
      ));
    }
  } catch (err) {
    console.error('Callback error:', err.message);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
