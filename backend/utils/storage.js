// ============================================================
// DATA STORAGE UTILITY
// Replaces a database with JSON files saved on the server
// All data is also emailed and saved to Google Sheets
// ============================================================
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  appointments: path.join(DATA_DIR, 'appointments.json'),
  members: path.join(DATA_DIR, 'members.json'),
  pledges: path.join(DATA_DIR, 'pledges.json'),
  payments: path.join(DATA_DIR, 'payments.json')
};

// Initialize empty files if they don't exist
Object.values(FILES).forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
});

function readData(type) {
  try {
    const raw = fs.readFileSync(FILES[type], 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${type} data:`, err.message);
    return [];
  }
}

function writeData(type, data) {
  try {
    fs.writeFileSync(FILES[type], JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing ${type} data:`, err.message);
    return false;
  }
}

function appendRecord(type, record) {
  const existing = readData(type);
  const newRecord = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...record
  };
  existing.push(newRecord);
  writeData(type, existing);
  return newRecord;
}

function deleteRecord(type, id) {
  const existing = readData(type);
  const filtered = existing.filter(r => r.id !== id);
  writeData(type, filtered);
  return filtered;
}

module.exports = { readData, writeData, appendRecord, deleteRecord };
