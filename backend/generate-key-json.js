// ============================================================
// generate-key-json.js
// Run this ONCE to create backend/key.json from your .env
// Usage: cd backend && node generate-key-json.js
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
let   privateKey  = process.env.GOOGLE_PRIVATE_KEY || '';

if (!clientEmail || !privateKey) {
  console.error('❌ GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

// Normalise the private key — fix all newline escape variants
privateKey = privateKey
  .replace(/^["']|["']$/g, '')   // strip surrounding quotes
  .replace(/\\\\n/g, '\n')       // double-escaped \\n
  .replace(/\\n/g, '\n')         // single-escaped \n
  .replace(/\\r/g, '')           // remove \r
  .trim();

if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  console.error('❌ Private key looks malformed after normalisation.');
  console.error('   Make sure GOOGLE_PRIVATE_KEY in .env starts with -----BEGIN PRIVATE KEY-----');
  process.exit(1);
}

const keyJson = {
  type: 'service_account',
  project_id: 'jwm-church',
  client_email: clientEmail,
  private_key: privateKey,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token'
};

const outputPath = path.join(__dirname, 'key.json');
fs.writeFileSync(outputPath, JSON.stringify(keyJson, null, 2));
console.log('✅ backend/key.json created successfully!');
console.log('   The Google Sheets integration will now use this file.');
console.log('   Make sure key.json is in your .gitignore (it is sensitive).');
console.log('');
console.log('   For Render deployment:');
console.log('   1. Go to Render → your backend service → Settings → Secret Files');
console.log('   2. Filename: /etc/secrets/key.json');
console.log('   3. Contents: paste the entire contents of backend/key.json');
