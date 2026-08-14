import { PDFDocument, rgb } from 'pdf-lib';

import {
  buildDisplayReference,
  clampText,
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
import type { ReceiptPdfData } from './types';

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const branding = getBrandingConfig();
  const fonts = await getPdfFonts(pdfDoc);
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const receiptReference = normalizeText(data.receiptReference, buildDisplayReference(data.paymentRecordId, data.invoiceNumber));
  const displayAmount = formatCurrency(data.amountCents, data.currency || 'USD');
  const paymentMethod = normalizeText(data.paymentMethod, 'Manual');
  const paymentProcessor = normalizeText(data.processor, 'Unspecified');
  const paymentDate = formatDate(data.paymentDate, '—');

  page.drawText('THE FINANCIAL RESET', {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 52,
    size: 18,
    font: fonts.bold,
    color: rgb(0.04, 0.12, 0.2)
  });

  page.drawText('PAYMENT RECEIPT', {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 74,
    size: 22,
    font: fonts.bold,
    color: rgb(0.04, 0.12, 0.2)
  });

  page.drawText('Payment Received', {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 96,
    size: 11,
    font: fonts.bold,
    color: rgb(0.12, 0.52, 0.38)
  });

  drawHorizontalRule(page, PAGE_HEIGHT - 110);

  let y = PAGE_HEIGHT - 142;
  page.drawText('Receipt Reference', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(receiptReference, { x: PAGE_MARGIN, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  page.drawText('Invoice', { x: 250, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(normalizeText(data.invoiceNumber, '—'), { x: 250, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  y -= 52;
  page.drawText('Client', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(clampText(data.clientName, 46), { x: PAGE_MARGIN, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  page.drawText('Client Email', { x: 250, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(clampText(data.clientEmail, 34), { x: 250, y: y - 14, size: 11, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  y -= 58;
  page.drawText('Amount Paid', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(displayAmount, { x: PAGE_MARGIN, y: y - 14, size: 18, font: fonts.bold, color: rgb(0.04, 0.12, 0.2) });

  page.drawText('Payment Date', { x: 250, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(paymentDate, { x: 250, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  y -= 58;
  page.drawText('Payment Method', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(paymentMethod, { x: PAGE_MARGIN, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  page.drawText('Processor', { x: 250, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(paymentProcessor, { x: 250, y: y - 14, size: 12, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  y -= 58;
  const transactionReference = normalizeText(data.transactionReference || data.stripeChargeId || data.stripePaymentIntentId, '—');
  page.drawText('Transaction Reference', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
  page.drawText(clampText(transactionReference, 52), { x: PAGE_MARGIN, y: y - 14, size: 11, font: fonts.bold, color: rgb(0.09, 0.13, 0.19) });

  if (data.note) {
    y -= 52;
    page.drawText('Notes', { x: PAGE_MARGIN, y, size: 9, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });
    page.drawText(clampText(data.note, 110), { x: PAGE_MARGIN, y: y - 14, size: 10, font: fonts.regular, color: rgb(0.09, 0.13, 0.19), maxWidth: 260 });
  }

  const footerY = 36;
  page.drawText('This receipt confirms payment received.', { x: PAGE_MARGIN, y: footerY + 18, size: 9, font: fonts.bold, color: rgb(0.12, 0.52, 0.38) });
  page.drawText(`${branding.brandName} • ${branding.supportEmail} • ${branding.website}`, { x: PAGE_MARGIN, y: footerY, size: 8, font: fonts.regular, color: rgb(0.38, 0.45, 0.52) });

  return pdfDoc.save();
}
