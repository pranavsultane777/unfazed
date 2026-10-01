const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const configuredTaxRate = () => {
  const rate = Number(process.env.INVOICE_TAX_PERCENT ?? 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Invalid INVOICE_TAX_PERCENT configuration');
  return rate / 100;
};

// Generates a GST-style tax invoice layout. The tax percentage is configurable
// because the application should not assume that every therapist is GST-
// registered or that one tax rate applies to every practice.
const generateInvoice = (payment, therapist, client) => new Promise((resolve, reject) => {
  try {
    const invoicesDir = path.join(__dirname, '..', '..', 'invoices');
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

    const fileName = `invoice-${payment._id}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    const taxRate = configuredTaxRate();
    const taxAmount = Number((payment.amount * taxRate).toFixed(2));
    const subtotal = Number((payment.amount - taxAmount).toFixed(2));

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(22).text('Unfazed');
    doc.fontSize(12).text('Tax Invoice / Payment Receipt');
    doc.moveDown();

    doc.fontSize(10).text(`Invoice Number: ${payment.invoiceNumber || payment._id}`);
    doc.text(`Invoice Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString('en-IN')}`);
    doc.text(`Transaction ID: ${payment.gateway_transaction_id || 'Pending'}`);
    doc.moveDown();

    doc.fontSize(12).text('Billed by', { underline: true });
    doc.fontSize(10).text(therapist.name || 'Therapist');
    doc.text(therapist.email || '');
    doc.moveDown();

    doc.fontSize(12).text('Billed to', { underline: true });
    doc.fontSize(10).text(client.name || 'Client');
    doc.text(client.email || '');
    if (client.phone) doc.text(client.phone);
    doc.moveDown();

    doc.fontSize(12).text('Payment Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Gross amount: Rs. ${Number(payment.amount).toFixed(2)}`);
    doc.text(`Tax (${(taxRate * 100).toFixed(2)}%): Rs. ${taxAmount.toFixed(2)}`);
    doc.text(`Taxable value: Rs. ${subtotal.toFixed(2)}`);
    doc.text(`Platform fee: Rs. ${Number(payment.platform_fee || 0).toFixed(2)}`);
    doc.text(`Therapist net amount: Rs. ${Number(payment.net_amount || 0).toFixed(2)}`);
    doc.text(`Payment status: ${payment.status}`);
    if (payment.booking) {
      doc.moveDown(0.5);
      doc.text(`Booked session: ${payment.booking.date} ${payment.booking.startTime}–${payment.booking.endTime}`);
      doc.text(`Client timezone: ${payment.booking.timezone}`);
    }
    doc.moveDown(2);
    doc.fontSize(9).text(
      'System-generated invoice. GST/tax treatment is configuration-driven and should be reviewed by the therapist or their tax advisor before production use.',
      { align: 'center' },
    );
    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  } catch (error) {
    reject(error);
  }
});

module.exports = { generateInvoice };
