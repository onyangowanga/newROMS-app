import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export const paymentEffect = transaction => ['Receipt', 'Candidate fee', 'Agency commission'].includes(transaction.type) ? 1 : transaction.type === 'Refund' ? -1 : 0;
export const documentSerial = (kind, id) => `${kind}-${id.toUpperCase()}`;
export function renderFinancialPdf(pdf, kind, candidate, transactions, settings, single = false) {
  const left = 48;
  const width = pdf.page.width - 96;
  const ink = '#182c28';
  const muted = '#5b6763';
  const accent = '#146454';
  const currency = amount => Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = value => value ? new Date(value).toLocaleDateString('en-GB') : '-';
  const serial = documentSerial(kind, single ? transactions[0].id : candidate.id);
  const text = (value, x, y, textWidth, options = {}) => pdf.text(String(value ?? ''), x, y, { width: textWidth, ...options });
  const rule = y => pdf.strokeColor('#d8e0dc').lineWidth(0.6).moveTo(left, y).lineTo(left + width, y).stroke();
  const header = continued => {
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(continued ? 13 : 19);
    text(settings.companyName, left, 48, width - 85);
    let bottom = pdf.y;
    if (!continued) {
      if (settings.logoData) pdf.image(Buffer.from(settings.logoData.split(',')[1], 'base64'), left + width - 70, 48, { fit: [70, 52] });
      pdf.fillColor(muted).font('Helvetica').fontSize(9);
      const contactLines = [settings.address, [settings.phone, settings.alternatePhone].filter(Boolean).join(' / '), [settings.email, settings.website].filter(Boolean).join(' | '), [settings.registrationNumber && `Registration: ${settings.registrationNumber}`, settings.taxNumber && `Tax PIN: ${settings.taxNumber}`].filter(Boolean).join(' | ')].filter(Boolean);
      text(contactLines.join('\n'), left, bottom + 7, width - 85);
      bottom = Math.max(pdf.y, 110);
    }
    rule(bottom + 13);
    pdf.fillColor(accent).font('Helvetica-Bold').fontSize(15);
    text(`${single ? 'PAYMENT RECEIPT' : 'ACCOUNT STATEMENT'}${continued ? ' - CONTINUED' : ''}`, left, bottom + 28, width);
    pdf.fillColor(muted).font('Helvetica').fontSize(8);
    text(`Serial: ${serial}`, left, bottom + 51, width);
    text(`Issued: ${date(new Date())}   |   Currency: KES`, left, bottom + 66, width);
    return bottom + 90;
  };
  let cursor = header(false);
  pdf.fillColor(ink).font('Helvetica-Bold').fontSize(11);
  text(candidate.name, left, cursor, width / 2 - 12);
  const nameBottom = pdf.y;
  pdf.font('Helvetica').fontSize(9).fillColor(muted);
  text(`Account: ${candidate.trackingNumber || candidate.id}\nPassport: ${candidate.passport}\nBranch: ${candidate.branch.name}`, left + width / 2, cursor, width / 2);
  const accountBottom = pdf.y;
  text([candidate.email, candidate.phone].filter(Boolean).join('\n'), left, nameBottom + 5, width / 2 - 12);
  cursor = Math.max(pdf.y, accountBottom) + 24;
  const columns = single ? [185, width - 185] : [62, width - 62 - 72 * 3, 72, 72, 72];
  const tableHeader = labels => {
    pdf.save().fillColor(accent).rect(left, cursor, width, 27).fill().restore();
    pdf.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let horizontal = left;
    labels.forEach((label, index) => { text(label, horizontal + 7, cursor + 9, columns[index] - 14, { align: !single && index > 1 ? 'right' : 'left' }); horizontal += columns[index]; });
    cursor += 27;
  };
  const labels = single ? ['PAYMENT DETAILS', 'VALUE'] : ['DATE', 'DESCRIPTION / REFERENCE', 'DEBIT', 'CREDIT', 'BALANCE'];
  const row = (values, voided = false, shade = false) => {
    pdf.font('Helvetica').fontSize(8);
    const height = Math.max(31, ...values.map((value, index) => pdf.heightOfString(String(value), { width: columns[index] - 14 }) + 18));
    if (cursor + height > 695) { pdf.addPage(); cursor = header(true); tableHeader(labels); }
    if (shade) pdf.save().fillColor('#f3f6f4').rect(left, cursor, width, height).fill().restore();
    pdf.font('Helvetica').fontSize(8).fillColor(voided ? '#7c8380' : ink);
    let horizontal = left;
    values.forEach((value, index) => { text(value, horizontal + 7, cursor + 9, columns[index] - 14, { strike: voided, align: !single && index > 1 ? 'right' : 'left' }); horizontal += columns[index]; });
    cursor += height;
    rule(cursor);
  };
  tableHeader(labels);
  const agreed = Number(candidate.commissionTotal || candidate.agreedFee);
  const recordedPaid = transactions.filter(entry => entry.status === 'Paid' && !entry.voided).reduce((sum, entry) => sum + paymentEffect(entry) * Number(entry.amountKes), 0);
  const openingPaid = Number(candidate.paidAmount) - recordedPaid;
  if (single) {
    const entry = transactions[0];
    row(['Payment date', date(entry.date)]);
    row(['Entry type', entry.type], false, true);
    row(['Payment method', entry.paymentMethod]);
    row(['Payment reference', entry.paymentReference || documentSerial('RCT', entry.id)], false, true);
    row(['Original currency / exchange rate', `${entry.currency} ${currency(entry.amount)} / ${Number(entry.exchangeRate || 1)}`]);
    row(['Status', 'APPROVED'], false, true);
    if (entry.otherDescription) row(['Description', entry.otherDescription]);
    if (cursor > 625) { pdf.addPage(); cursor = header(true); }
    pdf.save().fillColor('#e9f3ee').rect(left, cursor + 20, width, 65).fill().restore();
    pdf.font('Helvetica').fontSize(10).fillColor(muted); text('AMOUNT RECEIPTED (KES)', left + 16, cursor + 34, width - 32);
    pdf.font('Helvetica-Bold').fontSize(23).fillColor(accent); text(currency(entry.amountKes), left + 16, cursor + 53, width - 32, { align: 'right' });
    cursor += 115;
    pdf.font('Helvetica').fontSize(9).fillColor(muted); text('This receipt confirms the approved transaction shown above. Keep the serial number for future correspondence.', left, cursor, width);
  } else {
    let balance = agreed;
    row([date(candidate.submitted), 'Agreed commission', currency(agreed), '-', currency(balance)], false, true);
    if (openingPaid) {
      balance -= openingPaid;
      row(['-', 'Opening paid balance (historical)', openingPaid < 0 ? currency(-openingPaid) : '-', openingPaid > 0 ? currency(openingPaid) : '-', currency(balance)]);
    }
    transactions.forEach((entry, index) => {
      const active = entry.status === 'Paid' && !entry.voided;
      const amount = active ? paymentEffect(entry) * Number(entry.amountKes) : 0;
      balance -= amount;
      const status = entry.voided ? 'VOIDED' : entry.status.replaceAll('_', ' ');
      const details = [entry.type, entry.paymentReference || documentSerial('RCT', entry.id), `${entry.paymentMethod || '-'} | ${status}`, entry.otherDescription, !active ? `Not included: KES ${currency(entry.amountKes)}` : null].filter(Boolean).join('\n');
      row([date(entry.date), details, amount < 0 ? currency(-amount) : '-', amount > 0 ? currency(amount) : '-', currency(balance)], entry.voided, index % 2 === 0);
    });
    if (cursor > 590) { pdf.addPage(); cursor = header(true); }
    cursor += 20;
    for (const [label, amount] of [['Total commission agreed', agreed], ['Net approved payments', openingPaid + recordedPaid], ['Closing balance', balance]]) {
      pdf.font(label === 'Closing balance' ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).fillColor(label === 'Closing balance' ? accent : ink);
      text(label, left + 180, cursor, width - 300); text(`KES ${currency(amount)}`, left + width - 125, cursor, 125, { align: 'right' }); cursor += 26;
    }
    pdf.font('Helvetica').fontSize(8).fillColor(muted);
    text('Only approved, active entries affect balances. Pending, rejected and voided entries are retained for reference.', left, cursor + 7, width);
  }
  const pages = pdf.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < pages.count; pageIndex += 1) {
    pdf.switchToPage(pageIndex); pdf.font('Helvetica').fontSize(8).fillColor(muted);
    const bottomMargin = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 16;
    text(`${single ? 'Receipt' : 'Statement'} | ${serial}`, left, pdf.page.height - 32, width - 80, { lineBreak: false });
    text(`Page ${pageIndex + 1} of ${pages.count}`, left + width - 75, pdf.page.height - 32, 75, { align: 'right', lineBreak: false });
    pdf.page.margins.bottom = bottomMargin;
  }
}
export const companySettings = prisma => prisma.companySettings.findUnique({ where: { id: 'company' } }).then(settings => settings || { companyName: 'Rabiya Employment Links', logoData: null });

