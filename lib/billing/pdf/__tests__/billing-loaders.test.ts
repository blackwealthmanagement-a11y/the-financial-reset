import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeDocumentFilename } from '../loaders.ts';

test('sanitizeDocumentFilename strips unsafe characters and keeps a stable slug', () => {
  assert.equal(sanitizeDocumentFilename('Invoice #2026-08-01 (Paid).pdf'), 'Invoice-2026-08-01-Paid.pdf');
  assert.equal(sanitizeDocumentFilename('   !!!   '), 'document');
});

test('sanitizeDocumentFilename preserves extension-like names without breaking the output', () => {
  assert.equal(sanitizeDocumentFilename('Receipt-2026.pdf'), 'Receipt-2026.pdf');
});
