const PDFDocument = require('pdfkit');
const path = require('path');

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function buildSalesPdf({
  restaurantName,
  from,
  to,
  summary,
  itemBreakdown,
  dailyBreakdown = [],
  ordersList = [],
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header - Khatabook style with logo on left
    try {
      doc.image(path.join(__dirname, '../../public/images/logo.png'), 60, 60, { width: 60, height: 60 });
    } catch (err) {
      // Logo not found, continue without it
    }
    doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text(restaurantName, 130, 70);
    doc.fillColor('#64748b').fontSize(14).font('Helvetica').text('Transaction History', 130, 95);
    doc.fillColor('#64748b').fontSize(10).text(`Period: ${from} to ${to}`, 130, 115);
    doc.moveDown(2.5);

    // Summary section - Khatabook style
    const summaryY = doc.y;
    doc.rect(60, summaryY, 480, 80).fillAndStroke('#f8fafc', '#0f172a');
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
    doc.text('Opening Balance', 75, summaryY + 15);
    doc.text('Total Orders', 75, summaryY + 35);
    doc.text('Gross Sales', 75, summaryY + 55);
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica');
    doc.text('Rs. 0.00', 400, summaryY + 15);
    doc.text(String(summary.totalOrders), 400, summaryY + 35);
    doc.text(`Rs. ${summary.grossSales.toFixed(2)}`, 400, summaryY + 55);
    doc.moveDown(2);

    // Orders table - Khatabook style
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Transactions', { align: 'center' });
    doc.moveDown(0.5);

    // Table header
    const headerY = doc.y;
    doc.fillColor('#0f172a').rect(60, headerY, 480, 28).fill();
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('Date', 70, headerY + 10);
    doc.text('Details', 160, headerY + 10);
    doc.text('Payment Mode', 380, headerY + 10);
    doc.text('Amount', 440, headerY + 10);
    doc.moveDown(0.5);

    let rowColor = false;
    doc.fillColor('#0f172a').font('Helvetica');
    if (!ordersList.length) {
      doc.text('No transactions in this period.');
    } else {
      for (const order of ordersList) {
        if (doc.y > 700) {
          doc.addPage();
          rowColor = false;
        }
        const y = doc.y;
        const itemsStr = order.items.map((i) => `${i.name} x${i.qty}`).join(', ');
        const rowHeight = itemsStr.length > 50 ? 70 : 50;
        const bgColor = rowColor ? '#f0fdf4' : '#ffffff';
        doc.rect(60, y, 480, rowHeight).fillAndStroke(bgColor, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(order.saleDate, 70, y + 12);
        doc.text(formatTime(order.time), 70, y + 26);
        doc.text(itemsStr, 160, y + 16, { width: 200, ellipsis: false });
        doc.text((order.paymentMode || 'cash').toUpperCase(), 380, y + 16);
        doc.text(`Rs. ${order.total.toFixed(2)}`, 440, y + 16);
        doc.moveDown(0.5);
        rowColor = !rowColor;
      }
    }
    doc.moveDown(1);

    // Add page break before item summary
    doc.addPage();

    // Item-wise summary
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Item Summary', { align: 'center' });
    doc.moveDown(0.5);

    const itemHeaderY = doc.y;
    doc.fillColor('#0f172a').rect(60, itemHeaderY, 480, 28).fill();
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('Item', 70, itemHeaderY + 10);
    doc.text('Quantity', 270, itemHeaderY + 10);
    doc.text('Revenue', 410, itemHeaderY + 10);
    doc.moveDown(0.5);

    rowColor = false;
    for (const row of itemBreakdown) {
      if (doc.y > 700) doc.addPage();
      const y = doc.y;
      const bgColor = rowColor ? '#f0fdf4' : '#ffffff';
      doc.rect(60, y, 480, 30).fillAndStroke(bgColor, '#e2e8f0');
      doc.fillColor('#0f172a');
      doc.text(row.name, 70, y + 10);
      doc.text(String(row.qty), 270, y + 10);
      doc.text(`Rs. ${row.revenue.toFixed(2)}`, 410, y + 10);
      doc.moveDown(0.5);
      rowColor = !rowColor;
    }

    doc.end();
  });
}

module.exports = { buildSalesPdf };
