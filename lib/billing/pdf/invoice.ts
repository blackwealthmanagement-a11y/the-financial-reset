import { PDFDocument, rgb } from 'pdf-lib';

import {
  clampText,
  drawFieldPair,
  drawHorizontalRule,
  formatCurrency,
  formatDate,
  getBrandingConfig,
  getPdfFonts,
  normalizeText,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH
} from './shared';
import type { InvoicePdfData } from './types';

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const branding = getBrandingConfig();
  const fonts = await getPdfFonts(pdfDoc);
  const statusText = normalizeText(String(data.status || 'draft'), 'draft').toUpperCase();

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 54;

  page.drawText('THE FINANCIAL RESET', {
    x: PAGE_MARGIN,
    y,
    size: 22,
    font: fonts.bold,
    color: rgb(0.04, 0.12, 0.2)
  });

  page.drawText('INVOICE', {
    x: PAGE_MARGIN,
    y: y - 18,
    size: 12,
    font: fonts.bold,
    color: rgb(0.38, 0.45, 0.52)
  });

  page.drawText(statusText, {
    x: PAGE_WIDTH - PAGE_MARGIN - 120,
    y,
    size: 10,
    font: fonts.bold,
    color: rgb(0.12, 0.52, 0.38)
  });

  y -= 52;
  drawHorizontalRule(page, y);
  y -= 24;

  const invoiceNumber = normalizeText(data.invoiceNumber, '—');
  const clientName = normalizeText(data.clientName, 'Unknown Client');
  const clientEmail = normalizeText(data.clientEmail, 'No email on file');

  drawFieldPair(page, 'Invoice Number', invoiceNumber, PAGE_MARGIN, y, fonts.regular, fonts.bold);
  drawFieldPair(page, 'Client', clientName, 230, y, fonts.regular, fonts.bold);
  drawFieldPair(page, 'Client Email', clientEmail, 390, y, fonts.regular, fonts.bold);

  y -= 42;
  drawFieldPair(page, 'Issue Date', formatDate(data.issueDate), PAGE_MARGIN, y, fonts.regular, fonts.bold);
  drawFieldPair(page, 'Due Date', formatDate(data.dueDate), 230, y, fonts.regular, fonts.bold);
  drawFieldPair(page, 'Paid Date', formatDate(data.paidDate), 390, y, fonts.regular, fonts.bold);

  y -= 62;
  page.drawText('LINE ITEMS', { x: PAGE_MARGIN, y, size: 11, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
  drawHorizontalRule(page, y - 8);

  let currentPage = page;
  let currentY = y - 26;
  const items = data.items || [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (currentY < 160) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - 58;
      currentPage.drawText('LINE ITEMS CONTINUED', { x: PAGE_MARGIN, y: currentY, size: 11, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
      drawHorizontalRule(currentPage, currentY - 8);
      currentY -= 26;
    }

    const qty = String(item.quantity ?? 1);
    const description = clampText(item.description || 'Service', 52);
    const unitPrice = formatCurrency(item.unitPriceCents ?? 0, data.currency || 'USD');
    const lineTotal = formatCurrency(item.lineTotalCents ?? 0, data.currency || 'USD');

    currentPage.drawText(description, {
      x: PAGE_MARGIN,
      y: currentY,
      size: 9,
      font: fonts.regular,
      color: rgb(0.12, 0.16, 0.2)
    });
    currentPage.drawText(qty, {
      x: 330,
      y: currentY,
      size: 9,
      font: fonts.regular,
      color: rgb(0.12, 0.16, 0.2)
    });
    currentPage.drawText(unitPrice, {
      x: 380,
      y: currentY,
      size: 9,
      font: fonts.regular,
      color: rgb(0.12, 0.16, 0.2)
    });
    currentPage.drawText(lineTotal, {
      x: PAGE_WIDTH - PAGE_MARGIN - 70,
      y: currentY,
      size: 9,
      font: fonts.bold,
      color: rgb(0.12, 0.16, 0.2)
    });

    currentY -= 20;
  }

  const lastPage = pdfDoc.getPageCount() > 0 ? pdfDoc.getPage(pdfDoc.getPageCount() - 1) : page;
  const totalsY = currentY > 180 ? currentY : 180;
  drawHorizontalRule(lastPage, totalsY - 4);

  const subtotal = data.subtotalCents ?? 0;
  const discount = Math.max(0, data.discountCents ?? 0);
  const total = data.totalCents ?? Math.max(0, subtotal - discount);
  const amountPaid = data.amountPaidCents ?? (data.paidDate ? Math.max(0, total) : 0);
  const balance = data.balanceDueCents ?? Math.max(0, total - amountPaid);

  lastPage.drawText('Subtotal', { x: 360, y: totalsY, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  lastPage.drawText(formatCurrency(subtotal, data.currency || 'USD'), { x: PAGE_WIDTH - PAGE_MARGIN - 70, y: totalsY, size: 9, font: fonts.bold, color: rgb(0.12, 0.16, 0.2) });

  if (discount > 0) {
    lastPage.drawText('Discount', { x: 360, y: totalsY - 18, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
    lastPage.drawText(`-${formatCurrency(discount, data.currency || 'USD')}`, { x: PAGE_WIDTH - PAGE_MARGIN - 70, y: totalsY - 18, size: 9, font: fonts.bold, color: rgb(0.12, 0.16, 0.2) });
  }

  const totalY = discount > 0 ? totalsY - 36 : totalsY - 18;
  lastPage.drawText('Total', { x: 360, y: totalY, size: 10, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
  lastPage.drawText(formatCurrency(total, data.currency || 'USD'), { x: PAGE_WIDTH - PAGE_MARGIN - 70, y: totalY, size: 10, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });

  if (amountPaid > 0 || data.paidDate) {
    const amountPaidY = totalY - 24;
    lastPage.drawText('Amount Paid', { x: 360, y: amountPaidY, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
    lastPage.drawText(formatCurrency(amountPaid, data.currency || 'USD'), { x: PAGE_WIDTH - PAGE_MARGIN - 70, y: amountPaidY, size: 9, font: fonts.bold, color: rgb(0.12, 0.16, 0.2) });
  }

  if (balance > 0) {
    const balanceY = (amountPaid > 0 || data.paidDate ? totalY - 48 : totalY - 24);
    lastPage.drawText('Balance Due', { x: 360, y: balanceY, size: 10, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
    lastPage.drawText(formatCurrency(balance, data.currency || 'USD'), { x: PAGE_WIDTH - PAGE_MARGIN - 70, y: balanceY, size: 10, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
  }

  if (data.notes) {
    const notesLines = clampText(data.notes, 260);
    const notesY = Math.max(120, (balance > 0 ? 150 : 120));
    lastPage.drawText('Notes', { x: PAGE_MARGIN, y: notesY, size: 10, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });
    lastPage.drawText(notesLines, { x: PAGE_MARGIN, y: notesY - 16, size: 9, font: fonts.regular, color: rgb(0.12, 0.16, 0.2), maxWidth: 260 });
  }

  const footerY = 28;
  const footerText = `${branding.brandName} • ${branding.supportEmail} • ${branding.website}`;
  lastPage.drawText(footerText, { x: PAGE_MARGIN, y: footerY, size: 8, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  lastPage.drawText(branding.footerText, { x: PAGE_MARGIN, y: footerY - 12, size: 7, font: fonts.italic, color: rgb(0.38, 0.45, 0.52) });

  return pdfDoc.save();
}
