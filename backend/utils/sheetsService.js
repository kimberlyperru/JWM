// ============================================================
// GOOGLE SHEETS SERVICE - FIXED
// ROOT CAUSE of "error:1E08010C:DECODER routines::unsupported":
//   On Render dashboard, pasting the private key causes \n to be
//   stored as literal backslash+n (two chars), not a real newline.
//   The RSA key parser needs actual newline characters.
// FIX: Strip all quote wrapping, then replace every \n variant.
// ============================================================
const { google } = require('googleapis');

function getPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY || '';

  // Strip surrounding quotes (Render sometimes adds them)
  if ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Replace all escaped-newline variants with real newlines
  key = key
    .replace(/\\\\n/g, '\n')  // \\n  (double-escaped)
    .replace(/\\n/g, '\n')    // \n   (single-escaped)
    .trim();

  return key;
}

function getAuth() {
  const privateKey  = getPrivateKey();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  if (!privateKey || !clientEmail) {
    throw new Error('Google credentials missing (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY).');
  }
  return new google.auth.JWT({
    email: clientEmail,
    key:   privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function appendToSheet(sheetName, values) {
  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId:   process.env.GOOGLE_SHEET_ID,
      range:           `${sheetName}!A1`,
      valueInputOption:'USER_ENTERED',
      resource:        { values: [values] }
    });
    return true;
  } catch (err) {
    console.error(`Google Sheets error [${sheetName}]:`, err.message);
    if (err.message.includes('DECODER') || err.message.includes('unsupported')) {
      console.error('→ KEY FORMAT: On Render, paste private key WITHOUT surrounding quotes.');
      console.error('→ The key must start with -----BEGIN PRIVATE KEY----- on its own line.');
    }
    if (err.message.includes('403') || err.message.includes('PERMISSION')) {
      console.error('→ Share the Google Sheet with:', process.env.GOOGLE_CLIENT_EMAIL, '(Editor)');
    }
    return false; // Never crash the request over Sheets failure
  }
}

async function appendAppointment(data) {
  return appendToSheet('Appointments', [
    new Date().toLocaleDateString('en-KE'),
    data.name || '', data.phone || '', data.date || '',
    data.timeSlot || '', data.purpose || ''
  ]);
}

async function appendMember(data) {
  const kids = Array.isArray(data.kids)
    ? data.kids.map(k => `${k.name}(age ${k.age})`).join(', ') : '';
  return appendToSheet('Members', [
    new Date().toLocaleDateString('en-KE'),
    data.name || '', data.phone || '', data.gender || '',
    data.age || '', data.maritalStatus || '', data.spouseName || '', kids
  ]);
}

async function appendPledge(data) {
  return appendToSheet('Pledges', [
    new Date().toLocaleDateString('en-KE'),
    data.name || '', data.phone || '',
    `KES ${data.amount || 0}`, data.paymentDate || '', data.pledgeFor || ''
  ]);
}

async function appendPayment(data) {
  return appendToSheet('Payments', [
    new Date().toLocaleDateString('en-KE'),
    data.phone || '', `KES ${data.amount || 0}`,
    data.mpesaCode || 'Pending', data.status || 'Pending'
  ]);
}

module.exports = { appendAppointment, appendMember, appendPledge, appendPayment };
