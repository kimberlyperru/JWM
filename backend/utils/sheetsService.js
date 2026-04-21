// ============================================================
// GOOGLE SHEETS SERVICE - FINAL FIX
// Checks for key.json in 3 locations (in order of preference):
//   1. /etc/secrets/key.json  — Render Secret File
//   2. backend/key.json       — local development
//   3. Env vars               — last resort fallback
// ============================================================
const { google } = require('googleapis');
const path = require('path');
const fs   = require('fs');

function getAuth() {
  // Locations to check for key.json
  const keyLocations = [
    '/etc/secrets/key.json',                        // Render Secret File
    path.join(__dirname, '..', 'key.json'),         // local: backend/key.json
    path.join(process.cwd(), 'key.json'),           // cwd fallback
  ];

  for (const keyPath of keyLocations) {
    if (fs.existsSync(keyPath)) {
      try {
        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (keyFile.client_email && keyFile.private_key) {
          console.log(`✅ Google Sheets: using key from ${keyPath}`);
          return new google.auth.JWT({
            email:  keyFile.client_email,
            key:    keyFile.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
        }
      } catch (e) {
        console.warn(`key.json at ${keyPath} failed to parse:`, e.message);
      }
    }
  }

  // Last resort: env vars
  let key   = process.env.GOOGLE_PRIVATE_KEY || '';
  const email = process.env.GOOGLE_CLIENT_EMAIL || '';

  if (!key || !email) {
    throw new Error(
      'Google credentials not found.\n' +
      'Run: cd backend && node generate-key-json.js\n' +
      'Then on Render: Settings → Secret Files → /etc/secrets/key.json'
    );
  }

  // Normalise the key
  key = key.replace(/^["']|["']$/g, '');
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '').trim();

  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY is malformed. Run generate-key-json.js to create key.json instead.'
    );
  }

  return new google.auth.JWT({
    email, key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function appendToSheet(sheetName, values) {
  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId:    process.env.GOOGLE_SHEET_ID,
      range:            `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource:         { values: [values] }
    });

    console.log(`✅ Sheets [${sheetName}]: row appended`);
    return true;

  } catch (err) {
    console.error(`❌ Sheets [${sheetName}]:`, err.message);

    if (err.message.includes('DECODER') || err.message.includes('unsupported')) {
      console.error(
        '\n── GOOGLE SHEETS FIX ──────────────────────────────────\n' +
        '1. Run this in your backend folder:\n' +
        '      node generate-key-json.js\n' +
        '2. This creates backend/key.json\n' +
        '3. On Render: go to your backend service\n' +
        '   → Settings → Secret Files\n' +
        '   → Filename: /etc/secrets/key.json\n' +
        '   → Contents: paste contents of backend/key.json\n' +
        '   → Save & Redeploy\n' +
        '───────────────────────────────────────────────────────\n'
      );
    }

    if (err.message.includes('403') || err.message.includes('PERMISSION_DENIED')) {
      console.error('→ Share the Google Sheet with:', process.env.GOOGLE_CLIENT_EMAIL, '(Editor role)');
    }

    return false; // Never crash request over Sheets failure
  }
}

async function appendAppointment(data) {
  return appendToSheet('Appointments', [
    new Date().toLocaleDateString('en-KE'),
    data.name||'', data.phone||'', data.date||'', data.timeSlot||'', data.purpose||''
  ]);
}

async function appendMember(data) {
  const kids = Array.isArray(data.kids) ? data.kids.map(k=>`${k.name}(${k.age})`).join(', ') : '';
  return appendToSheet('Members', [
    new Date().toLocaleDateString('en-KE'),
    data.name||'', data.phone||'', data.gender||'',
    String(data.age||''), data.maritalStatus||'', data.spouseName||'', kids
  ]);
}

async function appendPledge(data) {
  return appendToSheet('Pledges', [
    new Date().toLocaleDateString('en-KE'),
    data.name||'', data.phone||'',
    `KES ${data.amount||0}`, data.paymentDate||'', data.pledgeFor||''
  ]);
}

async function appendPayment(data) {
  return appendToSheet('Payments', [
    new Date().toLocaleDateString('en-KE'),
    data.phone||'', `KES ${data.amount||0}`,
    data.mpesaCode||'Pending', data.status||'Pending'
  ]);
}

module.exports = { appendAppointment, appendMember, appendPledge, appendPayment };
