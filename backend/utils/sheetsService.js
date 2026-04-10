// ============================================================
// GOOGLE SHEETS UTILITY
// Appends records to Google Sheets via Service Account
// ============================================================
const { google } = require('googleapis');

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function appendToSheet(sheetName, values) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] }
    });
    return true;
  } catch (err) {
    console.error('Google Sheets error:', err.message);
    return false;
  }
}

async function appendAppointment(data) {
  const row = [
    new Date().toLocaleDateString('en-KE'),
    data.name,
    data.phone,
    data.date,
    data.timeSlot,
    data.purpose || ''
  ];
  return appendToSheet('Appointments', row);
}

async function appendMember(data) {
  const kids = data.kids ? data.kids.map(k => `${k.name}(${k.age})`).join(', ') : '';
  const row = [
    new Date().toLocaleDateString('en-KE'),
    data.name,
    data.phone,
    data.gender,
    data.age,
    data.maritalStatus,
    data.spouseName || '',
    kids
  ];
  return appendToSheet('Members', row);
}

async function appendPledge(data) {
  const row = [
    new Date().toLocaleDateString('en-KE'),
    data.name,
    data.phone,
    `KES ${data.amount}`,
    data.paymentDate,
    data.pledgeFor
  ];
  return appendToSheet('Pledges', row);
}

async function appendPayment(data) {
  const row = [
    new Date().toLocaleDateString('en-KE'),
    data.phone,
    `KES ${data.amount}`,
    data.mpesaCode || 'Pending',
    data.status
  ];
  return appendToSheet('Payments', row);
}

module.exports = { appendAppointment, appendMember, appendPledge, appendPayment };
