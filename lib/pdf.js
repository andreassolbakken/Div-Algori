'use strict';

const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { blocks } = require('./contract');
const { getSignature } = require('./db');

const COLORS = {
  heading: [31, 56, 100],
  tableHeader: [31, 56, 100],
  tableBorder: '#BFBFBF',
};

const MARGINS = { top: 50, bottom: 70, left: 50, right: 50 };
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

function createDoc() {
  return new PDFDocument({
    size: 'A4',
    margins: MARGINS,
    bufferPages: true,
    info: { Title: 'Konsulentavtale', Author: 'Veien til Hjertet' },
  });
}

function collectBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    doc
      .save()
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'Konsulentavtale · Evelyn Floan og Sara Endestad',
        MARGINS.left,
        20,
        { width: CONTENT_WIDTH, align: 'right' }
      )
      .restore();
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        `Side ${i + 1} av ${total}`,
        MARGINS.left,
        PAGE_HEIGHT - MARGINS.bottom + 15,
        { width: CONTENT_WIDTH, align: 'center' }
      );
  }
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > PAGE_HEIGHT - MARGINS.bottom) {
    doc.addPage();
  }
}

function renderTitle(doc, block) {
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.heading)
    .text(block.main, { align: 'center' })
    .moveDown(0.3)
    .fontSize(13)
    .text(block.subtitle, { align: 'center' })
    .moveDown(0.2)
    .fontSize(11)
    .text(block.subsubtitle, { align: 'center' })
    .moveDown(1.5);
}

function renderH2(doc, block) {
  ensureSpace(doc, 30);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(COLORS.heading)
    .text(block.text)
    .moveDown(0.4);
}

function renderH3(doc, block) {
  ensureSpace(doc, 20);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.heading)
    .text(block.text)
    .moveDown(0.3);
}

function renderParagraph(doc, block) {
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#000000')
    .text(block.text, { lineGap: 2 })
    .moveDown(0.5);
}

function renderBullets(doc, block) {
  for (const item of block.items) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#000000')
      .text('• ' + item, { indent: 10, lineGap: 2 })
      .moveDown(0.2);
  }
  doc.moveDown(0.3);
}

function renderTable(doc, block) {
  const hasHeader = !!block.header;
  const rows = block.rows;
  const isKeyValue = !hasHeader;

  let colWidths;
  if (isKeyValue) {
    colWidths = [CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.65];
  } else {
    const n = block.header.length;
    colWidths = Array(n).fill(CONTENT_WIDTH / n);
  }

  const rowHeight = 18;
  const totalRows = (hasHeader ? 1 : 0) + rows.length;
  ensureSpace(doc, totalRows * rowHeight + 10);

  const x = MARGINS.left;
  let y = doc.y;

  function drawRow(cells, isBold, isHeader) {
    if (isHeader) {
      doc.rect(x, y, CONTENT_WIDTH, rowHeight)
        .fill(`rgb(${COLORS.tableHeader.join(',')})`);
    } else {
      doc.rect(x, y, CONTENT_WIDTH, rowHeight).fill('#FFFFFF');
    }
    doc.rect(x, y, CONTENT_WIDTH, rowHeight).stroke(COLORS.tableBorder);

    let cx = x;
    for (let i = 0; i < cells.length; i++) {
      const w = colWidths[i];
      doc.rect(cx, y, w, rowHeight).stroke(COLORS.tableBorder);
      doc
        .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(isHeader ? '#FFFFFF' : '#000000')
        .text(String(cells[i]), cx + 4, y + 4, { width: w - 8, height: rowHeight - 4, lineBreak: false });
      cx += w;
    }
    y += rowHeight;
  }

  if (hasHeader) {
    drawRow(block.header, true, true);
  }
  for (const row of rows) {
    drawRow(row, isKeyValue, false);
  }

  doc.y = y + 6;
  doc.moveDown(0.3);
}

function renderSignatureBlock(doc, block, signatures) {
  ensureSpace(doc, 200);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(COLORS.heading)
    .text('20. Signaturer')
    .moveDown(0.8);

  const colW = (CONTENT_WIDTH - 20) / 2;
  const startY = doc.y;

  for (let i = 0; i < block.parties.length; i++) {
    const party = block.parties[i];
    const sig = signatures ? signatures[party.party] : null;
    const xPos = MARGINS.left + i * (colW + 20);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000000')
      .text(`For ${party.role}:`, xPos, startY, { width: colW });

    let yPos = startY + 18;

    if (sig && sig.signed_at && sig.signature_dataurl) {
      try {
        const base64 = sig.signature_dataurl.replace(/^data:image\/png;base64,/, '');
        const imgBuf = Buffer.from(base64, 'base64');
        doc.image(imgBuf, xPos, yPos, { width: colW, height: 60 });
        yPos += 68;
      } catch {
        doc.moveTo(xPos, yPos + 40).lineTo(xPos + colW, yPos + 40).stroke('#000000');
        yPos += 50;
      }
    } else {
      doc.moveTo(xPos, yPos + 40).lineTo(xPos + colW, yPos + 40).stroke('#000000');
      yPos += 50;
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#000000')
      .text(party.name, xPos, yPos, { width: colW })
      .text(`${party.company} (orgnr ${party.orgnr})`, xPos, yPos + 12, { width: colW });

    if (sig && sig.signed_at) {
      doc
        .text(`Signert digitalt: ${sig.signed_at}`, xPos, yPos + 24, { width: colW })
        .text(`IP: ${sig.signer_ip || '-'} | Hash: ...${(sig.pdf_hash || '').slice(-8)}`, xPos, yPos + 36, { width: colW });
    }
  }

  doc.y = startY + 170;
  doc.moveDown(0.5);
}

function renderAttachments(doc, block) {
  ensureSpace(doc, 80);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLORS.heading)
    .text('Vedlegg')
    .moveDown(0.4);
  for (const item of block.items) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#000000')
      .text('• ' + item)
      .moveDown(0.2);
  }
}

async function renderBlocks(doc, signatures) {
  for (const block of blocks) {
    switch (block.type) {
      case 'title':           renderTitle(doc, block); break;
      case 'h2':              renderH2(doc, block); break;
      case 'h3':              renderH3(doc, block); break;
      case 'paragraph':       renderParagraph(doc, block); break;
      case 'bullets':         renderBullets(doc, block); break;
      case 'table':           renderTable(doc, block); break;
      case 'signature_block': renderSignatureBlock(doc, block, signatures); break;
      case 'attachments':     renderAttachments(doc, block); break;
    }
  }
}

async function generateUnsignedPDF() {
  const doc = createDoc();
  const bufPromise = collectBuffer(doc);
  await renderBlocks(doc, null);
  addPageNumbers(doc);
  doc.end();
  return bufPromise;
}

async function generateSignedPDF() {
  const evelynSig = getSignature('evelyn');
  const saraSig = getSignature('sara');
  const signatures = { evelyn: evelynSig, sara: saraSig };

  const doc = createDoc();
  const bufPromise = collectBuffer(doc);
  await renderBlocks(doc, signatures);
  addPageNumbers(doc);
  doc.end();
  return bufPromise;
}

function computeHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

module.exports = { generateUnsignedPDF, generateSignedPDF, computeHash };