export function brandPdf(pdf, settings) {
  if (settings.logoData) {
    const bytes = Buffer.from(settings.logoData.split(',')[1], 'base64');
    pdf.image(bytes, pdf.page.margins.left, pdf.y, { fit: [70, 45] });
    pdf.moveDown(4);
  }
  pdf.font('Helvetica-Bold').fontSize(16).text(settings.companyName);
  const contacts = [settings.address, [settings.phone, settings.alternatePhone].filter(Boolean).join(' / '), settings.email, settings.website].filter(Boolean);
  if (contacts.length) pdf.font('Helvetica').fontSize(8).text(contacts.join('\n'));
  pdf.moveDown(0.5);
}

const exportColumns = {
  name: ['Candidate', candidate => candidate.name],
  firstName: ['First name', candidate => candidate.firstName],
  middleName: ['Middle name', candidate => candidate.middleName || ''],
  lastName: ['Last name', candidate => candidate.lastName],
  dateOfBirth: ['Date of birth', candidate => candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toISOString().slice(0, 10) : ''],
  gender: ['Gender', candidate => candidate.gender],
  maritalStatus: ['Marital status', candidate => candidate.maritalStatus],
  weightKg: ['Weight (kg)', candidate => candidate.weightKg ?? ''],
  heightFt: ['Height (ft)', candidate => candidate.heightFt ?? ''],
  trackingNumber: ['Tracking number', candidate => candidate.trackingNumber],
  passport: ['Passport', candidate => candidate.passport],
  passportExpiry: ['Passport expiry', candidate => candidate.passportExpiry ? new Date(candidate.passportExpiry).toISOString().slice(0, 10) : ''],
  nationalId: ['National ID', candidate => candidate.nationalId || ''],
  nationality: ['Nationality', candidate => candidate.nationality || ''],
  email: ['Email', candidate => candidate.email],
  phone: ['Phone', candidate => candidate.phone],
  alternatePhone: ['Alternate phone', candidate => candidate.alternatePhone || ''],
  address: ['Address', candidate => candidate.address || ''],
  registeredBy: ['Registered by', candidate => candidate.registeredBy],
  subAgentName: ['Sub-agent name', candidate => candidate.subAgentName || ''],
  branch: ['Branch', candidate => candidate.branch.name],
  status: ['Stage', candidate => candidate.status.replaceAll('_', ' ')],
  job: ['Job', candidate => candidate.applications.map(item => item.job.title).join(', ')],
  country: ['Country', candidate => candidate.applications.map(item => item.job.country).join(', ')],
  commission: ['Commission (KES)', candidate => Number(candidate.commissionTotal || candidate.agreedFee)],
  paid: ['Paid (KES)', candidate => Number(candidate.paidAmount)],
  balance: ['Balance (KES)', candidate => Number(candidate.commissionTotal || candidate.agreedFee) - Number(candidate.paidAmount)],
  officeFee: ['Office fee (KES)', candidate => Number(candidate.officeFee)],
  visaFee: ['Visa fee (KES)', candidate => Number(candidate.visaFee || 0)],
  medicalFee: ['Medical fee (KES)', candidate => Number(candidate.medicalFee || 0)],
  foreignAffairsAttestationFee: ['Foreign affairs attestation (KES)', candidate => Number(candidate.foreignAffairsAttestationFee || 0)],
  kmpduMedicalFee: ['KMPDU medical fee (KES)', candidate => Number(candidate.kmpduMedicalFee || 0)],
  embassyAttestationFee: ['Embassy attestation (KES)', candidate => Number(candidate.embassyAttestationFee || 0)],
  airTicketFee: ['Air ticket fee (KES)', candidate => Number(candidate.airTicketFee || 0)],
  specialComments: ['Special comments', candidate => candidate.specialComments || ''],
  physicalPassportReceived: ['Physical passport received', candidate => candidate.physicalPassportReceived ? 'Yes' : 'No'],
  documentsVerified: ['Documents verified', candidate => candidate.documentsVerified ? 'Yes' : 'No'],
  interviewDate: ['Interview date', candidate => candidate.interviewDate ? new Date(candidate.interviewDate).toISOString().slice(0, 10) : ''],
  interviewOutcome: ['Interview outcome', candidate => candidate.interviewOutcome || ''],
  offerIssued: ['Offer issued', candidate => candidate.offerIssued ? 'Yes' : 'No'],
  offerSigned: ['Offer signed', candidate => candidate.offerSigned ? 'Yes' : 'No'],
  docs: ['Document count', candidate => candidate.docs || 0],
  submitted: ['Submitted', candidate => candidate.submitted.toISOString().slice(0, 10)]
};

