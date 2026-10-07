import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import PDFKit from 'pdfkit';
import { registerBusinessRoutes, paymentEffect, renderFinancialPdf } from './business.js';

const branch = { id: 'branch-a', name: 'Branch A' };
const candidate = { id: 'candidate-a', name: '=SUM(1,1)', passport: 'P123', branchId: branch.id, branch, trackingNumber: 'ROMS-A-001', commissionTotal: 2000, agreedFee: 2000, paidAmount: 1000, officeFee: 100, submitted: new Date(), applications: [] };
const payment = { id: 'payment-a', candidateId: candidate.id, branchId: branch.id, type: 'Receipt', amount: 1000, amountKes: 1000, currency: 'KES', paymentMethod: 'Cash', status: 'Paid', voided: false, date: new Date() };

async function fixture(role = 'super_admin', branchId = branch.id) {
  const state = { candidate: structuredClone(candidate), payment: structuredClone(payment), passport: { id: 'passport-a', candidateId: candidate.id, branchId: branch.id }, settings: null };
  const prisma = {
    companySettings: { findUnique: async () => state.settings, upsert: async ({ create }) => { state.settings = create; return create; } },
    candidate: {
      findFirst: async ({ where }) => where.branchId && where.branchId !== branch.id ? null : state.candidate,
      findMany: async ({ where }) => where.branchId && where.branchId !== branch.id ? [] : [state.candidate],
      update: async ({ data }) => Object.assign(state.candidate, data),
      updateMany: async ({ where, data }) => {
        if (where.paidAmount && state.candidate.paidAmount < where.paidAmount.gte) return { count: 0 };
        state.candidate.paidAmount += data.paidAmount.increment; return { count: 1 };
      }
    },
    transaction: {
      findUnique: async () => state.payment,
      findMany: async () => [state.payment],
      updateMany: async ({ data }) => { if (state.payment.voided) return { count: 0 }; Object.assign(state.payment, data); return { count: 1 }; }
    },
    passportInventory: { findUnique: async () => state.passport, delete: async () => { state.passport = null; } },
    user: { findMany: async () => [] }, auditLog: { groupBy: async () => [] }
  };
  prisma.$transaction = async callback => {
    const snapshot = structuredClone(state);
    try { return await callback(prisma); } catch (error) { Object.assign(state, snapshot); throw error; }
  };
  const app = express(); app.use(express.json());
  const auth = (req, _res, next) => { req.user = { id: 'user-a', role, branchId }; next(); };
  const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.sendStatus(403);
  registerBusinessRoutes(app, { prisma, auth, allow, audit: async () => {}, fail: (res, status, message) => res.status(status).json({ message }), candidateWhere: user => ['super_admin', 'super_finance'].includes(user.role) ? {} : { branchId: user.branchId } });
  app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  return { state, request: (path, options = {}) => fetch(`${url}${path}`, { ...options, headers: { 'Content-Type': 'application/json' } }), close: () => new Promise(resolve => server.close(resolve)) };
}

