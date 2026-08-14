import { PDFPage, StandardFonts, rgb } from 'pdf-lib';

import type { BillingPdfBranding } from './types';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PAGE_MARGIN = 52;

export function normalizeText(value: string | null | undefined, fallback = '—') {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function safeDisplayText(value: string | null | undefined, fallback = 'N/A') {
  return normalizeText(value, fallback);
}

export function clampText(value: string | null | undefined, maxLength = 80) {
  const text = normalizeText(value, '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getBrandingConfig(): BillingPdfBranding {
  const website = process.env.NEXT_PUBLIC_SITE_URL || 'https://the-financial-reset.com';
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.INTAKE_NOTIFICATION_EMAIL ||
    process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ||
    'blackwealthmanagement@gmail.com';

  return {
    brandName: 'The Financial Reset',
    website,
    supportEmail,
    businessPhone: process.env.BUSINESS_PHONE || '(470) 661-2258',
    footerText: 'Educational financial guidance and general wellness resources only.',
    accentColor: [0.04, 0.12, 0.2]
  };
}

export function formatCurrency(cents: number | null | undefined, currency = 'USD') {
  const safeCents = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  const normalized = (safeCents / 100).toFixed(2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(normalized));
}

export function formatDate(value?: string | null, fallback = '—') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function drawHorizontalRule(page: PDFPage, y: number, color = rgb(0.86, 0.88, 0.9), startX = PAGE_MARGIN, endX = PAGE_WIDTH - PAGE_MARGIN) {
  page.drawLine({
    start: { x: startX, y },
    end: { x: endX, y },
    thickness: 1,
    color
  });
}

export function drawFieldPair(page: PDFPage, label: string, value: string, x: number, y: number, font: any, boldFont: any, labelColor = rgb(0.38, 0.45, 0.52), valueColor = rgb(0.09, 0.13, 0.19), labelSize = 9, valueSize = 11) {
  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font,
    color: labelColor
  });

  page.drawText(value, {
    x,
    y: y - 14,
    size: valueSize,
    font: boldFont,
    color: valueColor
  });
}

export function buildDisplayReference(paymentRecordId?: string | null, invoiceNumber?: string) {
  if (paymentRecordId) {
    const shortId = paymentRecordId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `RCPT-${shortId}`;
  }

  if (invoiceNumber) {
    const shortInvoice = invoiceNumber.replace(/[^A-Z0-9]/gi, '').slice(0, 10).toUpperCase();
    return `RCPT-${shortInvoice || 'PAYMENT'}`;
  }

  return 'RCPT-PAYMENT';
}

export async function getPdfFonts(pdfDoc: any) {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  };
}
