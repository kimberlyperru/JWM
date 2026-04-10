// ============================================================
// PDF GENERATION UTILITY - PDFKit
// Creates PDF receipts/records for admin download
// ============================================================
const PDFDocument = require('pdfkit');

function createHeader(doc, title) {
  doc.rect(0, 0, doc.page.width, 80).fill('#1a3c6e');
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text('Jesus Winner Ministry - Kajiado Branch', 40, 20, { align: 'center' });
  doc.fontSize(13).font('Helvetica')
    .text(title, 40, 48, { align: 'center' });
  doc.fillColor('black').moveDown(2);
}

function createFooter(doc) {
  const bottom = doc.page.height - 50;
  doc.moveTo(40, bottom).lineTo(doc.page.width - 40, bottom).stroke('#1a3c6e');
  doc.fontSize(9).fillColor('#666')
    .text('Showground, Kajiado  |  +254 720 178193  |  info@jwmkajiado.org', 40, bottom + 8, { align: 'center' });
}

function addField(doc, label, value) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3c6e').text(label + ': ', { continued: true });
  doc.font('Helvetica').fillColor('black').text(value || 'N/A');
  doc.moveDown(0.3);
}

function generateAppointmentPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    createHeader(doc, 'Appointment Confirmation');
    doc.moveDown(1);
    doc.fontSize(12).text(`Date of booking: ${new Date().toLocaleDateString('en-KE')}`, { align: 'right' });
    doc.moveDown(1);
    addField(doc, 'Full Name', data.name);
    addField(doc, 'Phone Number', data.phone);
    addField(doc, 'Appointment Date', data.date);
    addField(doc, 'Time Slot', data.timeSlot);
    addField(doc, 'Purpose', data.purpose);
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#555')
      .text('Please arrive 5 minutes before your scheduled time.', { align: 'center' });
    createFooter(doc);
    doc.end();
  });
}

function generateMemberPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    createHeader(doc, 'New Member Registration');
    doc.moveDown(1);
    doc.fontSize(12).text(`Registered: ${new Date().toLocaleDateString('en-KE')}`, { align: 'right' });
    doc.moveDown(1);
    addField(doc, 'Full Name', data.name);
    addField(doc, 'Phone Number', data.phone);
    addField(doc, 'Gender', data.gender);
    addField(doc, 'Age', data.age);
    addField(doc, 'Marital Status', data.maritalStatus);
    if (data.spouseName) addField(doc, 'Spouse Name', data.spouseName);
    if (data.kids && data.kids.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3c6e').text('Children:');
      data.kids.forEach((kid, i) => {
        doc.font('Helvetica').fillColor('black')
          .text(`  ${i + 1}. ${kid.name} - Age: ${kid.age}`);
      });
    }
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#555')
      .text('Welcome to the JWM Kajiado family! God bless you.', { align: 'center' });
    createFooter(doc);
    doc.end();
  });
}

function generatePledgePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    createHeader(doc, 'Pledge Record');
    doc.moveDown(1);
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('en-KE')}`, { align: 'right' });
    doc.moveDown(1);
    addField(doc, 'Full Name', data.name);
    addField(doc, 'Phone Number', data.phone);
    addField(doc, 'Pledge Amount', `KES ${data.amount}`);
    addField(doc, 'Payment Date', data.paymentDate);
    addField(doc, 'Pledge For', data.pledgeFor);
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#555')
      .text('Thank you for your generous pledge. God bless you abundantly.', { align: 'center' });
    createFooter(doc);
    doc.end();
  });
}

function generateAllRecordsPDF(type, records) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, layout: 'landscape' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const titles = { appointments: 'Appointments Report', members: 'New Members Report', pledges: 'Pledges Report' };
    createHeader(doc, titles[type] || 'Report');
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-KE')} | Total records: ${records.length}`, { align: 'right' });
    doc.moveDown(1);

    if (records.length === 0) {
      doc.fontSize(14).text('No records found.', { align: 'center' });
    } else {
      records.forEach((r, i) => {
        if (i > 0 && i % 15 === 0) doc.addPage();
        doc.rect(40, doc.y, doc.page.width - 80, 1).fill('#ddd');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333');
        if (type === 'appointments') {
          doc.text(`${i + 1}. ${r.name} | ${r.phone} | ${r.date} at ${r.timeSlot} | ${r.purpose || '-'}`);
        } else if (type === 'members') {
          doc.text(`${i + 1}. ${r.name} | ${r.phone} | ${r.gender} | Age: ${r.age} | ${r.maritalStatus}`);
        } else if (type === 'pledges') {
          doc.text(`${i + 1}. ${r.name} | ${r.phone} | KES ${r.amount} | Due: ${r.paymentDate} | ${r.pledgeFor}`);
        }
        doc.moveDown(0.5);
      });
    }
    createFooter(doc);
    doc.end();
  });
}

module.exports = { generateAppointmentPDF, generateMemberPDF, generatePledgePDF, generateAllRecordsPDF };
