const express = require('express');
const { Parser } = require('@json2csv/plainjs');
const PDFDocument = require('pdfkit');
const { auth } = require('../middleware/auth');
const Arrival = require('../models/Arrival');
const { Warehouse, Kunchinittu } = require('../models/Location');
const User = require('../models/User');
const { Op } = require('sequelize');

const router = express.Router();

// Basic PDF generation as fallback when enhanced styling fails
const generateBasicPDF = (arrivals) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Simple header
      doc.fontSize(14).font('Helvetica-Bold').text('Mother India - Arrivals Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Simple table
      arrivals.forEach((record, idx) => {
        if (idx % 20 === 0 && idx > 0) doc.addPage();
        
        doc.fontSize(8).font('Helvetica')
           .text(`${record.slNo || ''} | ${record.movementType || ''} | ${record.variety || ''} | ${record.wbNo || ''} | ${record.lorryNumber || ''}`, 20);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// PDF Styling Configuration matching frontend styles
const PDF_STYLES = {
  colors: {
    purchase: {
      background: [212, 237, 218], // #d4edda
      hover: [195, 230, 203]       // #c3e6cb
    },
    shifting: {
      background: [226, 212, 237], // #e2d4ed
      hover: [212, 195, 230]       // #d4c3e6
    },
    header: {
      background: [68, 114, 196],  // #4472c4
      text: [255, 255, 255]        // #ffffff
    },
    border: [208, 208, 208],       // #d0d0d0
    text: [0, 0, 0],               // #000000
    alternateRow: [248, 249, 250]  // #f8f9fa
  },
  fonts: {
    family: 'Helvetica', // Closest to Calibri in PDFKit
    size: {
      header: 11,
      body: 11,
      title: 14,
      small: 8
    }
  },
  table: {
    borderWidth: 1,
    cellPadding: 6,
    rowHeight: 18
  }
};

// Export arrivals to CSV
router.get('/csv/arrivals', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo, movementType } = req.query;
    
    const where = { status: 'approved' };
    if (movementType) where.movementType = movementType;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const arrivals = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name'] }
      ],
      order: [['date', 'DESC']]
    });

    const fields = [
      { label: 'SL No', value: 'slNo' },
      { label: 'Date', value: 'date' },
      { label: 'Movement Type', value: 'movementType' },
      { label: 'Broker', value: 'broker' },
      { label: 'Variety', value: row => row.variety || '' },
      { label: 'Bags', value: 'bags' },
      { label: 'From Location', value: row => {
        if (row.movementType === 'purchase') return row.fromLocation || '';
        return row.fromKunchinittu?.name || '';
      }},
      { label: 'To Location', value: row => {
        if (row.movementType === 'purchase') {
          const kunchinittu = row.toKunchinittu?.name || '';
          const warehouse = row.toWarehouse?.name || '';
          return kunchinittu && warehouse ? `${kunchinittu} - ${warehouse}` : (kunchinittu || warehouse);
        }
        return row.toKunchinittu?.name || '';
      }},
      { label: 'Moisture', value: 'moisture' },
      { label: 'Cutting', value: 'cutting' },
      { label: 'WB No', value: 'wbNo' },
      { label: 'Gross Weight', value: 'grossWeight' },
      { label: 'Tare Weight', value: 'tareWeight' },
      { label: 'Net Weight', value: 'netWeight' },
      { label: 'Lorry Number', value: 'lorryNumber' },
      { label: 'Created By', value: row => row.creator?.username || '' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(arrivals);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=arrivals_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Enhanced PDF generation function - Perfectly matches frontend display
const generateStyledPDF = (arrivals, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const { viewType } = options;
      
      // Validate data
      if (!arrivals || !Array.isArray(arrivals)) {
        throw new Error('Invalid arrivals data provided');
      }
      
      if (arrivals.length > 10000) {
        throw new Error('Dataset too large for PDF generation. Please apply filters.');
      }
      
      // Group by date for date-wise display
      const groupedByDate = arrivals.reduce((acc, arrival) => {
        if (!arrival.date) {
          console.warn('Record missing date:', arrival.id);
          return acc;
        }
        if (!acc[arrival.date]) acc[arrival.date] = [];
        acc[arrival.date].push(arrival);
        return acc;
      }, {});

      // Sort dates in descending order (newest first) to match frontend
      const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

      const doc = new PDFDocument({ margin: 15, size: 'A4', layout: 'portrait' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title mapping
      const titles = {
        'arrivals': 'All Arrivals Records',
        'purchase': 'Purchase Records',
        'shifting': 'Shifting Records',
        'stock': 'Paddy Stock Report'
      };

      // Title matching frontend
      doc.fontSize(16).font('Helvetica-Bold').fillColor([0, 0, 0])
         .text('Mother India Stock Management', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
         .text(titles[viewType] || 'Records Report', { align: 'center' });
      doc.fontSize(9).text(`Generated: ${new Date().toLocaleDateString('en-GB').replace(/\u200E/g, '')} ${new Date().toLocaleTimeString()}`, { align: 'center' });
      doc.text(`Total Records: ${arrivals.length}`, { align: 'center' });
      doc.moveDown(0.5);

      doc.moveDown(0.5);

      // Process each date group
      sortedDates.forEach((date, dateIdx) => {
        const records = groupedByDate[date];
        
        // Add page if needed (but keep date header with its data)
        if (dateIdx > 0 && doc.y > doc.page.height - 120) {
          doc.addPage();
        }
        
        // Date header - Blue background matching frontend
        const dateHeaderY = doc.y;
        const dateText = new Date(date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: '2-digit' 
        }).replace(/\u200E/g, '').trim().toUpperCase();
        
        doc.rect(startX, dateHeaderY, tableWidth, 22)
           .fillColor([68, 114, 196])
           .fill();
        
        doc.fillColor([255, 255, 255])
           .fontSize(10).font('Helvetica-Bold')
           .text(`${dateText} - ${records.length} record${records.length > 1 ? 's' : ''}`, startX + 5, dateHeaderY + 6);
        
        doc.y = dateHeaderY + 22;
        
        // Table header configuration based on view type (Portrait A4 ~535px available)
        let colWidths, headers;
        const pageWidth = doc.page.width - 30; // Available width
        let tableWidth = 0;
        let startX = 15;
        
        if (viewType === 'arrivals') {
          // 15 columns total for arrivals
          colWidths = [24, 28, 34, 30, 28, 38, 40, 26, 22, 20, 26, 32, 32, 32, 35];
          headers = ['SL', 'Type', 'Broker', 'From', 'To K', 'To W', 'Variety', 'Bags', 'M%', 'Cut', 'WB', 'Gross', 'Tare', 'Net', 'Lorry'];
        } else if (viewType === 'purchase') {
          // 14 columns for purchase
          colWidths = [35, 35, 44, 36, 64, 48, 28, 24, 22, 30, 34, 34, 34, 40];
          headers = ['Date', 'Type', 'Broker', 'From', 'To', 'Variety', 'Bags', 'M%', 'Cut', 'WB', 'Gross', 'Tare', 'Net', 'Lorry'];
        } else if (viewType === 'shifting') {
          // 15 columns for shifting - improved column widths for better alignment
          colWidths = [35, 35, 38, 48, 38, 48, 50, 30, 26, 24, 30, 35, 35, 35, 40];
          headers = ['Date', 'Type', 'From K', 'From W', 'To K', 'To W', 'Variety', 'Bags', 'M%', 'Cut', 'WB', 'Gross', 'Tare', 'Net', 'Lorry'];
        } else {
          // 15 columns for other/default
          colWidths = [24, 28, 34, 30, 28, 38, 40, 26, 22, 20, 26, 32, 32, 32, 35];
          headers = ['SL', 'Type', 'Broker', 'From', 'To K', 'To W', 'Variety', 'Bags', 'M%', 'Cut', 'WB', 'Gross', 'Tare', 'Net', 'Lorry'];
        }
        
        // Calculate total table width and center it
        tableWidth = colWidths.reduce((a, b) => a + b, 0);
        startX = (doc.page.width - tableWidth) / 2;
        
        // Draw table header
        const headerY = doc.y;
        doc.rect(startX, headerY, tableWidth, 18)
           .fillColor([68, 114, 196])
           .fill();
        
        let x = startX + 2;
        doc.fillColor([255, 255, 255])
           .fontSize(7).font('Helvetica-Bold');
        
        headers.forEach((header, i) => {
          doc.text(header, x, headerY + 5, { 
            width: colWidths[i] - 4, 
            align: 'center',
            ellipsis: true,
            lineBreak: false
          });
          x += colWidths[i];
        });

        doc.y = headerY + 18;

        // Draw table rows
        records.forEach((record, idx) => {
          const rowY = doc.y;
          
          // Check for page break
          if (rowY > doc.page.height - 50) {
            doc.addPage();
            
            // Redraw header on new page
            const newHeaderY = doc.y;
            doc.rect(startX, newHeaderY, tableWidth, 18)
               .fillColor([68, 114, 196])
               .fill();
            
            let newX = startX + 3;
            doc.fillColor([255, 255, 255])
               .fontSize(7).font('Helvetica-Bold');
            
            headers.forEach((header, i) => {
              doc.text(header, newX, newHeaderY + 5, { 
                width: colWidths[i] - 3, 
                align: 'center',
                ellipsis: true,
                lineBreak: false
              });
              newX += colWidths[i];
            });

            doc.y = newHeaderY + 18;
          }
          
          const currentRowY = doc.y;
          let bgColor;
          
          // Color rows based on movement type - matching frontend exactly
          if (record.movementType === 'purchase') {
            bgColor = [212, 237, 218]; // Green for purchase
          } else if (record.movementType === 'shifting') {
            bgColor = [226, 212, 237]; // Purple for shifting
          } else {
            bgColor = idx % 2 === 0 ? [255, 255, 255] : [248, 249, 250]; // Alternating
          }
          
          // Row background
          doc.rect(startX, currentRowY, tableWidth, 14)
             .fillColor(bgColor)
             .fill()
             .strokeColor([208, 208, 208])
             .lineWidth(0.5)
             .stroke();
          
          // Prepare row data
          let rowData = [];
          
          if (viewType === 'arrivals') {
            rowData = [
              record.slNo || '',
              (record.movementType || '').charAt(0).toUpperCase() + (record.movementType || '').slice(1, 6),
              record.broker || '-',
              record.movementType === 'purchase' 
                ? (record.fromLocation || '-')
                : (record.fromKunchinittu?.code || '-'),
              record.toKunchinittu?.code || '-',
              record.movementType === 'purchase'
                ? (record.toWarehouse?.name || '-')
                : (record.toWarehouseShift?.name || '-'),
              record.variety || '-',
              record.bags || '-',
              record.moisture || '-',
              record.cutting || '-',
              record.wbNo || '',
              Number(record.grossWeight || 0).toFixed(0),
              Number(record.tareWeight || 0).toFixed(0),
              Number(record.netWeight || 0).toFixed(0),
              record.lorryNumber || ''
            ];
          } else if (viewType === 'purchase') {
            rowData = [
              new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/\s+/g, ''),
              'Purch.',
              record.broker || '-',
              record.fromLocation || '-',
              `${record.toKunchinittu?.code || ''}${record.toWarehouse?.name ? '-' + (record.toWarehouse?.name || '') : ''}`.trim(),
              record.variety || '-',
              record.bags || '-',
              record.moisture || '-',
              record.cutting || '-',
              record.wbNo || '',
              Number(record.grossWeight || 0).toFixed(0),
              Number(record.tareWeight || 0).toFixed(0),
              Number(record.netWeight || 0).toFixed(0),
              record.lorryNumber || ''
            ];
          } else if (viewType === 'shifting') {
            rowData = [
              new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/\s+/g, ''),
              'Shift.',
              record.fromKunchinittu?.code || '-',
              record.fromWarehouse?.name || '-',
              record.toKunchinittu?.code || '-',
              record.toWarehouseShift?.name || '-',
              record.variety || '-',
              record.bags || '-',
              record.moisture || '-',
              record.cutting || '-',
              record.wbNo || '',
              Number(record.grossWeight || 0).toFixed(0),
              Number(record.tareWeight || 0).toFixed(0),
              Number(record.netWeight || 0).toFixed(0),
              record.lorryNumber || ''
            ];
          }
          
          // Draw cell text
          x = startX + 3;
          doc.fillColor([0, 0, 0])
             .fontSize(6).font('Helvetica');
          
          rowData.forEach((cell, i) => {
            const cellText = String(cell || '');
            const align = i < 2 ? 'left' : 'center';
            
            doc.text(cellText, x, currentRowY + 2, { 
              width: colWidths[i] - 4, 
              align: align,
              ellipsis: true,
              lineBreak: false
            });
            x += colWidths[i];
          });

          doc.y = currentRowY + 14;
        });

        doc.moveDown(0.8);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Export arrivals to PDF - Matches frontend display exactly
router.get('/pdf/arrivals', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo, search } = req.query;
    
    // Match frontend logic - show user's own records for staff
    const where = {};
    
    if (req.user.role === 'staff') {
      where.createdBy = req.user.userId;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const arrivals = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: User, as: 'approver', attributes: ['username'] },
        { model: User, as: 'adminApprover', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    if (!arrivals || arrivals.length === 0) {
      return res.status(404).json({ error: 'No records found' });
    }

    const pdfBuffer = await generateStyledPDF(arrivals, { viewType: 'arrivals' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=arrivals_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export purchase records to PDF
router.get('/pdf/purchase', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const where = {
      movementType: 'purchase',
      status: 'approved'
    };
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const arrivals = await Arrival.findAll({
      where,
      include: [
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    if (!arrivals || arrivals.length === 0) {
      return res.status(404).json({ error: 'No records found' });
    }

    const pdfBuffer = await generateStyledPDF(arrivals, { viewType: 'purchase' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=purchase_records_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export shifting records to PDF
router.get('/pdf/shifting', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const where = {
      movementType: 'shifting',
      status: 'approved'
    };
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const arrivals = await Arrival.findAll({
      where,
      include: [
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    if (!arrivals || arrivals.length === 0) {
      return res.status(404).json({ error: 'No records found' });
    }

    const pdfBuffer = await generateStyledPDF(arrivals, { viewType: 'shifting' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shifting_records_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export Paddy Stock to PDF - Matches frontend Excel format exactly
router.get('/pdf/stock', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const where = { 
      status: 'approved',
      adminApprovedBy: { [Op.not]: null },
      movementType: { [Op.ne]: 'loose' } // Exclude loose (loss) entries from stock
    };
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const arrivals = await Arrival.findAll({
      where,
      include: [
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    if (!arrivals || arrivals.length === 0) {
      return res.status(404).json({ error: 'No stock records found' });
    }

    // Group by date
    const groupedByDate = arrivals.reduce((acc, arrival) => {
      if (!acc[arrival.date]) acc[arrival.date] = [];
      acc[arrival.date].push(arrival);
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => res.end(Buffer.concat(buffers)));
    doc.on('error', (err) => {
      console.error('PDF error:', err);
      res.status(500).json({ error: 'Failed to generate PDF' });
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=paddy_stock_${Date.now()}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor([0, 0, 0])
       .text('Mother India Stock Management', { align: 'center' });
    doc.fontSize(12).font('Helvetica')
       .text('Paddy Stock Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleDateString('en-GB').replace(/\u200E/g, '')} ${new Date().toLocaleTimeString()}`, { align: 'center' });
    doc.moveDown();

    // Calculate opening stock from all previous dates
    const allPreviousDates = [];
    let runningStock = {};

    sortedDates.forEach((date) => {
      const records = groupedByDate[date];
      
      if (doc.y > doc.page.height - 180) doc.addPage();
      
      // Date header - Blue background
      const dateHeaderY = doc.y;
      const dateText = new Date(date).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
      }).replace(/\u200E/g, '').trim().toUpperCase();
      
      doc.rect(20, dateHeaderY, doc.page.width - 40, 20)
         .fillColor([68, 114, 196])
         .fill();
      
      doc.fillColor([255, 255, 255])
         .fontSize(11).font('Helvetica-Bold')
         .text(dateText, 25, dateHeaderY + 5);
      
      doc.y = dateHeaderY + 20;
      doc.moveDown(0.3);

      // Opening Stock Display
      const openingStockItems = [];
      Object.entries(runningStock).forEach(([key, item]) => {
        if (item.bags > 0) {
          openingStockItems.push(item);
        }
      });

      if (openingStockItems.length > 0) {
        doc.fontSize(8).font('Helvetica').fillColor([0, 0, 0]);
        
        openingStockItems.forEach(item => {
          const y = doc.y;
          
          // Bags column (right-aligned, bold)
          doc.font('Helvetica-Bold').text(`${item.bags}`, 30, y, { width: 60, align: 'right' });
          
          // Variety column
          doc.font('Helvetica').text(`${item.variety || '-'}`, 100, y, { width: 180 });
          
          // Location column
          doc.text(`${item.location}`, 290, y, { width: 250 });
          
          doc.moveDown(0.8);
        });
        
        const totalOpeningBags = openingStockItems.reduce((sum, item) => sum + item.bags, 0);
        doc.moveDown(0.2);
        
        // Border line before total
        const lineY = doc.y;
        doc.moveTo(30, lineY).lineTo(doc.page.width - 30, lineY).stroke();
        doc.moveDown(0.3);
        
        doc.font('Helvetica-Bold').text(`${totalOpeningBags} Opening Stock`, 30);
        doc.moveDown(0.5);
      }

      // Daily Movements - Purchase (green), Shifting (purple), Production-Shifting (orange)
      records.forEach(record => {
        const y = doc.y;
        
        if (y > doc.page.height - 50) {
          doc.addPage();
        }
        
        // Color coding based on movement type
        const bgColor = record.movementType === 'purchase' 
          ? [212, 237, 218]  // Green
          : (record.movementType === 'production-shifting' || record.movementType === 'for-production')
          ? [255, 237, 213]  // Orange
          : [226, 212, 237]; // Purple
        const rowHeight = 16;
        
        // Background rectangle
        doc.rect(25, y, doc.page.width - 50, rowHeight)
           .fillColor(bgColor)
           .fill();
        
        doc.fillColor([0, 0, 0]).fontSize(8).font('Helvetica');
        
        const formattedDate = new Date(record.date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: '2-digit' 
        }).replace(/\u200E/g, '').trim();
        
        if (record.movementType === 'purchase') {
          const bags = `+${record.bags || 0}`;
          
          // Bags column (bold)
          doc.font('Helvetica-Bold').text(bags, 30, y + 4, { width: 60, align: 'left' });
          
          // Date + Variety column
          doc.font('Helvetica').text(`${formattedDate} ${record.variety || '-'}`, 100, y + 4, { width: 180 });
          
          // Broker column
          doc.text(`${record.broker || '-'}`, 290, y + 4, { width: 140 });
          
          // Location column
          doc.text(`${record.toKunchinittu?.code || ''} - ${record.toWarehouse?.name || ''}`, 440, y + 4, { width: 140 });
          
          // Update running stock - ADD for purchase
          const key = `${record.variety}_${record.toKunchinittu?.code}_${record.toWarehouse?.name}`;
          if (!runningStock[key]) {
            runningStock[key] = {
              bags: 0,
              variety: record.variety,
              date: record.date,
              location: `${record.toKunchinittu?.code || ''} - ${record.toWarehouse?.name || ''}`
            };
          }
          runningStock[key].bags += (record.bags || 0);
          runningStock[key].date = record.date;
          
        } else if (record.movementType === 'production-shifting' || record.movementType === 'for-production') {
          const bags = `+-${record.bags || 0}`;
          
          // Bags column (bold)
          doc.font('Helvetica-Bold').text(bags, 30, y + 4, { width: 60, align: 'left' });
          
          // Date + Variety column
          doc.font('Helvetica').text(`${formattedDate} ${record.variety || '-'}`, 100, y + 4, { width: 180 });
          
          // From → Production (Outturn Code)
          const fromLocation = `${record.fromKunchinittu?.code || ''} - ${record.fromWarehouse?.name || ''}`;
          const destination = record.outturn?.code 
            ? `→ Production (${record.outturn.code})`
            : '→ Production';
          const locationText = `${fromLocation} ${destination}`;
          doc.text(locationText, 290, y + 4, { width: 290 });
          
          // Update running stock - SUBTRACT for production-shifting
          const fromKey = `${record.variety}_${record.fromKunchinittu?.code}_${record.fromWarehouse?.name}`;
          if (!runningStock[fromKey]) {
            runningStock[fromKey] = {
              bags: 0,
              variety: record.variety,
              date: record.date,
              location: fromLocation
            };
          }
          runningStock[fromKey].bags -= (record.bags || 0);
          runningStock[fromKey].date = record.date;
          
        } else {
          // Normal shifting
          const bags = `+-${record.bags || 0}`;
          
          // Bags column (bold)
          doc.font('Helvetica-Bold').text(bags, 30, y + 4, { width: 60, align: 'left' });
          
          // Date + Variety column
          doc.font('Helvetica').text(`${formattedDate} ${record.variety || '-'}`, 100, y + 4, { width: 180 });
          
          // From → To location
          const locationText = `${record.fromKunchinittu?.code || ''} - ${record.fromWarehouse?.name || ''} → ${record.toKunchinittu?.code || ''} - ${record.toWarehouseShift?.name || ''}`;
          doc.text(locationText, 290, y + 4, { width: 290 });
          
          // Normal shifting doesn't change total stock, just location
        }
        
        doc.y = y + rowHeight;
      });

      // Closing Stock
      doc.moveDown(0.5);
      
      // Border line before closing stock
      const closingLineY = doc.y;
      doc.moveTo(30, closingLineY).lineTo(doc.page.width - 30, closingLineY).stroke();
      doc.moveDown(0.3);
      
      doc.font('Helvetica-Bold').fillColor([0, 0, 0]);
      
      const closingStockByVariety = {};
      Object.entries(runningStock).forEach(([key, item]) => {
        if (item.bags > 0) {
          const variety = item.variety || 'Unknown';
          if (!closingStockByVariety[variety]) {
            closingStockByVariety[variety] = 0;
          }
          closingStockByVariety[variety] += item.bags;
        }
      });
      
      Object.entries(closingStockByVariety).forEach(([variety, bags]) => {
        if (bags > 0) {
          doc.text(`${bags} ${variety} - Closing Stock`, 30);
        }
      });
      
      doc.moveDown(1.2);
    });

    doc.end();
  } catch (error) {
    console.error('PDF stock export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export stock PDF' });
    }
  }
});

module.exports = router;