export function registerBusinessRoutes(app, { prisma, auth, allow, audit, fail, candidateWhere }) {
  const financeRoles = ['super_admin', 'super_finance', 'branch_admin', 'branch_finance'];
  app.get('/api/public/company', async (_req, res) => res.json(await companySettings(prisma)));
  app.get('/api/company', auth, async (_req, res) => res.json(await companySettings(prisma)));
  app.put('/api/company', auth, allow('super_admin'), async (req, res) => {
    const companyName = String(req.body.companyName || '').trim();
    const logoData = req.body.logoData || null;
    const details = {};
    for (const field of ['email', 'phone', 'alternatePhone', 'address', 'website', 'registrationNumber', 'taxNumber']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' || req.body[field].length > (field === 'address' ? 240 : 100)) return fail(res, 400, `Enter valid ${field} details.`);
        details[field] = req.body[field].trim() || null;
      }
    }
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) return fail(res, 400, 'Enter a valid company email address.');
    if (details.website) {
      try { if (!['http:', 'https:'].includes(new URL(details.website).protocol)) throw new Error(); }
      catch { return fail(res, 400, 'Website must start with https:// or http://.'); }
    }
    if (!companyName || companyName.length > 100) return fail(res, 400, 'Enter a company name up to 100 characters.');
    if (logoData && (typeof logoData !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logoData) || Buffer.byteLength(logoData) > 700000)) return fail(res, 400, 'Use a PNG or JPEG logo under 500KB.');
    if (logoData) {
      try {
        const probe = new PDFDocument();
        probe.image(Buffer.from(logoData.split(',')[1], 'base64'), 0, 0, { fit: [70, 45] });
        probe.end();
      } catch { return fail(res, 400, 'The logo is not a valid PNG or JPEG image.'); }
    }
    const settings = await prisma.companySettings.upsert({ where: { id: 'company' }, create: { id: 'company', companyName, logoData, ...details }, update: { companyName, logoData, ...details } });
    await audit(req, 'update', 'company_settings', 'company', { companyName });
    res.json(settings);
  });
  app.get('/api/users/report', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
    const users = await prisma.user.findMany({ where: { role: { not: 'candidate' }, ...(req.user.role === 'branch_admin' ? { branchId: req.user.branchId || '__none__' } : {}) }, select: { id: true, name: true, branchId: true, active: true } });
    const activity = await prisma.auditLog.groupBy({ by: ['actorId'], where: { actorId: { in: users.map(user => user.id) } }, _count: { _all: true } });
    res.json(users.map(user => ({ ...user, activity: activity.find(item => item.actorId === user.id)?._count._all || 0 })));
  });
  app.post('/api/candidates/export', auth, allow('super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance'), async (req, res) => {
    const { ids, columns } = req.body;
    if (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => typeof id !== 'string') || !Array.isArray(columns) || !columns.length || columns.length > Object.keys(exportColumns).length || columns.some(column => !Object.hasOwn(exportColumns, column)) || new Set(columns).size !== columns.length) return fail(res, 400, 'Choose valid export rows and columns.');
    const candidates = await prisma.candidate.findMany({ where: { ...candidateWhere(req.user), id: { in: ids } }, include: { branch: true, applications: { include: { job: true } } } });
    const lookup = new Map(candidates.map(candidate => [candidate.id, candidate]));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Candidates');
    sheet.columns = columns.map(column => ({ header: exportColumns[column][0], key: column, width: 24 }));
    for (const id of ids) {
      const candidate = lookup.get(id);
      if (candidate) sheet.addRow(Object.fromEntries(columns.map(column => [column, exportColumns[column][1](candidate)])));
    }
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: columns.length } };
    const bytes = await workbook.xlsx.writeBuffer();
    await audit(req, 'export', 'candidate', null, { rows: sheet.rowCount - 1, columns });
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment('candidates.xlsx').send(Buffer.from(bytes));
  });
  app.delete('/api/passports/:id', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
    const record = await prisma.passportInventory.findUnique({ where: { id: req.params.id } });
    if (!record || (req.user.role === 'branch_admin' && record.branchId !== req.user.branchId)) return fail(res, 404, 'Passport record not found.');
    await prisma.$transaction(async tx => {
      await tx.passportInventory.delete({ where: { id: record.id } });
      await tx.candidate.update({ where: { id: record.candidateId }, data: { physicalPassportReceived: false, physicalPassportReceivedAt: null } });
    });
    await audit(req, 'delete', 'passport_inventory', record.id, { candidateId: record.candidateId });
    res.json({ deleted: true });
  });
  app.post('/api/transactions/:id/void', auth, allow('super_admin', 'super_finance'), async (req, res) => {
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.transaction.findUnique({ where: { id: req.params.id } });
      if (!existing) return { missing: true };
      if (existing.status !== 'Paid' || existing.voided) return { invalid: true };
      const claimed = await tx.transaction.updateMany({ where: { id: existing.id, status: 'Paid', voided: false }, data: { voided: true, voidedAt: new Date(), voidedBy: req.user.id } });
      if (!claimed.count) return { invalid: true };
      const adjustment = -paymentEffect(existing) * Number(existing.amountKes);
      if (existing.candidateId && adjustment) {
        const updated = await tx.candidate.updateMany({ where: { id: existing.candidateId, ...(adjustment < 0 ? { paidAmount: { gte: -adjustment } } : {}) }, data: { paidAmount: { increment: adjustment } } });
        if (!updated.count) throw Object.assign(new Error('Voiding this receipt would make paid totals negative. Void related refunds first.'), { status: 409 });
      }
      return { existing };
    }).catch(error => { if (error.status === 409) return { blocked: error.message }; throw error; });
    if (result.missing) return fail(res, 404, 'Payment not found.');
    if (result.invalid) return fail(res, 409, 'Only approved, active payments can be voided.');
    if (result.blocked) return fail(res, 409, result.blocked);
    await audit(req, 'void', 'transaction', result.existing.id, { candidateId: result.existing.candidateId, amountKes: Number(result.existing.amountKes) });
    res.json({ voided: true });
  });
  const accessibleCandidate = (req, id) => prisma.candidate.findFirst({ where: { ...candidateWhere(req.user), id }, include: { branch: true } });
  const sendPdf = async (res, kind, candidate, transactions, settings, single = false) => {
    const serial = documentSerial(kind, single ? transactions[0].id : candidate.id);
    const pdf = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    res.type('application/pdf').setHeader('Content-Disposition', `inline; filename="${serial}.pdf"`);
    pdf.pipe(res);
    renderFinancialPdf(pdf, kind, candidate, transactions, settings, single);
    pdf.end();
  };
  app.get('/api/candidates/:id/statement.pdf', auth, allow(...financeRoles), async (req, res) => {
    const candidate = await accessibleCandidate(req, req.params.id);
    if (!candidate) return fail(res, 404, 'Candidate not found.');
    const transactions = await prisma.transaction.findMany({ where: { candidateId: candidate.id }, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
    await sendPdf(res, 'STM', candidate, transactions, await companySettings(prisma));
  });
  app.get('/api/transactions/:id/receipt.pdf', auth, allow(...financeRoles), async (req, res) => {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return fail(res, 404, 'Payment not found.');
    const candidate = transaction.candidateId && await accessibleCandidate(req, transaction.candidateId);
    if (!candidate) return fail(res, 404, 'Payment not found.');
    if (transaction.voided || transaction.status !== 'Paid') return fail(res, 409, 'Receipts are available only for approved, active payments.');
    await sendPdf(res, 'RCT', candidate, [transaction], await companySettings(prisma), true);
  });
}