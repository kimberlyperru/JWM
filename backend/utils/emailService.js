// ============================================================
// EMAIL UTILITY - Nodemailer
// Sends emails to the church and confirmation to the submitter
// ============================================================
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"JWM Kajiado Church" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

// --- Email Templates ---

function appointmentEmailHtml(data) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
      <div style="background:#1a3c6e;color:white;padding:20px;text-align:center">
        <h2 style="margin:0">✝ Jesus Winner Ministry</h2>
        <p style="margin:5px 0;font-size:14px">Kajiado Branch</p>
      </div>
      <div style="padding:24px">
        <h3 style="color:#1a3c6e">New Appointment Booking</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Name</td><td style="padding:8px">${data.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${data.phone}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Date</td><td style="padding:8px">${data.date}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Time Slot</td><td style="padding:8px">${data.timeSlot}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Purpose</td><td style="padding:8px">${data.purpose || 'Not specified'}</td></tr>
        </table>
      </div>
      <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#666">
        <p>Jesus Winner Ministry | Showground, Kajiado | +254 720 178193</p>
      </div>
    </div>
  `;
}

function memberEmailHtml(data) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
      <div style="background:#1a3c6e;color:white;padding:20px;text-align:center">
        <h2 style="margin:0">✝ Jesus Winner Ministry</h2>
        <p style="margin:5px 0;font-size:14px">New Member Registration</p>
      </div>
      <div style="padding:24px">
        <h3 style="color:#1a3c6e">New Member Details</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Full Name</td><td style="padding:8px">${data.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${data.phone}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Gender</td><td style="padding:8px">${data.gender}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Age</td><td style="padding:8px">${data.age}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Marital Status</td><td style="padding:8px">${data.maritalStatus}</td></tr>
          ${data.spouseName ? `<tr><td style="padding:8px;font-weight:bold">Spouse Name</td><td style="padding:8px">${data.spouseName}</td></tr>` : ''}
          ${data.kids && data.kids.length > 0 ? `<tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Children</td><td style="padding:8px">${data.kids.map(k => `${k.name} (Age: ${k.age})`).join('<br>')}</td></tr>` : ''}
        </table>
      </div>
      <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#666">
        <p>Jesus Winner Ministry | Showground, Kajiado | +254 720 178193</p>
      </div>
    </div>
  `;
}

function pledgeEmailHtml(data) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
      <div style="background:#1a3c6e;color:white;padding:20px;text-align:center">
        <h2 style="margin:0">✝ Jesus Winner Ministry</h2>
        <p style="margin:5px 0;font-size:14px">New Pledge</p>
      </div>
      <div style="padding:24px">
        <h3 style="color:#1a3c6e">Pledge Details</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Name</td><td style="padding:8px">${data.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${data.phone}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Amount</td><td style="padding:8px">KES ${data.amount}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Payment Date</td><td style="padding:8px">${data.paymentDate}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Pledge For</td><td style="padding:8px">${data.pledgeFor}</td></tr>
        </table>
      </div>
      <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#666">
        <p>Jesus Winner Ministry | Showground, Kajiado | +254 720 178193</p>
      </div>
    </div>
  `;
}

module.exports = { sendEmail, appointmentEmailHtml, memberEmailHtml, pledgeEmailHtml };
