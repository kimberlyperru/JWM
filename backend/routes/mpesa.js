// ============================================================
// M-PESA ROUTES - FIXED FOR RENDER
//
// WHY IT FAILS ON RENDER BUT WORKS LOCALLY:
// 1. Render free tier cold-starts take 30-60 seconds.
//    The Daraja OAuth token request (15s timeout) fires during
//    cold start and times out → "Payment initiation failed."
// 2. The Safaricom callback URL hits a sleeping server → lost.
//
// FIXES:
// 1. Token request has RETRY logic (3 attempts, 20s each)
// 2. Full STK push has 45s timeout to survive cold starts
// 3. /query endpoint asks Daraja directly for status (no callback)
// 4. Warm-up endpoint to pre-wake the server before payment
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

// ── Token with retry ─────────────────────────────────────────
async function getMpesaToken(retries = 3) {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured in environment.');

  const creds = Buffer.from(`${key}:${secret}`).toString('base64');
  let lastErr;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(
        `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${creds}` }, timeout: 20000 }
      );
      return res.data.access_token;
    } catch (err) {
      lastErr = err;
      console.warn(`Daraja token attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) await new Promise(r => setTimeout(r, 3000)); // wait 3s then retry
    }
  }
  throw lastErr;
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

// ── GET /api/mpesa/warmup ─────────────────────────────────────
// Frontend calls this first to wake the server before payment
router.get('/warmup', async (req, res) => {
  try {
    await getMpesaToken();
    res.json({ ready: true, message: 'M-Pesa is ready.' });
  } catch (err) {
    res.json({ ready: false, message: 'M-Pesa warming up, try in 30 seconds.' });
  }
});

// ── POST /api/mpesa/stkpush ───────────────────────────────────
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
    return res.status(400).json({
      message: 'Please enter a valid Safaricom number (starts with 07XX or 01XX).'
    });
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!callbackUrl) {
    return res.status(500).json({ message: 'M-Pesa callback URL not configured.' });
  }

  try {
    // Get token with retry logic
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
      .catch(e => console.error('Sheets payment:', e.message));

    res.json({
      success: true,
      message: 'Payment prompt sent! Please enter your M-Pesa PIN on your phone.',
      checkoutRequestId
    });

  } catch (err) {
    const d = err.response?.data;
    console.error('STK Push error:', JSON.stringify(d || err.message));

    let msg = 'Payment initiation failed. Please try again.';
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      msg = 'The payment server is warming up. Please wait 30 seconds and try again.';
    } else if (err.message.includes('credentials') || err.message.includes('not configured')) {
      msg = 'M-Pesa is not configured. Please contact the church admin.';
    } else if (d?.errorCode === '400.002.02') {
      msg = 'Invalid phone number. Please use your Safaricom number (07XX format).';
    } else if (d?.errorMessage?.includes('wrong credentials')) {
      msg = 'M-Pesa API credentials are incorrect. Contact church admin.';
    } else if (d?.ResultDesc) {
      msg = d.ResultDesc;
    }

    res.status(500).json({ message: msg, detail: d || err.message });
  }
});

// ── GET /api/mpesa/query/:checkoutId ─────────────────────────
// Queries Daraja DIRECTLY — works even when callback was never delivered
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
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
    );

    const code = Number(queryRes.data.ResultCode);

    if (code === 0) {
      // Success — update local record
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === checkoutId ? { ...p, status: 'Success' } : p
      ));
      return res.json({ status: 'Success', message: 'Payment confirmed!' });
    }
    if (code === 1032) {
      const payments = readData('payments');
      writeData('payments', payments.map(p =>
        p.checkoutRequestId === checkoutId ? { ...p, status: 'Cancelled' } : p
      ));
      return res.json({ status: 'Cancelled', message: 'Payment was cancelled by user.' });
    }

    return res.json({ status: 'Pending', message: queryRes.data.ResultDesc || 'Still processing...' });

  } catch (err) {
    const d = err.response?.data;
    // 500.001.1001 = request not yet processed = still pending
    if (d?.errorCode === '500.001.1001') {
      return res.json({ status: 'Pending', message: 'Payment is being processed.' });
    }
    console.error('Query error:', d || err.message);
    res.status(500).json({ status: 'Error', message: 'Could not check payment status.' });
  }
});

// ── GET /api/mpesa/status/:checkoutId ────────────────────────
router.get('/status/:checkoutId', (req, res) => {
  const payments = readData('payments');
  const payment  = payments.find(p => p.checkoutRequestId === req.params.checkoutId);
  if (!payment) return res.json({ status: 'Pending' });
  res.json({ status: payment.status, mpesaCode: payment.mpesaCode || null });
});

// ── POST /api/mpesa/callback ──────────────────────────────────
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
      console.log(`✅ M-Pesa paid: ${mpesaCode} KES ${amount} from ${phone}`);
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