test('payment effects include receipts/refunds but exclude Other', () => {
  assert.equal(paymentEffect({ type: 'Receipt' }), 1);
  assert.equal(paymentEffect({ type: 'Refund' }), -1);
  assert.equal(paymentEffect({ type: 'Other' }), 0);
});
test('Excel honors selected column order and stores formula-like names as text', async () => {
  const app = await fixture();
  try {
    const response = await app.request('/candidates/export', { method: 'POST', body: JSON.stringify({ ids: [candidate.id], columns: ['email', 'name'] }) });
    assert.equal(response.status, 200);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    const sheet = workbook.worksheets[0]; assert.equal(sheet.getCell('A1').value, 'Email'); assert.equal(sheet.getCell('B2').value, candidate.name);
    const invalid = await app.request('/candidates/export', { method: 'POST', body: JSON.stringify({ ids: [candidate.id], columns: ['__proto__'] }) }); assert.equal(invalid.status, 400);
  } finally { await app.close(); }
});
test('Excel exports complete registration fields with safe blanks and dates', async () => {
  const app = await fixture();
  Object.assign(app.state.candidate, { firstName: 'Alice', middleName: null, lastName: 'Example', dateOfBirth: new Date('1995-02-03'), gender: 'Female', maritalStatus: 'Single', weightKg: 62, heightFt: 5.5, passportExpiry: new Date('2030-10-01'), nationality: 'Kenyan', nationalId: '001234', registeredBy: 'Sub-Agent', subAgentName: 'Agent Example', alternatePhone: '0700000000', address: 'Nairobi' });
  try {
    const columns = ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus', 'weightKg', 'heightFt', 'passportExpiry', 'nationalId', 'nationality', 'registeredBy', 'subAgentName', 'alternatePhone', 'address'];
    const response = await app.request('/candidates/export', { method: 'POST', body: JSON.stringify({ ids: [candidate.id], columns }) }); assert.equal(response.status, 200);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getCell('A2').value, 'Alice'); assert.equal(sheet.getCell('C2').value, 'Example'); assert.equal(sheet.getCell('D2').value, '1995-02-03');
    assert.equal(sheet.getCell('E2').value, 'Female'); assert.equal(sheet.getCell('G2').value, 62); assert.equal(sheet.getCell('J2').value, '001234');
    assert.equal(sheet.getCell('M2').value, 'Agent Example');
  } finally { await app.close(); }
});
test('void reverses approved receipt once and blocks receipt PDFs', async () => {
  const app = await fixture();
  try {
    const receipt = await app.request('/transactions/payment-a/receipt.pdf'); assert.equal(receipt.status, 200);
    assert.equal((await PDFDocument.load(await receipt.arrayBuffer())).getPageCount(), 1);
    assert.equal((await app.request('/transactions/payment-a/void', { method: 'POST' })).status, 200);
    assert.equal(app.state.candidate.paidAmount, 0); assert.equal(app.state.payment.voided, true);
    assert.equal((await app.request('/transactions/payment-a/void', { method: 'POST' })).status, 409);
    assert.equal((await app.request('/transactions/payment-a/receipt.pdf')).status, 409);
    const statement = await app.request('/candidates/candidate-a/statement.pdf'); assert.equal(statement.status, 200);
    assert.ok((await PDFDocument.load(await statement.arrayBuffer())).getPageCount());
  } finally { await app.close(); }
});
test('invalid void rolls back record and balance', async () => {
  const app = await fixture(); app.state.candidate.paidAmount = 500;
  try {
    assert.equal((await app.request('/transactions/payment-a/void', { method: 'POST' })).status, 409);
    assert.equal(app.state.payment.voided, false); assert.equal(app.state.candidate.paidAmount, 500);
  } finally { await app.close(); }
});
test('branch admin cannot void or delete another branch passport', async () => {
  const app = await fixture('branch_admin', 'branch-b');
  try {
    assert.equal((await app.request('/transactions/payment-a/void', { method: 'POST' })).status, 403);
    assert.equal((await app.request('/passports/passport-a', { method: 'DELETE' })).status, 404);
    assert.equal((await app.request('/transactions/payment-a/receipt.pdf')).status, 404);
    const exportResponse = await app.request('/candidates/export', { method: 'POST', body: JSON.stringify({ ids: [candidate.id], columns: ['name'] }) });
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await exportResponse.arrayBuffer()));
    assert.equal(workbook.worksheets[0].rowCount, 1);
  } finally { await app.close(); }
});
test('passport delete resets physical custody so inventory read cannot recreate it', async () => {
  const app = await fixture('branch_admin');
  try {
    assert.equal((await app.request('/passports/passport-a', { method: 'DELETE' })).status, 200);
    assert.equal(app.state.passport, null); assert.equal(app.state.candidate.physicalPassportReceived, false);
  } finally { await app.close(); }
});
test('company branding is editable only by super admin and rejects unsafe logos', async () => {
  const app = await fixture(); const branchApp = await fixture('branch_admin');
  try {
    assert.equal((await branchApp.request('/company', { method: 'PUT', body: JSON.stringify({ companyName: 'Example' }) })).status, 403);
    assert.equal((await app.request('/company', { method: 'PUT', body: JSON.stringify({ companyName: 'Example', logoData: 'data:image/svg+xml;base64,abc' }) })).status, 400);
    assert.equal((await app.request('/company', { method: 'PUT', body: JSON.stringify({ companyName: 'Rabiya Employment Links' }) })).status, 200);
  } finally { await app.close(); await branchApp.close(); }
});

test('company contact details persist and invalid email or website is rejected', async () => {
  const app = await fixture();
  try {
    const settings = { companyName: 'Rabiya Employment Links', email: 'office@example.test', phone: '+254 700 000 000', address: 'Nairobi, Kenya', website: 'https://example.test', taxNumber: 'PIN123' };
    assert.equal((await app.request('/company', { method: 'PUT', body: JSON.stringify(settings) })).status, 200);
    assert.equal(app.state.settings.phone, settings.phone); assert.equal(app.state.settings.email, settings.email);
    assert.equal((await app.request('/company', { method: 'PUT', body: JSON.stringify({ ...settings, email: 'invalid' }) })).status, 400);
    assert.equal((await app.request('/company', { method: 'PUT', body: JSON.stringify({ ...settings, website: 'javascript:alert(1)' }) })).status, 400);
  } finally { await app.close(); }
});

test('professional PDF statement paginates many rows and receipt stays one page', async () => {
  const render = async (single, count) => {
    const pdf = new PDFKit({ size: 'A4', margin: 48, bufferPages: true }); const chunks = [];
    const completed = new Promise((resolve, reject) => { pdf.on('data', bytes => chunks.push(bytes)); pdf.on('end', () => resolve(Buffer.concat(chunks))); pdf.on('error', reject); });
    const entries = Array.from({ length: count }, (_, index) => ({ ...payment, id: `payment-${index}`, otherDescription: 'Commission instalment', paymentReference: `BANK-${index}` }));
    renderFinancialPdf(pdf, single ? 'RCT' : 'STM', candidate, entries, { companyName: 'Rabiya Employment Links', address: 'Nairobi, Kenya', email: 'office@example.test', phone: '+254 700 000 000' }, single);
    pdf.end(); const bytes = await completed;
    fs.mkdirSync('../test-results', { recursive: true });
    fs.writeFileSync(`../test-results/professional-${single ? 'receipt' : 'statement'}.pdf`, bytes);
    return PDFDocument.load(bytes);
  };
  assert.equal((await render(true, 1)).getPageCount(), 1);
  const statement = await render(false, 45); assert.ok(statement.getPageCount() >= 3); assert.ok(statement.getPageCount() < 10);
  for (const page of statement.getPages()) assert.ok(page.getSize().width > 590);
});