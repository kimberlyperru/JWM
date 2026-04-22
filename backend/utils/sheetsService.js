// ============================================================
// backend/utils/sheetsService.js  ← BACKEND FILE (Node.js)
// ============================================================
const { google } = require('googleapis');
const path = require('path');
const fs   = require('fs');

function getAuth() {
  const keyLocations = [
    '/etc/secrets/key.json',
    path.join(__dirname, '..', 'key.json'),
    path.join(process.cwd(), 'key.json'),
  ];
  for (const keyPath of keyLocations) {
    if (fs.existsSync(keyPath)) {
      try {
        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (keyFile.client_email && keyFile.private_key) {
          console.log('Google Sheets: using', keyPath);
          return new google.auth.JWT({
            email:  keyFile.client_email,
            key:    keyFile.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
        }
      } catch (e) {
        console.warn('key.json parse error at', keyPath, ':', e.message);
      }
    }
  }
  // Fallback to env vars
  let key   = process.env.GOOGLE_PRIVATE_KEY || '';
  const email = process.env.GOOGLE_CLIENT_EMAIL || '';
  if (!key || !email) throw new Error('No Google credentials. Add backend/key.json');
  key = key.replace(/^["']|["']$/g, '')
           .replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
  return new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
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
    console.log(`Sheets [${sheetName}]: row added`);
    return true;
  } catch (err) {
    console.error(`Sheets [${sheetName}] error:`, err.message);
    if (err.message.includes('DECODER') || err.message.includes('unsupported')) {
      console.error('FIX: Copy key.json from the ZIP into your backend/ folder.');
    }
    if (err.message.includes('403') || err.message.includes('PERMISSION_DENIED')) {
      console.error('FIX: Share the Google Sheet with', process.env.GOOGLE_CLIENT_EMAIL, '(Editor)');
    }
    return false;
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
