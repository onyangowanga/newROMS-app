import { createElement, Bell, Download } from './ui-icons.js';

export function createBusinessUI({ store, app, modal, money, escapeHtml, showToast, saveDocument, previewCandidateDocument, branchName, showTemporaryCredential }) {
  const safe = escapeHtml;
  const approved = entry => entry.status === 'Paid' && !entry.voided;
  const effect = entry => ['Receipt', 'Candidate fee', 'Agency commission'].includes(entry.type) ? 1 : entry.type === 'Refund' ? -1 : 0;
  const total = candidate => Number(candidate.commissionTotal || candidate.agreedFee || 0);
  const date = value => value ? new Date(value).toLocaleDateString('en-GB') : '-';
  const scopedCandidates = () => store.data.candidates.filter(candidate => !store.user.branchId || ['super_admin', 'super_finance', 'recruiter'].includes(store.user.role) || candidate.branchId === store.user.branchId);
  const financeAllowed = () => ['super_admin', 'super_finance', 'branch_admin', 'branch_finance'].includes(store.user.role);
  const metrics = items => `<section class="business-metrics">${items.map(([label, value]) => `<div><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`).join('')}</section>`;
  function recruiterPage() {
    return `<section class="p-5"><div class="finance-heading"><h2 class="display text-lg font-bold">Recruiters / Employers</h2><button type="button" class="btn btn-primary" data-new-recruiter>Add recruiter</button></div><div class="table-wrap mt-5"><table><thead><tr><th>Recruiter / employer</th><th>Username</th><th>Email</th><th>Branch</th><th>Status</th></tr></thead><tbody>${store.data.recruiters.map(user => `<tr><td>${safe(user.name)}</td><td>${safe(user.username || '-')}</td><td>${safe(user.email)}</td><td>${safe(user.branchId ? branchName(user.branchId) : 'Global')}</td><td>${user.active ? 'Active' : 'Inactive'}</td></tr>`).join('') || '<tr><td colspan="5">No recruiters registered.</td></tr>'}</tbody></table></div></section>`;
  }
  function addRecruiter() {
    const element = modal('Add recruiter / employer', `<form data-recruiter-form class="space-y-4"><label class="block">Recruiter / employer name<input class="input mt-2 w-full" name="name" required></label><label class="block">Username<input class="input mt-2 w-full" name="username" minlength="3" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required></label><label class="block">Email<input class="input mt-2 w-full" name="email" type="email" required></label>${store.user.role === 'super_admin' ? `<label class="block">Branch<select class="select mt-2 w-full" name="branchId"><option value="">Global recruiter</option>${store.data.branches.map(branch => `<option value="${branch.id}">${safe(branch.name)}</option>`).join('')}</select></label>` : ''}<button class="btn btn-primary" type="submit">Create recruiter account</button></form>`);
    element.querySelector('form').onsubmit = async event => {
      event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
      try { const result = await store.addRecruiter(Object.fromEntries(new FormData(event.currentTarget))); element.remove(); showTemporaryCredential(result); }
      catch (error) { showToast(error.message); button.disabled = false; }
    };
  }
  function employerSelector(element, selected = '') {
    const input = element.querySelector('#job-employer, [name="employer"]');
    if (!input) return;
    const select = document.createElement('select'); select.id = input.id || 'edit-job-employer'; select.name = 'recruiterId'; select.className = input.className.replace('input', 'select'); select.required = true;
    select.innerHTML = `<option value="">Select recruiter / employer</option>${store.data.recruiters.filter(user => user.active).map(user => `<option value="${user.id}">${safe(user.name)}</option>`).join('')}`;
    select.value = store.user.role === 'recruiter' ? store.user.id : selected;
    select.disabled = store.user.role === 'recruiter'; input.replaceWith(select);
  }
  function jobDetails() {
    app.querySelectorAll('[data-open-application], [data-public-apply]').forEach(card => {
      const job = store.data.jobs.find(item => item.id === (card.dataset.openApplication || card.dataset.publicApply));
      if (!job || card.querySelector('[data-job-terms]')) return;
      card.insertAdjacentHTML('beforeend', `<span class="block mt-3 border-t border-stone-200 pt-3" data-job-terms><strong class="block text-xs">Expected salary</strong><span class="block text-sm">${safe(job.currency || '')} ${safe(job.minimumSalary ?? 0)} - ${safe(job.maximumSalary ?? 0)}</span><strong class="block mt-2 text-xs">Qualifications</strong><span class="block text-xs whitespace-pre-wrap">${safe(job.requiredSkills || 'Not specified')}</span></span>`);
    });
  }
  function recruiterJobs() {
    return `<section class="p-5"><div class="finance-heading"><h2 class="display text-lg font-bold">My job orders</h2><button class="btn btn-primary" data-open="new-job">Create job order</button></div><div class="mt-5 grid gap-4 sm:grid-cols-2">${store.data.jobs.map(job => `<article class="job-order-card p-4"><h3 class="display font-bold">${safe(job.title)}</h3><p class="mt-1 text-xs">${safe(job.reference || '')} · ${safe(job.country)} · ${safe(job.status.replaceAll('_', ' '))}</p><p class="mt-3 text-sm"><strong>Expected salary:</strong> ${safe(job.currency)} ${safe(job.minimumSalary)} - ${safe(job.maximumSalary)}</p><p class="mt-2 text-sm whitespace-pre-wrap"><strong>Qualifications:</strong> ${safe(job.requiredSkills || 'Not specified')}</p><p class="mt-3 text-xs">${store.data.applications.filter(application => application.jobId === job.id).length} applicants</p></article>`).join('') || '<p>No job orders yet.</p>'}</div></section>`;
  }
  function recruiterCandidates() {
    return `${metrics([['My job orders', store.data.jobs.length], ['Assigned candidates', store.data.candidates.length]])}<section class="p-5"><h2 class="display text-lg font-bold">My candidates</h2><div class="table-wrap mt-5"><table><thead><tr><th>Candidate</th><th>Job order</th><th>Application status</th><th>Recruitment stage</th><th>Documents</th></tr></thead><tbody>${store.data.applications.map(application => `<tr><td>${safe(application.candidate?.name || store.data.candidates.find(candidate => candidate.id === application.candidateId)?.name || '-')}</td><td>${safe(application.job?.title || store.data.jobs.find(job => job.id === application.jobId)?.title || '-')}</td><td>${safe(application.status)}</td><td>${safe(application.candidate?.status || store.data.candidates.find(candidate => candidate.id === application.candidateId)?.status || '-')}</td><td><button class="btn btn-ghost" data-recruiter-docs="${application.candidateId}">Documents</button></td></tr>`).join('') || '<tr><td colspan="5">No candidates assigned to your jobs yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function recruiterDocuments(id) {
    const candidate = store.data.candidates.find(item => item.id === id); if (!candidate) return;
    const element = modal(`${candidate.name} - Documents`, `<div class="space-y-3">${(candidate.documents || []).map(document => `<div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3"><div><strong>${safe(document.documentType)}</strong><p class="text-xs">${safe(document.fileName || document.name)}</p></div><div><button class="btn btn-ghost" data-doc-preview="${document.id}">Preview</button><button class="btn btn-ghost" data-doc-download="${document.id}">Download</button></div></div>`).join('') || '<p>No documents available.</p>'}</div>`);
    element.querySelectorAll('[data-doc-preview], [data-doc-download]').forEach(button => button.onclick = async () => {
      const id = button.dataset.docPreview || button.dataset.docDownload; const record = candidate.documents.find(document => document.id === id); button.disabled = true;
      try { const file = await store.fetchDocument(id, !button.dataset.docPreview); if (button.dataset.docPreview) previewCandidateDocument(file, record); else saveDocument(file, record.fileName || record.name); }
      catch (error) { showToast(error.message); } finally { button.disabled = false; }
    });
  }
  function summary() {
    const candidates = scopedCandidates();
    const agreed = candidates.reduce((sum, candidate) => sum + total(candidate), 0);
    const paid = candidates.reduce((sum, candidate) => sum + Number(candidate.paidAmount), 0);
    return metrics([
      ['Total agreements', candidates.filter(candidate => total(candidate) > 0).length],
      ['Commissions agreed', money(agreed)], ['Paid total', money(paid)], ['Balance', money(agreed - paid)],
      ['Office fees', money(candidates.reduce((sum, candidate) => sum + Number(candidate.officeFee), 0))],
      ['Expenses', 'Not configured']
    ]);
  }
  function financePage() {
    if (!financeAllowed()) return '<section class="p-5"><h2>Finance access is restricted</h2></section>';
    const candidates = scopedCandidates();
    const pending = store.data.transactions.filter(entry => !entry.voided && /pending/i.test(entry.status));
    const agreed = candidates.reduce((sum, candidate) => sum + total(candidate), 0);
    const paid = candidates.reduce((sum, candidate) => sum + Number(candidate.paidAmount), 0);
    return `${summary()}<section class="finance-surface"><div class="finance-heading"><div><h2 class="display text-lg font-bold">Candidate ledger</h2><p>Client accounts · ${safe(store.user.branchId ? branchName(store.user.branchId) : 'All branches')}</p></div><button class="btn btn-primary" data-open="new-transaction">Record payment</button></div><div class="finance-collection"><div><span>Commission collection</span><strong>${agreed ? (paid / agreed * 100).toFixed(1) : '0.0'}%</strong></div><progress max="100" value="${agreed ? Math.max(0, Math.min(100, paid / agreed * 100)) : 0}" aria-label="Commission collection percentage"></progress><span>${pending.length} awaiting approval · ${money(pending.reduce((sum, entry) => sum + Number(entry.amountKes), 0))}</span></div><div class="finance-filters"><input class="input" id="finance-search" placeholder="Search name, passport or tracking number" aria-label="Search ledger"><select class="select" id="finance-balance" aria-label="Balance filter"><option value="">All accounts</option><option value="outstanding">Outstanding balance</option><option value="settled">Settled accounts</option><option value="credit">Credit balance</option></select>${!store.user.branchId ? `<select class="select" id="finance-branch" aria-label="Ledger branch"><option value="">All branches</option>${store.data.branches.map(branch => `<option value="${branch.id}">${safe(branch.name)}</option>`).join('')}</select>` : ''}</div><div class="table-wrap mt-4"><table><thead><tr><th>Candidate / account</th><th>Branch</th><th>Total paid (KES)</th><th>Account status</th></tr></thead><tbody>${candidates.map(candidate => {
      const balance = total(candidate) - Number(candidate.paidAmount);
      const status = !total(candidate) && !candidate.paidAmount ? 'No agreement' : balance > 0 ? 'Outstanding' : balance < 0 ? 'Credit balance' : 'Settled';
      return `<tr data-ledger-id="${candidate.id}" data-ledger-branch="${candidate.branchId}" data-ledger-balance="${balance}" data-ledger-search="${safe([candidate.name, candidate.passport, candidate.trackingNumber].join(' ').toLowerCase())}"><td><button class="candidate-name-link" data-statement="${candidate.id}">${safe(candidate.name)}</button><span class="block text-xs text-slate-500">${safe(candidate.trackingNumber || candidate.passport)}</span></td><td>${safe(branchName(candidate.branchId))}</td><td class="finance-amount">${money(candidate.paidAmount)}</td><td><span class="account-status ${balance > 0 ? 'outstanding' : 'settled'}">${status}</span></td></tr>`;
    }).join('')}</tbody></table></div><p class="finance-empty" data-ledger-empty ${candidates.length ? 'hidden' : ''}>No accounts match these filters.</p><div class="finance-ledger-total" data-ledger-total></div></section><section class="finance-surface"><div class="finance-heading"><h2 class="display text-base font-bold">Payments awaiting approval</h2><span>${pending.length} entries</span></div><div class="table-wrap mt-3"><table><thead><tr><th>Candidate</th><th>Payment</th><th>Amount (KES)</th><th>Recorded</th><th></th></tr></thead><tbody>${pending.map(entry => `<tr><td>${safe(entry.candidate?.name || entry.party)}</td><td>${safe(entry.type)}<span class="block text-xs text-slate-500">${safe(entry.paymentReference || 'No reference')}</span></td><td class="finance-amount">${money(entry.amountKes)}</td><td>${date(entry.date)}</td><td><button class="btn btn-ghost" data-statement="${entry.candidateId}">Review</button></td></tr>`).join('') || '<tr><td colspan="5">No payments awaiting approval.</td></tr>'}</tbody></table></div></section>`;
  }
  async function pdfPreview(path, name) {
    const file = await store.downloadBusinessFile(path);
    previewCandidateDocument(file, { name, fileName: `${name}.pdf` });
    const overlay = document.querySelector('.document-preview-backdrop:last-child');
    if (!overlay) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = 'Print';
    button.onclick = () => {
      const frame = overlay.querySelector('iframe');
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { showToast('Use the PDF viewer print control.'); }
    };
    overlay.querySelector('.document-preview-toolbar > div')?.prepend(button);
  }
  function statement(id) {
    const candidate = store.data.candidates.find(item => item.id === id);
    if (!candidate || !financeAllowed()) return;
    const entries = store.data.transactions.filter(entry => entry.candidateId === id).sort((first, second) => new Date(first.date) - new Date(second.date));
    const recordedPaid = entries.filter(approved).reduce((sum, entry) => sum + effect(entry) * entry.amountKes, 0);
    const openingPaid = Number(candidate.paidAmount) - recordedPaid;
    const paid = openingPaid + recordedPaid;
    const canApprove = ['super_admin', 'super_finance', 'branch_finance'].includes(store.user.role);
    const canVoid = ['super_admin', 'super_finance'].includes(store.user.role);
    const element = modal('Client statement', `<div class="flex flex-wrap items-center justify-between gap-3"><div><strong>${safe(candidate.name)}</strong><p class="text-xs text-slate-500">${safe(candidate.trackingNumber || candidate.passport)}</p></div><button type="button" class="btn btn-ghost" data-statement-pdf>Print / Download PDF</button></div><p class="mt-4 font-bold">Agreed commission: ${money(total(candidate))}</p><div class="table-wrap mt-4"><table><thead><tr><th>Date</th><th>Entry</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${entries.map(entry => `<tr class="${entry.voided ? 'voided-entry' : ''}"><td>${date(entry.date)}</td><td>${safe(entry.type)}<span class="block text-xs">${safe(entry.paymentReference || '')}</span>${entry.otherDescription ? `<span class="block text-xs">${safe(entry.otherDescription)}</span>` : ''}</td><td>${money(entry.amountKes)}</td><td>${entry.voided ? 'Voided' : safe(entry.status)}</td><td>${approved(entry) ? `<button class="btn btn-ghost" data-payment-receipt="${entry.id}">Receipt</button>${canVoid ? `<button class="btn btn-ghost text-red-700" data-payment-void="${entry.id}">Void</button>` : ''}` : ''}${!entry.voided && /pending/i.test(entry.status) && canApprove ? `<button class="btn btn-primary" data-payment-approve="${entry.id}">Approve</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5">No payments recorded.</td></tr>'}</tbody></table></div><div class="statement-totals"><strong>Net approved payments: ${money(paid)}</strong><strong>Balance: ${money(total(candidate) - paid)}</strong></div>`);
    let runningBalance = total(candidate) - openingPaid;
    const paymentRows = entries.map(entry => {
      const amount = approved(entry) ? effect(entry) * Number(entry.amountKes) : 0;
      runningBalance -= amount;
      return `<tr class="${entry.voided ? 'voided-entry' : ''}"><td>${date(entry.date)}</td><td>${safe(entry.type)}<span class="block text-xs text-slate-500">${safe(entry.paymentReference || `RCT-${entry.id.toUpperCase()}`)}</span><span class="block text-xs">${safe(entry.paymentMethod || '')}</span></td><td>${amount < 0 ? money(-amount) : '-'}</td><td>${amount > 0 ? money(amount) : '-'}</td><td>${money(runningBalance)}</td><td>${entry.voided ? 'Voided' : safe(entry.status)}${!approved(entry) ? `<span class="block text-xs">${money(entry.amountKes)} excluded</span>` : ''}</td><td>${approved(entry) ? `<button class="btn btn-ghost" data-payment-receipt="${entry.id}">Receipt</button>${canVoid ? `<button class="btn btn-ghost text-red-700" data-payment-void="${entry.id}">Void</button>` : ''}` : ''}${!entry.voided && /pending/i.test(entry.status) && canApprove ? `<button class="btn btn-primary" data-payment-approve="${entry.id}">Approve</button>` : ''}</td></tr>`;
    }).join('');
    const table = element.querySelector('.table-wrap'); table.classList.add('statement-table-wrap');
    table.innerHTML = `<table><thead><tr><th>Date</th><th>Transaction / reference</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody><tr><td>${date(candidate.submitted)}</td><td>Agreed commission</td><td>${money(total(candidate))}</td><td>-</td><td>${money(total(candidate))}</td><td>Agreement</td><td></td></tr>${openingPaid ? `<tr><td>-</td><td>Opening paid balance (historical)</td><td>${openingPaid < 0 ? money(-openingPaid) : '-'}</td><td>${openingPaid > 0 ? money(openingPaid) : '-'}</td><td>${money(total(candidate) - openingPaid)}</td><td>Opening balance</td><td></td></tr>` : ''}${paymentRows}</tbody></table>`;
    const heading = element.querySelector('.modal-body > div'); heading.classList.add('statement-heading');
    heading.insertAdjacentHTML('afterbegin', `<div class="statement-brand">${store.data.company.logoData ? `<img src="${safe(store.data.company.logoData)}" alt="Company logo">` : ''}<strong>${safe(store.data.company.companyName)}</strong><span>${safe([store.data.company.email, store.data.company.phone].filter(Boolean).join(' · '))}</span></div>`);
    element.querySelector('[data-statement-pdf]').onclick = () => pdfPreview(`/candidates/${id}/statement.pdf`, `Statement-${candidate.trackingNumber || id}`).catch(error => showToast(error.message));
    element.querySelectorAll('[data-payment-receipt]').forEach(button => button.onclick = () => pdfPreview(`/transactions/${button.dataset.paymentReceipt}/receipt.pdf`, 'Receipt').catch(error => showToast(error.message)));
    element.querySelectorAll('[data-payment-void], [data-payment-approve]').forEach(button => button.onclick = async () => {
      const voiding = Boolean(button.dataset.paymentVoid);
      if (voiding && !window.confirm('Void this approved payment? It will remain in history but will no longer count toward the balance.')) return;
      button.disabled = true;
      try {
        if (voiding) await store.voidTransaction(button.dataset.paymentVoid);
        else await store.updateTransaction(button.dataset.paymentApprove, 'Paid');
        element.remove(); statement(id); showToast(voiding ? 'Payment voided.' : 'Payment approved.');
      } catch (error) { showToast(error.message); button.disabled = false; }
    });
  }
  const columnOptions = [
    ['name', 'Candidate'], ['trackingNumber', 'Tracking number'], ['passport', 'Passport'], ['email', 'Email'], ['phone', 'Phone'], ['branch', 'Branch'], ['status', 'Stage'], ['job', 'Job'], ['country', 'Country'], ['commission', 'Commission'], ['paid', 'Paid'], ['balance', 'Balance'], ['officeFee', 'Office fee'], ['submitted', 'Submitted'],
    ['firstName', 'First name'], ['middleName', 'Middle name'], ['lastName', 'Last name'], ['dateOfBirth', 'Date of birth'], ['gender', 'Gender'], ['maritalStatus', 'Marital status'], ['weightKg', 'Weight (kg)'], ['heightFt', 'Height (ft)'],
    ['passportExpiry', 'Passport expiry'], ['nationalId', 'National ID'], ['nationality', 'Nationality'], ['alternatePhone', 'Alternate phone'], ['address', 'Address'], ['registeredBy', 'Registered by'], ['subAgentName', 'Sub-agent name'],
    ['visaFee', 'Visa fee'], ['medicalFee', 'Medical fee'], ['foreignAffairsAttestationFee', 'Foreign affairs attestation'], ['kmpduMedicalFee', 'KMPDU medical fee'], ['embassyAttestationFee', 'Embassy attestation'], ['airTicketFee', 'Air ticket fee'], ['specialComments', 'Special comments'],
    ['physicalPassportReceived', 'Physical passport received'], ['documentsVerified', 'Documents verified'], ['interviewDate', 'Interview date'], ['interviewOutcome', 'Interview outcome'], ['offerIssued', 'Offer issued'], ['offerSigned', 'Offer signed'], ['docs', 'Document count']
  ];
  function exportCandidates() {
    const ids = [...app.querySelectorAll('[data-candidate-row]')].filter(row => !row.hidden).map(row => row.dataset.candidateRow);
    if (!ids.length) return showToast('No candidates match the current filters.');
    const columns = columnOptions.map(([key, label]) => ({ key, label, selected: true }));
    const element = modal(`Export ${ids.length} candidates`, '<div data-export-columns></div><button type="button" class="btn btn-primary mt-5 w-full" data-export-save>Export Excel</button>');
    const draw = () => {
      element.querySelector('[data-export-columns]').innerHTML = columns.map((column, index) => `<div class="export-column"><label><input type="checkbox" data-column="${index}" ${column.selected ? 'checked' : ''}> ${column.label}</label><div><button type="button" class="btn btn-ghost" data-move="${index}" data-offset="-1" title="Move up" aria-label="Move ${column.label} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn btn-ghost" data-move="${index}" data-offset="1" title="Move down" aria-label="Move ${column.label} down" ${index === columns.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join('');
      element.querySelectorAll('[data-column]').forEach(input => input.onchange = () => { columns[Number(input.dataset.column)].selected = input.checked; });
      element.querySelectorAll('[data-move]').forEach(button => button.onclick = () => {
        const index = Number(button.dataset.move); const target = index + Number(button.dataset.offset);
        [columns[index], columns[target]] = [columns[target], columns[index]]; draw();
      });
    };
    draw();
    element.querySelector('[data-export-save]').onclick = async event => {
      const selected = columns.filter(column => column.selected).map(column => column.key);
      if (!selected.length) return showToast('Select at least one column.');
      event.currentTarget.disabled = true;
      try { saveDocument(await store.exportCandidates(ids, selected), 'candidates.xlsx'); element.remove(); }
      catch (error) { showToast(error.message); element.querySelector('[data-export-save]').disabled = false; }
    };
  }
  function branchEdit(id) {
    const branch = store.data.branches.find(item => item.id === id);
    const element = modal('Edit branch', `<form class="space-y-4" data-branch-form><label class="block">Name<input class="input mt-2 w-full" name="name" value="${safe(branch.name)}" required></label><label class="block">Code<input class="input mt-2 w-full" name="code" value="${safe(branch.code)}" required></label><button class="btn btn-primary" type="submit">Save branch</button></form>`);
    element.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      try { await store.updateBranch(id, Object.fromEntries(new FormData(event.currentTarget))); element.remove(); showToast('Branch updated.'); }
      catch (error) { showToast(error.message); }
    };
  }
  const friendly = value => String(value || '').replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase());
  function recordName(entity, id) {
    const collections = { candidate: store.data.candidates, job: store.data.jobs, branch: store.data.branches, user: store.data.users, session: store.data.users, transaction: store.data.transactions, passport_inventory: store.data.passports };
    const record = collections[entity]?.find(item => item.id === id);
    return record?.name || record?.reference || record?.title || record?.party || record?.candidate?.name || 'Historical record';
  }
  function auditPage() {
    const labels = { passport_inventory: 'Passport custody', transaction: 'Payment', company_settings: 'Company settings', job: 'Job order', user: 'User account', candidate: 'Candidate', branch: 'Branch office', document: 'Candidate document', application: 'Job application' };
    const actions = { create: 'Created', update: 'Updated', delete: 'Deleted', void: 'Payment voided', submit_for_approval: 'Submitted for approval', passport_received: 'Passport received', passport_custody_update: 'Custody updated', export: 'Exported to Excel', scan_upload: 'Camera scan uploaded' };
    const details = log => Object.entries(log.metadata || {}).filter(([key]) => !/password|token|logoData/i.test(key)).map(([key, value]) => {
      const entity = { candidateId: 'candidate', branchId: 'branch', jobId: 'job', userId: 'user' }[key];
      const text = entity ? recordName(entity, value) : /Id$/.test(key) ? 'Internal reference' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : Array.isArray(value) ? value.map(friendly).join(', ') : typeof value === 'object' ? 'Details updated' : friendly(value);
      return `${safe(friendly(key).replace(/ Id$/, ''))}: ${safe(text)}`;
    }).join('<br>') || 'No additional details';
    return `<section class="p-5"><h2 class="display text-lg font-bold">Activity history</h2><div class="table-wrap mt-4"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>${store.data.auditLogs.map(log => `<tr><td>${new Date(log.createdAt).toLocaleString()}</td><td>${safe(log.actor?.name || log.actorName || 'System')}</td><td>${safe(actions[log.action] || friendly(log.action))}</td><td>${safe(labels[log.entity] || friendly(log.entity))}<span class="block text-xs text-slate-500">${safe(recordName(log.entity, log.entityId))}</span></td><td>${details(log)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function userReport() {
    const users = store.data.userReport || [];
    const top = group => group.filter(user => user.activity > 0).sort((first, second) => second.activity - first.activity || first.name.localeCompare(second.name))[0];
    const overall = top(users);
    return `${metrics([['Total users', users.length], ['Active users', users.filter(user => user.active).length], ['Top user overall', overall ? `${overall.name} (${overall.activity} actions)` : 'No activity']])}<section class="p-5"><h2 class="display text-base font-bold">User activity by branch</h2><div class="table-wrap mt-3"><table><thead><tr><th>Branch</th><th>Users</th><th>Top user (all-time activity)</th></tr></thead><tbody>${[...store.data.branches, { id: null, name: 'Global accounts' }].map(branch => {
      const group = users.filter(user => user.branchId === branch.id); const leader = top(group);
      return `<tr><td>${safe(branch.name)}</td><td>${group.length}</td><td>${leader ? `${safe(leader.name)} (${leader.activity} actions)` : 'No activity'}</td></tr>`;
    }).join('')}</tbody></table></div></section>`;
  }
  function companyForm() {
    const settings = store.data.company;
    const fields = [['email', 'Email', 'email'], ['phone', 'Primary contact', 'tel'], ['alternatePhone', 'Alternate contact', 'tel'], ['website', 'Website (https://)', 'url'], ['registrationNumber', 'Registration number', 'text'], ['taxNumber', 'Tax PIN / number', 'text']];
    return `<section class="p-5 border-b border-stone-200"><h2 class="display text-lg font-bold">Client company</h2><form data-company-form class="mt-4 space-y-4"><label class="block">Company name<input class="input mt-2 w-full" name="companyName" maxlength="100" value="${safe(settings.companyName)}" required></label><div class="grid gap-4 sm:grid-cols-2">${fields.map(([name, label, type]) => `<label class="block">${label}<input class="input mt-2 w-full" name="${name}" type="${type}" maxlength="100" value="${safe(settings[name] || '')}"></label>`).join('')}</div><label class="block">Office / postal address<textarea class="input mt-2 w-full" name="address" maxlength="240">${safe(settings.address || '')}</textarea></label>${settings.logoData ? `<img src="${safe(settings.logoData)}" class="company-logo" alt="Company logo">` : ''}<label class="block">Logo<input type="file" name="logo" class="input mt-2 w-full" accept="image/png,image/jpeg"></label><label><input name="removeLogo" type="checkbox"> Remove logo</label><button class="btn btn-primary" type="submit">Save company details</button></form></section>`;
  }
  function notifications() {
    const tasks = [];
    const user = store.user;
    if (['super_admin', 'branch_admin'].includes(user.role)) store.data.jobs.filter(job => job.status === 'Pending_approval').forEach(job => tasks.push({ label: `Approve job: ${job.title}`, route: 'jobs' }));
    if (['super_admin', 'super_finance', 'branch_finance'].includes(user.role)) store.data.transactions.filter(entry => !entry.voided && /pending/i.test(entry.status)).forEach(entry => tasks.push({ label: `Approve payment: ${entry.candidate?.name || entry.party}`, route: 'finance', candidateId: entry.candidateId }));
    if (['super_admin', 'branch_admin', 'branch_staff', 'recruiter'].includes(user.role)) scopedCandidates().filter(candidate => /application|registered/i.test(candidate.status)).forEach(candidate => tasks.push({ label: `Review application: ${candidate.name}`, route: 'candidates', candidateId: candidate.id }));
    return tasks;
  }
  function enhance(active) {
    const tasks = notifications();
    const notificationButton = document.createElement('button');
    notificationButton.type = 'button'; notificationButton.className = 'btn btn-ghost notification-button';
    notificationButton.title = 'Tasks needing attention'; notificationButton.setAttribute('aria-label', `${tasks.length} tasks needing attention`);
    notificationButton.append(createElement(Bell, { width: 18, height: 18, 'aria-hidden': 'true' }));
    notificationButton.insertAdjacentHTML('beforeend', `<span class="notification-count">${tasks.length}</span>`);
    app.querySelector('.topbar > div:last-child')?.prepend(notificationButton);
    notificationButton.onclick = () => {
      const element = modal('Tasks needing attention', `<div class="space-y-2">${tasks.map((task, index) => `<button class="notification-task" type="button" data-task="${index}">${safe(task.label)}</button>`).join('') || '<p>No tasks need attention.</p>'}</div>`);
      element.querySelectorAll('[data-task]').forEach(button => button.onclick = () => {
        const task = tasks[Number(button.dataset.task)]; element.remove(); window.location.hash = task.route;
        if (task.candidateId && task.route === 'finance') statement(task.candidateId);
      });
    };
    if (active === 'candidates' && store.user.role !== 'recruiter') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = 'Export Excel'; button.onclick = exportCandidates;
      button.prepend(createElement(Download, { width: 16, height: 16, 'aria-hidden': 'true' }));
      app.querySelector('#candidate-search')?.parentElement.append(button);
    }
    if (active === 'overview' && financeAllowed()) app.querySelector('.main > section')?.insertAdjacentHTML('afterend', summary());
    if (active === 'passports') {
      const section = app.querySelector('.main > div');
      const records = store.data.passports;
      section?.querySelector('h2')?.insertAdjacentHTML('afterend', `<p class="mt-2 text-sm" data-passport-total>Total passports: <strong>${records.length}</strong></p>`);
      section?.insertAdjacentHTML('beforebegin', metrics([['Total passports received', records.length], ['Currently in office', records.filter(record => ['In_Storage', 'Returned_To_Office'].includes(record.status)).length], ['Released to candidate', records.filter(record => record.status === 'Released_To_Candidate').length], ['Released to embassy', records.filter(record => record.status === 'Released_To_Embassy').length]]));
      const search = document.createElement('input'); search.className = 'input mt-4 w-full'; search.placeholder = 'Search passports'; search.setAttribute('aria-label', 'Search passports');
      section?.querySelector('.table-wrap')?.before(search);
      const rows = [...section.querySelectorAll('tbody tr')];
      rows.forEach((row, index) => {
        const record = store.data.passports[index];
        if (!record || !['super_admin', 'branch_admin'].includes(store.user.role)) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost text-red-700'; button.textContent = 'Delete';
        button.onclick = async () => { if (!window.confirm(`Delete the custody record for ${record.candidate.name}? This does not delete the candidate.`)) return; try { await store.deletePassport(record.id); showToast('Passport record deleted.'); } catch (error) { showToast(error.message); } };
        row.lastElementChild.append(button);
      });
      search.oninput = () => rows.forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(search.value.trim().toLowerCase()); });
    }
    if (active === 'branches' && store.user.role === 'super_admin') {
      app.querySelectorAll('.main article').forEach((article, index) => {
        const branch = store.data.branches[index];
        if (branch) article.insertAdjacentHTML('beforeend', `<div class="flex gap-2 mt-3"><button type="button" class="btn btn-ghost" data-edit-branch="${branch.id}">Edit</button><button type="button" class="btn btn-ghost text-red-700" data-delete-branch="${branch.id}">Delete</button></div>`);
      });
      app.querySelectorAll('[data-edit-branch]').forEach(button => button.onclick = () => branchEdit(button.dataset.editBranch));
      app.querySelectorAll('[data-delete-branch]').forEach(button => button.onclick = async () => {
        if (!window.confirm('Delete this branch? Branches with linked records cannot be deleted.')) return;
        try { await store.deleteBranch(button.dataset.deleteBranch); showToast('Branch deleted.'); } catch (error) { showToast(error.message); }
      });
    }
    if (active === 'users') {
      app.querySelector('.topbar')?.insertAdjacentHTML('afterend', userReport());
      app.querySelectorAll('[data-delete-recruiter]').forEach(button => button.remove());
      if (store.user.role === 'super_admin') app.querySelectorAll('[data-edit-user]').forEach(edit => {
        if (edit.dataset.editUser === store.user.id) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost text-red-700'; button.textContent = 'Delete';
        button.onclick = async () => { if (!window.confirm('Delete this user account? Activity history will be retained.')) return; try { await store.deleteUser(edit.dataset.editUser); showToast('User deleted.'); } catch (error) { showToast(error.message); } };
        edit.parentElement.append(button);
      });
    }
    if (active === 'settings' && store.user.role === 'super_admin') {
      app.querySelector('.topbar')?.insertAdjacentHTML('afterend', companyForm());
      app.querySelector('[data-company-form]').onsubmit = async event => {
        event.preventDefault(); const form = event.currentTarget; const file = form.elements.logo.files[0]; const button = form.querySelector('button'); button.disabled = true;
        try {
          let logoData = form.elements.removeLogo.checked ? null : store.data.company.logoData;
          if (file && !form.elements.removeLogo.checked) {
            if (file.size > 500 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Use a PNG or JPEG under 500KB.');
            logoData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
          }
          const contacts = Object.fromEntries(['email', 'phone', 'alternatePhone', 'address', 'website', 'registrationNumber', 'taxNumber'].map(field => [field, form.elements[field].value.trim()]));
          await store.saveCompany({ companyName: form.elements.companyName.value.trim(), logoData, ...contacts }); showToast('Company details saved.');
        } catch (error) { showToast(error.message); } finally { button.disabled = false; }
      };
    }
    if (active === 'finance') {
      const filterLedger = () => {
        const search = app.querySelector('#finance-search').value.trim().toLowerCase();
        const status = app.querySelector('#finance-balance').value;
        const branch = app.querySelector('#finance-branch')?.value || '';
        const visible = [];
        app.querySelectorAll('[data-ledger-id]').forEach(row => {
          const balance = Number(row.dataset.ledgerBalance);
          row.hidden = Boolean((search && !row.dataset.ledgerSearch.includes(search)) || (branch && row.dataset.ledgerBranch !== branch) || (status === 'outstanding' && balance <= 0) || (status === 'settled' && balance !== 0) || (status === 'credit' && balance >= 0));
          if (!row.hidden) visible.push(store.data.candidates.find(candidate => candidate.id === row.dataset.ledgerId));
        });
        app.querySelector('[data-ledger-empty]').hidden = visible.length > 0;
        app.querySelector('[data-ledger-total]').textContent = `${visible.length} accounts · Filtered paid total ${money(visible.reduce((sum, candidate) => sum + Number(candidate.paidAmount), 0))} · Filtered outstanding ${money(visible.reduce((sum, candidate) => sum + Math.max(0, total(candidate) - Number(candidate.paidAmount)), 0))}`;
      };
      for (const id of ['finance-search', 'finance-balance', 'finance-branch']) app.querySelector(`#${id}`)?.addEventListener(id === 'finance-search' ? 'input' : 'change', filterLedger);
      filterLedger();
    }
    app.querySelectorAll('[data-statement]').forEach(button => button.onclick = () => statement(button.dataset.statement));
    app.querySelector('[data-new-recruiter]')?.addEventListener('click', addRecruiter);
    app.querySelectorAll('[data-recruiter-docs]').forEach(button => button.onclick = () => recruiterDocuments(button.dataset.recruiterDocs));
    jobDetails();
  }
  return { financePage, auditPage, enhance, summary, statement, recruiterPage, recruiterJobs, recruiterCandidates, employerSelector, jobDetails };
}