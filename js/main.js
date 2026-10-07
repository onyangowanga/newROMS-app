function openCandidateProfileTabbed(id, activeTab = 'summary') {
  const candidate = store.data.candidates.find(item => item.id === id);
  if (!candidate) return;
  const types = ['Passport', 'Good Conduct', 'Fit Medical', 'Academic Documents', 'CV', 'Drivers Licence', 'Employment Contract', 'Visa', 'Other'];
  const element = modal('Candidate profile', `<div class="space-y-5"><div class="flex items-center justify-between rounded-lg bg-stone-50 p-4"><div><strong class="display text-lg">${candidate.name}</strong><p class="text-xs text-slate-500">${candidate.email} · ${candidate.phone}</p></div><button type="button" class="btn btn-ghost" id="profile-edit" aria-label="Edit candidate">✎</button></div><div class="profile-tabs"><button type="button" class="active" data-profile-tab="summary">Profile</button><button type="button" data-profile-tab="documents">Documents (${(candidate.documents || []).length})</button></div><section data-profile-panel="summary"><div class="grid gap-3 sm:grid-cols-2 text-sm"><div><span class="text-xs text-slate-500">Workflow stage</span><strong class="block">${badge(candidate.status)}</strong></div><div><span class="text-xs text-slate-500">Passport</span><strong class="block">${candidate.passport}</strong></div><div><span class="text-xs text-slate-500">Job</span><strong class="block">${candidateJobs(candidate)}</strong></div><div><span class="text-xs text-slate-500">Commission Total</span><strong class="block">${money(candidate.commissionTotal || candidate.agreedFee)}</strong></div></div></section><section data-profile-panel="documents" hidden><label class="block text-xs font-bold text-slate-500">Filter document type<select id="profile-doc-filter" class="select mt-2 w-full"><option value="">All types</option>${types.map(type => `<option>${type}</option>`).join('')}</select></label><div class="mt-4 rounded-lg border border-stone-200 p-4"><p class="text-sm font-bold">Upload a document</p><div class="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select id="profile-doc-type" class="select">${types.map(type => `<option>${type}</option>`).join('')}</select><input id="profile-doc-file" class="input min-w-0" type="file" accept="application/pdf,image/*" /><button id="profile-doc-upload" type="button" class="btn btn-primary">Upload</button></div></div><div class="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4"><p class="text-sm font-bold">Scan with phone camera</p><p class="mt-1 text-xs text-slate-600">Capture one or more pages; ROMS combines them into a PDF.</p><div class="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select id="scan-doc-type" class="select">${types.map(type => `<option>${type}</option>`).join('')}</select><input id="scan-doc-files" class="input min-w-0" type="file" accept="image/jpeg,image/png" capture="environment" multiple /><button id="scan-doc-upload" type="button" class="btn btn-primary">Scan to PDF</button></div></div><div class="mt-4 space-y-2">${(candidate.documents || []).map(doc => `<a class="profile-document flex justify-between rounded-lg border border-stone-200 p-3 text-sm" data-type="${doc.documentType}" href="/uploads/${encodeURIComponent(String(doc.filePath).split('/').pop())}" target="_blank" rel="noopener"><span><strong>${doc.documentType}</strong> · ${doc.name}</span><span>↗</span></a>`).join('') || '<p class="text-sm text-slate-500">No documents uploaded.</p>'}</div></section></div>`);
  const displayValue = value => value === null || value === undefined || value === '' ? '—' : escapeHtml(value);
  const displayDate = value => value ? new Date(value).toLocaleDateString('en-GB') : '—';
  const profileField = (label, value) => `<div class="min-w-0"><dt class="text-xs text-slate-500">${label}</dt><dd class="mt-1 break-words text-sm font-semibold text-slate-800">${value}</dd></div>`;
  const profileSection = (title, fields) => `<section class="border-t border-stone-200 pt-4"><h3 class="display mb-3 text-sm font-bold">${title}</h3><dl class="grid gap-x-5 gap-y-4 sm:grid-cols-2">${fields.join('')}</dl></section>`;
  const summary = element.querySelector('[data-profile-panel="summary"]');
  summary.innerHTML = `<div class="space-y-5">
    ${profileSection('Personal information', [
      profileField('First name', displayValue(candidate.firstName)), profileField('Middle name', displayValue(candidate.middleName)),
      profileField('Last name', displayValue(candidate.lastName)), profileField('Date of birth', displayDate(candidate.dateOfBirth)),
      profileField('Gender', displayValue(candidate.gender)), profileField('Marital status', displayValue(candidate.maritalStatus)),
      profileField('Weight', candidate.weightKg ? `${displayValue(candidate.weightKg)} kg` : '—'),
      profileField('Height', candidate.heightFt ? `${displayValue(candidate.heightFt)} ft` : '—')
    ])}
    ${profileSection('Identification and contact', [
      profileField('Passport number', displayValue(candidate.passport)), profileField('Passport expiry', displayDate(candidate.passportExpiry)),
      profileField('National ID', displayValue(candidate.nationalId)), profileField('Nationality', displayValue(candidate.nationality)),
      profileField('Email', displayValue(candidate.email)), profileField('Primary phone', displayValue(candidate.phone)),
      profileField('Alternate phone', displayValue(candidate.alternatePhone)), profileField('Address', displayValue(candidate.address))
    ])}
    ${profileSection('Registration and recruitment', [
      profileField('Tracking number', displayValue(candidate.trackingNumber)),
      profileField('Branch', displayValue(candidate.branch?.name || branchName(candidate.branchId))),
      profileField('Registered by', displayValue(candidate.registeredBy)), profileField('Sub-agent', displayValue(candidate.subAgentName)),
      profileField('Job order', displayValue(candidateJobs(candidate))), profileField('Submitted', displayDate(candidate.submitted || candidate.createdAt))
    ])}
    ${profileSection('Workflow', [
      profileField('Current stage', badge(escapeHtml(candidate.status))),
      profileField('Physical passport', candidate.physicalPassportReceived ? 'Received' : 'Not received'),
      profileField('Documents verified', candidate.documentsVerified ? 'Yes' : 'No'),
      profileField('Interview date', displayDate(candidate.interviewDate)), profileField('Interview outcome', displayValue(candidate.interviewOutcome)),
      profileField('Offer issued', candidate.offerIssued ? 'Yes' : 'No'), profileField('Offer signed', candidate.offerSigned ? 'Yes' : 'No')
    ])}
  </div>`;
  const profileEdit = element.querySelector('#profile-edit');
  const profileActions = document.createElement('div');
  profileActions.className = 'flex justify-end';
  profileEdit.title = 'Edit candidate profile';
  profileEdit.setAttribute('aria-label', 'Edit candidate profile');
  profileActions.append(profileEdit);
  summary.prepend(profileActions);
  const documentsTab = element.querySelector('[data-profile-tab="documents"]');
  const commissionTab = document.createElement('button');
  commissionTab.type = 'button'; commissionTab.dataset.profileTab = 'commission'; commissionTab.textContent = 'Commission';
  documentsTab.after(commissionTab);
  const commissionPanel = document.createElement('section');
  commissionPanel.dataset.profilePanel = 'commission'; commissionPanel.hidden = true;
  element.querySelector('[data-profile-panel="documents"]').after(commissionPanel);
  const paymentTransactions = store.data.transactions.filter(transaction => transaction.candidateId === candidate.id);
  const paymentHistory = ['super_admin', 'super_finance', 'branch_finance'].includes(store.user?.role)
    ? `<section class="border-t border-stone-200 pt-4"><h3 class="display mb-3 text-sm font-bold">Payment history</h3>${paymentTransactions.length ? `<div class="space-y-2">${paymentTransactions.map(transaction => `<div class="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-[1fr_auto]"><div><strong class="text-sm">${escapeHtml(transaction.type || 'Payment')}</strong>${transaction.otherDescription ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(transaction.otherDescription)}</p>` : ''}<p class="mt-1 text-xs text-slate-500">${displayDate(transaction.date || transaction.createdAt)} · ${escapeHtml(transaction.paymentMethod || '—')} · ${escapeHtml(transaction.status)}</p></div><strong class="text-sm">${money(transaction.amountKes ?? transaction.amount ?? 0)}</strong></div>`).join('')}</div>` : '<p class="text-sm text-slate-500">No payments recorded.</p>'}</section>`
    : '';
  commissionPanel.innerHTML = `<div class="space-y-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="display text-base font-bold">Commission breakdown</h3><p class="mt-1 text-xs text-slate-500">Client payable and payment balance</p></div><button type="button" class="btn btn-ghost" id="profile-commission-edit">Edit commission</button></div>${profileSection('Fees and balance', [
    profileField('Agreed fee', money(candidate.agreedFee || 0)), profileField('Commission Total', money(candidate.commissionTotal || candidate.agreedFee || 0)),
    profileField('Visa fee', money(candidate.visaFee || 0)), profileField('Medical fee', money(candidate.medicalFee || 0)),
    profileField('Foreign affairs attestation', money(candidate.foreignAffairsAttestationFee || 0)),
    profileField('KMPDU medical fee', money(candidate.kmpduMedicalFee || 0)),
    profileField('Embassy attestation', money(candidate.embassyAttestationFee || 0)), profileField('Air ticket', money(candidate.airTicketFee || 0)),
    profileField('Office fee', money(candidate.officeFee || 0)), profileField('Paid', money(candidate.paidAmount || 0)),
    profileField('Balance due', money(candidate.dueAmount ?? ((candidate.commissionTotal || candidate.agreedFee || 0) - (candidate.paidAmount || 0))))
  ])}${paymentHistory}</div>`;
  const commissionEdit = commissionPanel.querySelector('#profile-commission-edit');
  commissionEdit.textContent = '✎';
  commissionEdit.title = 'Edit commission';
  commissionEdit.setAttribute('aria-label', 'Edit commission');
  commissionEdit.onclick = () => { element.remove(); openCommissionEditor(id); };
  element.querySelector('#profile-edit').onclick = () => { element.remove(); openCandidateEditorWithWorkflow(id); };
  element.querySelectorAll('[data-profile-tab]').forEach(tab => tab.onclick = () => { element.querySelectorAll('[data-profile-tab]').forEach(button => button.classList.toggle('active', button === tab)); element.querySelectorAll('[data-profile-panel]').forEach(panel => { panel.hidden = panel.dataset.profilePanel !== tab.dataset.profileTab; }); });
  (element.querySelector(`[data-profile-tab="${activeTab}"]`) || element.querySelector('[data-profile-tab="summary"]')).click();
  element.querySelector('#profile-doc-filter').onchange = event => element.querySelectorAll('.profile-document').forEach(row => { row.hidden = Boolean(event.target.value && row.dataset.type !== event.target.value); });
  const uploadedTypes = new Set((candidate.documents || []).map(item => item.documentType));
  element.querySelector('#profile-doc-file').accept = 'application/pdf,image/jpeg,image/png';
  for (const select of [element.querySelector('#profile-doc-type'), element.querySelector('#scan-doc-type')]) {
    [...select.options].forEach(option => { option.disabled = uploadedTypes.has(option.value); });
    select.selectedIndex = [...select.options].findIndex(option => !option.disabled);
  }
  const selection = document.createElement('div');
  selection.className = 'mt-4 space-y-3';
  selection.innerHTML = '<div class="flex flex-wrap gap-2"><button type="button" class="btn btn-ghost" data-download-selected disabled>Download selected separately</button><button type="button" class="btn btn-primary" data-combine-selected disabled>Combine as PDF</button></div><div data-document-order class="space-y-2"></div>';
  element.querySelector('[data-profile-panel="documents"]').append(selection);
  const selected = [];
  const updateSelection = () => {
    selection.querySelector('[data-download-selected]').disabled = !selected.length;
    selection.querySelector('[data-combine-selected]').disabled = selected.length < 2;
    selection.querySelector('[data-document-order]').replaceChildren(...selected.map((record, index) => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between gap-2 text-sm';
      const name = document.createElement('span'); name.textContent = `${index + 1}. ${record.fileName || record.name}`;
      const controls = document.createElement('span'); controls.className = 'flex gap-1';
      for (const [label, offset] of [['Move up', -1], ['Move down', 1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost'; button.title = label;
        button.setAttribute('aria-label', `${label} ${record.name}`); button.textContent = offset < 0 ? '↑' : '↓';
        button.disabled = index + offset < 0 || index + offset >= selected.length;
        button.onclick = () => { [selected[index], selected[index + offset]] = [selected[index + offset], selected[index]]; updateSelection(); };
        controls.append(button);
      }
      item.append(name, controls); return item;
    }));
  };
  element.querySelectorAll('.profile-document').forEach((link, index) => {
    const documentRecord = candidate.documents[index];
    const row = document.createElement('div');
    row.className = link.className;
    row.dataset.type = link.dataset.type;
    const label = document.createElement('span');
    const type = document.createElement('strong');
    type.textContent = documentRecord.documentType;
    label.append(type, ` · ${documentRecord.name}`);
    const actions = document.createElement('span');
    actions.className = 'flex items-center gap-2';
    const check = document.createElement('input'); check.type = 'checkbox'; check.setAttribute('aria-label', `Select ${documentRecord.name}`);
    check.onchange = () => { if (check.checked) selected.push(documentRecord); else selected.splice(selected.indexOf(documentRecord), 1); updateSelection(); };
    for (const action of ['Preview', 'Download', 'Delete']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn ${action === 'Delete' ? 'btn-coral' : 'btn-ghost'}`;
      button.textContent = action;
      button.onclick = async () => {
        const preview = action === 'Preview';
        button.disabled = true;
        try {
          if (action === 'Delete') {
            if (!window.confirm(`Delete ${documentRecord.name}?`)) return;
            await store.deleteDocument(documentRecord.id);
            element.remove();
            openCandidateProfileTabbed(id, 'documents');
            showToast('Document deleted.');
            return;
          }
          const file = await store.fetchDocument(documentRecord.id, !preview);
          if (preview) previewCandidateDocument(file, documentRecord);
          else saveDocument(file, documentRecord.fileName || documentRecord.name || 'document');
        } catch (error) { showToast(error.message); }
        finally { button.disabled = false; }
      };
      actions.append(button);
    }
    actions.prepend(check);
    row.replaceChildren(label, actions);
    link.replaceWith(row);
  });
  selection.querySelector('[data-download-selected]').onclick = async event => {
    event.currentTarget.disabled = true;
    try { for (const record of selected) saveDocument(await store.fetchDocument(record.id, true), record.fileName || record.name); }
    catch (error) { showToast(error.message); }
    finally { updateSelection(); }
  };
  selection.querySelector('[data-combine-selected]').onclick = async event => {
    event.currentTarget.disabled = true;
    try { saveDocument(await store.combineDocuments(id, selected.map(item => item.id)), `${candidate.name}_combined_documents.pdf`); }
    catch (error) { showToast(error.message); }
    finally { updateSelection(); }
  };
  element.querySelector('#profile-doc-upload').onclick = async () => { const file = element.querySelector('#profile-doc-file').files[0]; if (!file) return showToast('Choose a document file.'); try { await store.uploadDocument(id, file.name, file, element.querySelector('#profile-doc-type').value); element.remove(); openCandidateProfileTabbed(id, 'documents'); showToast('Document uploaded.'); } catch (error) { showToast(error.message); } };
  element.querySelector('#scan-doc-upload').onclick = async () => { const files = element.querySelector('#scan-doc-files').files; if (!files.length) return showToast('Capture at least one page.'); try { await store.uploadScannedPdf(id, element.querySelector('#scan-doc-type').value, files); element.remove(); openCandidateProfileTabbed(id, 'documents'); showToast('Camera scan saved as PDF.'); } catch (error) { showToast(error.message || 'Could not create PDF.'); } };
}

import { createStore } from './state.js';
import { createBusinessUI } from './business-ui.js';
import { createElement, RefreshCw } from './ui-icons.js';

const store = createStore();
const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const businessUI = createBusinessUI({ store, app, modal, money, escapeHtml, showToast, saveDocument, previewCandidateDocument, branchName, showTemporaryCredential });
const roleLabels = { super_admin: 'Super Admin', super_finance: 'Finance Global', branch_admin: 'Branch Admin', branch_staff: 'Branch Staff', branch_finance: 'Branch Finance', recruiter: 'Recruiter', candidate: 'Candidate (legacy)' };
const candidateWorkflowStages = [['Application', 'Application'], ['Document_Verification', 'Document verification'], ['Interview', 'Interview'], ['Offer_Contract', 'Offer and contract'], ['Commission_Processing', 'Commission processing'], ['Visa_Processing', 'Visa processing'], ['Visa_Approved', 'Visa approval'], ['Balance_Payment', 'Balance payment'], ['Ticketing', 'Ticketing'], ['Deployed', 'Deployment']];
const workflowStageByLabel = Object.fromEntries(candidateWorkflowStages.map(([value, label]) => [label.toLowerCase(), value]));
const icon = name => ({ grid: '▦', users: '♙', briefcase: '▣', wallet: '◈', office: '⌂', settings: '⚙', backup: '↥' }[name] || '•');
let publicSelectedCountry = '';
let publicTrackingResult = null;

function branchName(id) { return store.data.branches.find(branch => branch.id === id)?.name || 'All branches'; }
function visibleCandidates(user) { return store.data.candidates; }
function visibleTransactions(user) { return store.data.transactions; }
function money(value) { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value); }
function badge(status) { const tone = /paid|selected|cleared|open/i.test(status) ? 'green' : /pending|awaiting|review|scheduled/i.test(status) ? 'amber' : /filled/i.test(status) ? 'blue' : 'red'; return `<span class="badge badge-${tone}">${status}</span>`; }
function statusText(status) { return String(status || '').replaceAll('_', ' '); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function saveDocument(file, fileName) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function previewCandidateDocument(file, record) {
  const url = URL.createObjectURL(file);
  const overlay = document.createElement('div');
  overlay.className = 'document-preview-backdrop';
  overlay.innerHTML = `<div class="document-preview-dialog" role="dialog" aria-modal="true" aria-label="Document preview"><div class="document-preview-toolbar"><strong class="truncate"></strong><div class="flex items-center gap-2"><button class="btn btn-ghost" type="button" data-zoom-out title="Zoom out" aria-label="Zoom out">−</button><span data-zoom-value>100%</span><button class="btn btn-ghost" type="button" data-zoom-in title="Zoom in" aria-label="Zoom in">+</button><button class="btn btn-ghost" type="button" data-download title="Download" aria-label="Download">↓</button><button class="btn btn-ghost" type="button" data-close title="Close" aria-label="Close">×</button></div></div><div class="document-preview-viewport"></div></div>`;
  overlay.querySelector('strong').textContent = record.fileName || record.name;
  const viewport = overlay.querySelector('.document-preview-viewport');
  const content = document.createElement(file.type === 'application/pdf' ? 'iframe' : 'img');
  content.src = url; content.title = record.name; content.className = 'document-preview-content';
  viewport.append(content);
  let zoom = 100;
  const setZoom = next => { zoom = Math.max(50, Math.min(200, next)); content.style.width = `${zoom}%`; overlay.querySelector('[data-zoom-value]').textContent = `${zoom}%`; };
  const close = () => { overlay.remove(); URL.revokeObjectURL(url); document.removeEventListener('keydown', onKey); };
  const onKey = event => { if (event.key === 'Escape') close(); };
  overlay.querySelector('[data-zoom-out]').onclick = () => setZoom(zoom - 25);
  overlay.querySelector('[data-zoom-in]').onclick = () => setZoom(zoom + 25);
  overlay.querySelector('[data-download]').onclick = () => saveDocument(file, record.fileName || record.name || 'document');
  overlay.querySelector('[data-close]').onclick = close;
  overlay.onclick = event => { if (event.target === overlay) close(); };
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  overlay.querySelector('[data-close]').focus();
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function labelTableCells() {
  app.querySelectorAll('.table-wrap table').forEach(table => {
    const labels = [...table.querySelectorAll('thead th')].map((header, index) => header.textContent.trim() || (index === table.rows[0]?.cells.length - 1 ? 'Actions' : 'Details'));
    table.querySelectorAll('tbody tr').forEach(row => [...row.cells].forEach((cell, index) => { cell.dataset.label = labels[index] || 'Details'; }));
  });
}
function normalizedCandidateStage(status) {
  const normalized = String(status || '').replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return candidateWorkflowStages.find(([value, label]) => value.replaceAll('_', ' ').toLowerCase() === normalized || label.toLowerCase() === normalized)?.[0] || normalized;
}
function updateWorkflowSummary(candidates) {
  const panel = app.querySelector('.card.overflow-hidden');
  const heading = panel?.querySelector('.bg-teal-800 h2');
  const eyebrow = panel?.querySelector('.bg-teal-800 p');
  const rows = panel?.querySelector('.space-y-4.p-5');
  if (!panel || !rows) return;
  if (heading) heading.textContent = 'Application status summary';
  if (eyebrow) eyebrow.textContent = 'Live candidate stages';
  rows.innerHTML = candidateWorkflowStages.map(([value, label]) => {
    const count = candidates.filter(candidate => normalizedCandidateStage(candidate.status) === value).length;
    return `<button type="button" class="workflow-stage-link" data-candidate-status="${value}"><span>${label}</span><span class="badge badge-${count ? 'blue' : 'amber'}">${count}</span></button>`;
  }).join('');
}

function receiptRows(result) {
  const receipt = result.receipt || {};
  const date = value => value ? new Date(value).toLocaleDateString('en-KE') : 'Not provided';
  return [
    ['Tracking number', result.trackingNumber], ['Submitted', date(result.submitted)], ['Applicant', result.name], ['Date of birth', date(receipt.dateOfBirth)],
    ['Gender', receipt.gender], ['Marital status', receipt.maritalStatus], ['Passport', receipt.passport],
    ['Passport expiry', date(receipt.passportExpiry)], ['National ID', receipt.nationalId],
    ['Nationality', receipt.nationality], ['Phone', receipt.phone], ['Email', receipt.email], ['Address', receipt.address],
    ['Branch', `${receipt.branchCode || ''} ${receipt.branchName || ''}`.trim()], ['Registered by', receipt.registeredBy],
    ...(receipt.subAgentName ? [['Sub-agent', receipt.subAgentName]] : []),
    ...((receipt.applications || result.applications || []).flatMap(job => [['Job', job.jobTitle], ['Country', job.country], ['Employer', job.employer]])),
    ['Application status', statusText(result.status)], ['Commission Total', money(result.commissionTotal)],
    ['Paid', money(result.paidAmount)], ['Balance due', money(result.balanceDue)]
  ].map(([label, value]) => [label, String(value || 'Not provided')]);
}

function printReceipt(result) {
  const popup = window.open('', '_blank', 'width=440,height=760');
  if (!popup) return showToast('Allow pop-ups to print the receipt.');
  const rows = receiptRows(result).map(([label, value]) => `<div class="row"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`).join('');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(result.trackingNumber)} receipt</title><style>
    @page{size:80mm auto;margin:2mm}*{box-sizing:border-box}body{width:76mm;margin:0 auto;padding:3mm 1mm;color:#111;font:12px/1.35 Arial,sans-serif}.brand{text-align:center;font-size:20px;font-weight:700}.subtitle{text-align:center;font-size:10px;margin:2px 0 10px}.code{text-align:center;font-size:13px;font-weight:700;border-top:1px dashed #111;border-bottom:1px dashed #111;padding:7px 0;margin-bottom:8px}.row{padding:4px 0;border-bottom:1px dotted #bbb;overflow-wrap:anywhere}.row b,.row span{display:block}.row b{text-transform:uppercase;font-size:9px}.row span{font-size:12px}.foot{text-align:center;margin-top:10px;font-size:9px}@media screen{body{margin:16px auto;padding:14px;box-shadow:0 2px 16px #999}}
    </style></head><body><div class="brand">ROMS</div><div class="subtitle">APPLICATION RECEIPT</div><div class="code">${escapeHtml(result.trackingNumber)}</div>${rows}<div class="foot">Keep this tracking number and link private.<br>ROMS Recruitment Operations</div></body></html>`);
  popup.document.close();
  popup.document.querySelector('.brand').textContent = store.data.company.companyName;
  popup.document.querySelector('.subtitle').textContent = 'APPLICATION STATUS REPORT';
  if (store.data.company.logoData) {
    const logo = popup.document.createElement('img'); logo.src = store.data.company.logoData; logo.alt = 'Company logo';
    logo.style.cssText = 'display:block;width:70px;height:45px;object-fit:contain;margin:0 auto 8px';
    popup.document.body.prepend(logo);
  }
  setTimeout(() => { popup.focus(); popup.print(); }, 250);
}

async function downloadReceiptJpeg(result) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const width = 720;
  const margin = 48;
  const textWidth = width - margin * 2;
  const wrap = (text, font) => {
    context.font = font;
    const lines = [];
    let line = '';
    for (const word of String(text).split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > textWidth) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const title = wrap(store.data.company.companyName, 'bold 26px Arial');
  let logo = null;
  if (store.data.company.logoData) {
    logo = new Image(); logo.src = store.data.company.logoData;
    try { await logo.decode(); } catch { logo = null; }
  }
  const code = wrap(result.trackingNumber, 'bold 23px Arial');
  const items = receiptRows(result).map(([label, value]) => ({ label, lines: wrap(value, '20px Arial') }));
  canvas.width = width;
  canvas.height = 165 + (logo ? 100 : 0) + (title.length + code.length) * 34 + items.reduce((height, item) => height + 38 + item.lines.length * 28, 0) + 60;
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111'; context.textAlign = 'center'; context.font = 'bold 26px Arial';
  let y = 52;
  if (logo) {
    const scale = Math.min(160 / logo.width, 80 / logo.height);
    context.drawImage(logo, (width - logo.width * scale) / 2, 20, logo.width * scale, logo.height * scale);
    y += 100;
  }
  for (const line of title) { context.fillText(line, width / 2, y); y += 34; }
  context.font = '20px Arial'; context.fillText('APPLICATION STATUS REPORT', width / 2, y); y += 34;
  context.font = 'bold 23px Arial';
  for (const line of code) { context.fillText(line, width / 2, y); y += 34; }
  y += 12; context.textAlign = 'left';
  for (const item of items) {
    context.font = 'bold 15px Arial'; context.fillText(item.label.toUpperCase(), margin, y); y += 24;
    context.font = '20px Arial';
    for (const line of item.lines) { context.fillText(line, margin, y); y += 27; }
    y += 11; context.strokeStyle = '#bbb'; context.beginPath(); context.moveTo(margin, y - 4); context.lineTo(width - margin, y - 4); context.stroke();
  }
  canvas.toBlob(blob => {
    if (!blob) return showToast('Could not create the JPEG receipt.');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `${result.trackingNumber}-receipt.jpg`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/jpeg', 0.94);
}

function publicJobsView() {
  const openJobs = store.data.jobs.filter(job => job.status === 'Open');
  const countries = [...new Set([...jobDestinations, ...openJobs.map(job => job.country).filter(country => country && !jobDestinations.includes(country))])];
  const selectedJobs = publicSelectedCountry ? openJobs.filter(job => job.country === publicSelectedCountry) : [];
  app.innerHTML = `<main class="public-portal"><header class="public-header"><a class="public-brand" href="#jobs"><span class="brand-mark">R</span><span><strong class="display">ROMS</strong><small>Recruitment operations</small></span></a><nav><a href="#track">Track application</a><a class="btn btn-primary" href="#login">Staff login</a></nav></header><section class="public-intro"><p class="text-xs font-bold uppercase tracking-wide text-teal-700">Overseas opportunities</p><h1 class="display mt-2 text-3xl font-bold">Find your next opportunity</h1><p class="mt-2 max-w-2xl text-sm text-slate-500">Browse current job orders by destination. Choose a role to submit a new application.</p></section>${publicSelectedCountry ? `<section class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><button class="btn btn-ghost" id="public-all-countries">← All countries</button><h2 class="display mt-3 text-xl font-bold">${publicSelectedCountry}</h2></div><label class="text-xs font-bold text-slate-500">Change country<select id="public-country-select" class="select mt-2 w-full">${countries.map(country => `<option ${country === publicSelectedCountry ? 'selected' : ''}>${country}</option>`).join('')}</select></label></div><div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${selectedJobs.map(job => `<button type="button" class="job-order-card compact-job-card text-left" data-public-apply="${job.id}"><span class="flex items-center justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Job order'}</span></span><strong class="display mt-3 block">${job.title}</strong><span class="mt-1 block text-xs font-semibold text-teal-800">${job.jobType || 'Other'}</span><span class="mt-1 block text-xs text-slate-500">${job.employer} · ${job.location}, ${job.country}</span><span class="mt-2 block text-xs text-slate-500">${job.headcountRequired || job.openings} positions · ${job.contractDurationMonths} months</span><span class="mt-2 block text-xs font-bold text-teal-800">Tap to apply →</span></button>`).join('') || '<p class="text-sm text-slate-500">No open jobs currently listed for this country.</p>'}</div></section>` : `<section class="browse-card-grid">${countries.map(country => { const jobs = openJobs.filter(job => job.country === country); return `<button type="button" class="browse-card" data-public-country="${country}"><span class="browse-card-title">${country}</span><span class="browse-card-count">${jobs.length} open ${jobs.length === 1 ? 'job' : 'jobs'}</span><span class="browse-card-preview">${jobs.slice(0, 4).map(job => job.title).join(' · ') || 'No current openings'}</span></button>`; }).join('')}</section>`}<footer class="public-footer">ROMS · Recruitment Operations Management System</footer></main>`;
  app.querySelectorAll('[data-public-country]').forEach(button => button.onclick = () => { publicSelectedCountry = button.dataset.publicCountry; dashboardView(); });
  app.querySelector('#public-all-countries')?.addEventListener('click', () => { publicSelectedCountry = ''; dashboardView(); });
  app.querySelector('#public-country-select')?.addEventListener('change', event => { publicSelectedCountry = event.target.value; dashboardView(); });
  app.querySelectorAll('[data-public-apply]').forEach(button => button.onclick = () => { window.location.hash = `apply?jobId=${encodeURIComponent(button.dataset.publicApply)}`; });
  businessUI.jobDetails();
}

function publicApplicationView(jobId) {
  const job = store.data.jobs.find(item => item.id === jobId && item.status === 'Open');
  if (!job) { publicJobsView(); return; }
  app.innerHTML = `<main class="public-portal"><header class="public-header"><a class="public-brand" href="#jobs"><span class="brand-mark">R</span><span><strong class="display">ROMS</strong><small>Recruitment operations</small></span></a><a href="#track">Track application</a></header><section class="card public-form-card"><button class="btn btn-ghost" id="public-back-jobs">← Available jobs</button><p class="mt-5 text-xs font-bold uppercase tracking-wide text-teal-700">New applicant application</p><h1 class="display mt-2 text-2xl font-bold">${job.title}</h1><p class="mt-1 text-sm text-slate-500">${job.reference || ''} · ${job.country} · ${job.location}</p><form id="public-application-form" class="mt-6 space-y-5"><input type="hidden" name="jobId" value="${job.id}" /><fieldset><legend class="display text-sm font-bold">Personal information</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input name="firstName" class="input" placeholder="First name *" required /><input name="middleName" class="input" placeholder="Middle name" /><input name="lastName" class="input" placeholder="Last name *" required /><label class="text-xs font-bold text-slate-500">Date of birth *<input name="dateOfBirth" class="input mt-2 w-full" type="date" required /></label><select name="gender" class="select" required><option value="">Gender *</option><option>Male</option><option>Female</option></select><select name="maritalStatus" class="select" required><option value="">Marital status *</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></div></fieldset><fieldset><legend class="display text-sm font-bold">Identification and contact</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input name="passport" class="input" placeholder="Passport number *" required /><label class="text-xs font-bold text-slate-500">Passport expiry<input name="passportExpiry" class="input mt-2 w-full" type="date" /></label><input name="nationalId" class="input" placeholder="National ID" /><input name="nationality" class="input" placeholder="Nationality" /><input name="email" class="input" type="email" placeholder="Email *" required /><input name="phone" class="input" type="tel" placeholder="Phone number *" required /><input name="alternatePhone" class="input" type="tel" placeholder="Alternate phone" /><textarea name="address" class="input sm:col-span-2" placeholder="Address"></textarea></div></fieldset><fieldset><legend class="display text-sm font-bold">Branch registration</legend><select name="branchId" class="select mt-3 w-full" required><option value="">Choose the office nearest you *</option>${store.data.branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}</select><input type="hidden" name="registeredBy" value="Self" /></fieldset><button class="btn btn-primary w-full" type="submit">Submit application</button><p id="public-application-error" class="hidden rounded-lg bg-red-50 p-3 text-sm text-red-700"></p></form></section></main>`;
  app.querySelector('#public-back-jobs').onclick = () => { window.location.hash = 'jobs'; };
  app.querySelector('#public-application-form').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true;
    submit.textContent = 'Submitting...';
    try {
      const created = await store.publicApply(values);
      const result = await store.trackByToken(created.publicTrackingToken);
      publicTrackingResult = { ...result, emailSent: created.emailSent };
      window.location.hash = `track?token=${encodeURIComponent(created.publicTrackingToken)}`;
    } catch (error) {
      const target = app.querySelector('#public-application-error');
      target.textContent = error.message;
      target.classList.remove('hidden');
      submit.disabled = false;
      submit.textContent = 'Submit application';
    }
  };
}

function publicTrackingView(token = '') {
  app.innerHTML = `<main class="public-portal"><header class="public-header"><a class="public-brand" href="#jobs"><span class="brand-mark">R</span><span><strong class="display">ROMS</strong><small>Recruitment operations</small></span></a><a class="btn btn-primary" href="#login">Staff login</a></header><section class="card public-form-card"><p class="text-xs font-bold uppercase tracking-wide text-teal-700">Applicant portal</p><h1 class="display mt-2 text-2xl font-bold">Track your application</h1><p class="mt-2 text-sm text-slate-500">Enter your tracking number and the email used on your application, or open your private tracking link.</p><form id="tracking-form" class="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input id="tracking-code" class="input min-w-0" placeholder="ROMS-BRANCH-001" required /><input id="tracking-email" class="input min-w-0" type="email" placeholder="Application email" required /><button class="btn btn-primary" type="submit">Track</button></form><div id="tracking-result" class="mt-5"></div></section></main>`;
  const displayResult = result => {
    const target = app.querySelector('#tracking-result');
    const emailMessage = result.emailSent
      ? `Tracking details were sent to ${escapeHtml(result.receipt.email)}.`
      : `Send tracking details to ${escapeHtml(result.receipt.email)} using the button below.`;
    target.innerHTML = `<section class="receipt-panel"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wide text-teal-700">Application receipt</p><h2 class="display mt-2 text-xl font-bold">${escapeHtml(result.name)}</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(result.trackingNumber)}</p></div><p class="mt-1">${badge(escapeHtml(statusText(result.status)))}</p></div><div class="mt-4 grid gap-3 sm:grid-cols-2 text-sm"><div><span class="text-xs text-slate-500">Job</span><strong class="block">${result.applications.map(item => escapeHtml(item.jobTitle)).join(', ') || 'Not assigned'}</strong></div><div><span class="text-xs text-slate-500">Country</span><strong class="block">${result.applications.map(item => escapeHtml(item.country)).join(', ') || '—'}</strong></div><div><span class="text-xs text-slate-500">Commission Total</span><strong class="block">${money(result.commissionTotal)}</strong></div><div><span class="text-xs text-slate-500">Paid</span><strong class="block">${money(result.paidAmount)}</strong></div><div><span class="text-xs text-slate-500">Balance due</span><strong class="block">${money(result.balanceDue)}</strong></div></div><p class="mt-4 text-xs text-slate-500">${emailMessage}</p><div class="receipt-actions mt-4 grid gap-2 sm:grid-cols-2"><button type="button" class="btn btn-primary" data-receipt-print>Print thermal ticket</button><button type="button" class="btn btn-ghost" data-receipt-jpeg>Download JPEG</button><button type="button" class="btn btn-ghost" data-receipt-pdf>Download PDF</button><button type="button" class="btn btn-ghost" data-send-tracking-email>Send tracking email</button></div><p class="mt-3 text-xs text-slate-500" data-email-feedback role="status"></p></section>`;
    target.querySelector('[data-receipt-print]').onclick = () => printReceipt(result);
    target.querySelector('[data-receipt-jpeg]').onclick = () => downloadReceiptJpeg(result);
    target.querySelector('[data-receipt-pdf]').onclick = async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const blob = await store.downloadReceipt(result.publicTrackingToken);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `${result.trackingNumber}-receipt.pdf`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) { showToast(error.message); }
      finally { button.disabled = false; }
    };
    target.querySelector('[data-send-tracking-email]').onclick = async event => {
      const button = event.currentTarget;
      const feedback = target.querySelector('[data-email-feedback]');
      button.disabled = true;
      feedback.textContent = 'Sending tracking details...';
      try {
        await store.sendTrackingEmail(result.publicTrackingToken);
        result.emailSent = true;
        feedback.textContent = `Sent to ${result.receipt.email}.`;
      } catch (error) {
        feedback.textContent = error.message;
      } finally { button.disabled = false; }
    };
  };
  app.querySelector('#tracking-form').onsubmit = async event => {
    event.preventDefault();
    const target = app.querySelector('#tracking-result');
    target.textContent = 'Looking up application...';
    try {
      publicTrackingResult = await store.trackApplication(app.querySelector('#tracking-code').value.trim(), app.querySelector('#tracking-email').value.trim());
      displayResult(publicTrackingResult);
      window.location.hash = `track?token=${encodeURIComponent(publicTrackingResult.publicTrackingToken)}`;
    } catch (error) { target.innerHTML = `<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">${escapeHtml(error.message)}</p>`; }
  };
  if (token) {
    if (publicTrackingResult?.publicTrackingToken === token) displayResult(publicTrackingResult);
    else {
      publicTrackingResult = null;
      app.querySelector('#tracking-result').textContent = 'Loading application...';
      store.trackByToken(token).then(result => { publicTrackingResult = result; displayResult(result); }).catch(error => {
        app.querySelector('#tracking-result').innerHTML = `<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">${escapeHtml(error.message)}</p>`;
      });
    }
  }
}

function clearLoginCredentials() {
  const loginForm = app.querySelector('#login-form');
  if (!loginForm) return;
  loginForm.reset();
  loginForm.querySelectorAll('input').forEach(input => { input.value = ''; input.defaultValue = ''; });
}

function loginView() {
  app.innerHTML = `<main class="login"><section class="login-art"><div class="brand-mark">R</div><p class="mt-10 text-xs uppercase tracking-[.28em] text-teal-200">Recruitment operations</p><h1 class="display mt-4 max-w-xl text-5xl font-bold leading-[1.04]">Move people from opportunity to departure.</h1><p class="mt-6 max-w-md text-sm leading-7 text-slate-300">ROMS brings candidate movement, global job orders, branch operations and finance into one clear operating picture.</p><div class="mt-16 grid max-w-md grid-cols-3 gap-3 text-xs"><div class="border-t border-white/20 pt-3"><strong class="display block text-2xl text-white">Live</strong><span class="text-slate-400">PocketBase data</span></div><div class="border-t border-white/20 pt-3"><strong class="display block text-2xl text-white">RBAC</strong><span class="text-slate-400">branch isolation</span></div><div class="border-t border-white/20 pt-3"><strong class="display block text-2xl text-white">24/7</strong><span class="text-slate-400">workflow visibility</span></div></div></section><section class="login-panel"><form class="login-card" id="login-form"><p class="text-xs font-bold uppercase tracking-[.2em] text-teal-700">Secure access</p><h2 class="display mt-3 text-3xl font-bold">Sign in to ROMS</h2><p class="mt-2 text-sm text-slate-500">Use your ROMS account credentials.</p><label class="mt-8 block text-xs font-bold text-slate-600">Work email<input class="input mt-2 w-full" name="email" type="email" autocomplete="username" required placeholder="you@agency.com" /></label><label class="mt-4 block text-xs font-bold text-slate-600">Password<span class="relative mt-2 block"><input class="input w-full pr-20" name="password" type="password" autocomplete="current-password" required placeholder="Your password" /><button class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold text-teal-700" type="button" id="toggle-login-password" aria-controls="login-password" aria-label="Show password" aria-pressed="false">Show</button></span></label><p class="mt-4 hidden rounded-lg bg-red-50 p-3 text-xs text-red-700" id="login-error"></p><button class="btn btn-primary mt-6 w-full" type="submit">Sign in securely</button><p class="mt-7 text-center text-xs text-slate-400">Candidate access and staff access use the same secure sign-in.</p></form></section></main>`;
  const usernameInput = app.querySelector('#login-form [name="email"]');
  usernameInput.name = 'username'; usernameInput.type = 'text'; usernameInput.placeholder = 'Your username'; usernameInput.autocomplete = 'off';
  usernameInput.parentElement.firstChild.textContent = 'Username';
  const loginForm = app.querySelector('#login-form');
  loginForm.autocomplete = 'off';
  const passwordInput = app.querySelector('#login-form [name="password"]');
  passwordInput.id = 'login-password';
  passwordInput.autocomplete = 'new-password';
  clearLoginCredentials();
  window.setTimeout(clearLoginCredentials, 100);
  app.querySelector('#toggle-login-password').addEventListener('click', event => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    event.currentTarget.textContent = isVisible ? 'Show' : 'Hide';
    event.currentTarget.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    event.currentTarget.setAttribute('aria-pressed', String(!isVisible));
  });
  app.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button');
    button.disabled = true; button.textContent = 'Signing in...';
    try { await store.login(form.get('username'), form.get('password')); window.location.hash = 'overview'; }
    catch (error) { const message = error?.response?.message || error?.message || 'Unable to sign in. Check your email and password.'; const target = app.querySelector('#login-error'); if (target) { target.textContent = message; target.classList.remove('hidden'); } button.disabled = false; button.textContent = 'Sign in securely'; }
  });
  const browseJobs = document.createElement('a'); browseJobs.href = '#jobs'; browseJobs.className = 'btn btn-ghost mt-3 block text-center'; browseJobs.textContent = 'Browse available jobs'; app.querySelector('#login-form')?.append(browseJobs);
}

function passwordSetupView() {
  app.innerHTML = `<main class="login"><section class="login-panel"><form class="login-card" id="first-password-form"><p class="text-xs font-bold uppercase tracking-wide text-teal-700">First sign-in</p><h1 class="display mt-3 text-2xl font-bold">Choose your password</h1><p class="mt-2 text-sm text-slate-500">Your one-time password is accepted. Confirm your registered email address and set a new password to continue.</p><label class="mt-6 block text-xs font-bold text-slate-600">Registered email<input class="input mt-2 w-full" name="email" type="email" autocomplete="email" required /></label><label class="mt-4 block text-xs font-bold text-slate-600">New password<input class="input mt-2 w-full" name="password" type="password" autocomplete="new-password" minlength="10" required /></label><label class="mt-4 block text-xs font-bold text-slate-600">Confirm new password<input class="input mt-2 w-full" name="confirmPassword" type="password" autocomplete="new-password" minlength="10" required /></label><p class="mt-3 text-xs text-slate-500">Use at least 10 characters with letters and numbers.</p><p class="mt-4 hidden rounded-lg bg-red-50 p-3 text-xs text-red-700" id="first-password-error"></p><button class="btn btn-primary mt-5 w-full" type="submit">Set password</button></form></section></main>`;
  app.querySelector('#first-password-form').onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const error = app.querySelector('#first-password-error');
    const button = event.currentTarget.querySelector('[type="submit"]');
    if (form.get('password') !== form.get('confirmPassword')) { error.textContent = 'The new passwords do not match.'; error.classList.remove('hidden'); return; }
    button.disabled = true; button.textContent = 'Setting password...';
    try {
      await store.setFirstPassword({ email: form.get('email'), password: form.get('password'), confirmPassword: form.get('confirmPassword') });
      await store.logout(); window.location.hash = 'login';
    } catch (failure) { error.textContent = failure.message; error.classList.remove('hidden'); button.disabled = false; button.textContent = 'Set password'; }
  };
}

function dashboardView() {
  if (store.loading && !store.user) { app.innerHTML = `<main class="grid min-h-screen place-items-center bg-stone-100"><div class="text-center"><div class="brand-mark mx-auto">R</div><p class="mt-4 text-sm text-slate-500">Connecting to ROMS...</p></div></main>`; return; }
  if (store.error && !store.user) { app.innerHTML = `<main class="grid min-h-screen place-items-center bg-stone-100 p-6"><div class="card max-w-md p-7 text-center"><div class="brand-mark mx-auto">!</div><h1 class="display mt-5 text-2xl font-bold">ROMS is offline</h1><p class="mt-2 text-sm text-slate-500">The ROMS API is unavailable. Check the Node service, then reload this page.</p><button class="btn btn-primary mt-6" onclick="location.reload()">Try again</button></div></main>`; return; }
  const user = store.user;
  if (user?.passwordResetRequired) return passwordSetupView();
  if (!user) {
    const [publicRoute, publicQuery = ''] = window.location.hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(publicQuery);
    if (publicRoute === 'login') return loginView();
    if (publicRoute === 'apply') return publicApplicationView(params.get('jobId'));
    if (publicRoute === 'track') return publicTrackingView(params.get('token') || '');
    return publicJobsView();
  }
    const candidates = visibleCandidates(user);
    const transactions = visibleTransactions(user);
    const isCandidate = user.role === 'candidate';
  const canCreateApplications = ['super_admin', 'branch_admin', 'branch_staff'].includes(user.role);
  const canViewPassports = ['super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance'].includes(user.role);
  const nav = isCandidate ? [{ id: 'overview', label: 'My application', icon: 'grid' }, { id: 'documents', label: 'Documents', icon: 'briefcase' }] : [{ id: 'overview', label: 'Overview', icon: 'grid' }, ...(user.role === 'super_admin' ? [{ id: 'settings', label: 'Settings', icon: 'settings' }] : []), { id: 'candidates', label: 'Candidates', icon: 'users' }, { id: 'jobs', label: 'Job orders', icon: 'briefcase' }, ...(canCreateApplications ? [{ id: 'applications', label: 'Applications', icon: 'briefcase' }] : []), { id: 'finance', label: 'Finance', icon: 'wallet' }, ...(canViewPassports ? [{ id: 'passports', label: 'Passport inventory', icon: 'briefcase' }] : []), ...(user.role === 'branch_admin' ? [{ id: 'users', label: 'Branch users', icon: 'users' }] : []), ...(user.role === 'super_admin' ? [{ id: 'branches', label: 'Branches', icon: 'office' }, { id: 'users', label: 'System users', icon: 'users' }, { id: 'audit', label: 'Audit log', icon: 'settings' }] : [])];
  const [active, hashQuery = ''] = window.location.hash.slice(1).split('?');
  if (user.role === 'recruiter') nav.splice(0, nav.length, { id: 'overview', label: 'My overview', icon: 'grid' }, { id: 'jobs', label: 'My job orders', icon: 'briefcase' }, { id: 'candidates', label: 'My candidates', icon: 'users' });
  else if (['super_admin', 'branch_admin'].includes(user.role)) nav.push({ id: 'recruiters', label: 'Recruiters', icon: 'users' });
  const params = new URLSearchParams(hashQuery);
  const selectedJobId = params.get('jobId');
  const selectedCandidateStatus = params.get('status');
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="flex items-center gap-3 px-2"><div class="brand-mark">R</div><div><strong class="display block text-lg">ROMS</strong><span class="text-[10px] uppercase tracking-[.18em] text-slate-400">Operations</span></div></div><div class="mt-12 rounded-xl border border-white/10 bg-white/5 p-3"><p class="text-[10px] uppercase tracking-[.16em] text-slate-500">Signed in as</p><p class="mt-1 text-sm font-bold">${user.name}</p><p class="mt-1 text-xs text-yellow-200">${roleLabels[user.role]}</p>${user.branchId ? `<p class="mt-1 text-[11px] text-slate-400">${branchName(user.branchId)} office</p>` : ''}</div><nav class="side-nav mt-8">${nav.map(item => `<button class="nav-link ${active === item.id ? 'active' : ''}" data-nav="${item.id}"><span class="text-base">${icon(item.icon)}</span>${item.label}</button>`).join('')}</nav><div class="side-footer mt-auto border-t border-white/10 pt-5"><button class="nav-link" id="switch-user"><span>↪</span>Sign out</button><p class="px-3 pt-4 text-[11px] leading-5 text-slate-500">Access is restricted by role and branch.</p></div></aside><main class="main"><header class="topbar"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-teal-700">${isCandidate ? 'Candidate portal' : 'Operations control room'}</p><h1 class="display mt-2 text-3xl font-bold">${nav.find(item => item.id === active)?.label || 'Overview'}</h1></div><div class="flex items-center gap-3"><span class="hidden text-right text-xs text-slate-500 sm:block">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}<strong class="block text-ink">${branchName(user.branchId)}</strong></span><div class="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">${user.name.split(' ').map(item => item[0]).join('').slice(0, 2)}</div></div></header>${renderPage(active, user, candidates, transactions, selectedJobId, selectedCandidateStatus)}</main></div>`;
  if (active === 'overview') {
    app.querySelector('.main > section.grid')?.classList.add('overview-metrics');
    updateWorkflowSummary(candidates);
  }
  const menuButton = document.createElement('button'); menuButton.className = 'mobile-menu-button btn btn-ghost'; menuButton.type = 'button'; menuButton.setAttribute('aria-label', 'Open navigation'); menuButton.textContent = '☰'; app.querySelector('.topbar')?.prepend(menuButton); menuButton.onclick = () => app.querySelector('.sidebar')?.classList.toggle('mobile-open');
  const signOut = app.querySelector('#switch-user');
  if (signOut) { signOut.className = 'btn btn-ghost'; app.querySelector('.topbar > div:last-child')?.prepend(signOut); }
  const refreshButton = document.createElement('button');
  refreshButton.type = 'button'; refreshButton.className = 'btn btn-ghost'; refreshButton.append(createElement(RefreshCw, { width: 18, height: 18, 'aria-hidden': 'true' }));
  refreshButton.title = 'Refresh data'; refreshButton.setAttribute('aria-label', 'Refresh data');
  app.querySelector('.topbar > div:last-child')?.prepend(refreshButton);
  refreshButton.onclick = async () => {
    refreshButton.disabled = true;
    try { await store.refresh(); showToast('Data refreshed.'); }
    catch (error) { showToast(error.message || 'Could not refresh data.'); }
    finally { refreshButton.disabled = false; }
  };
  if (user.role !== 'candidate') {
    const changePassword = document.createElement('button');
    changePassword.type = 'button'; changePassword.className = 'nav-link'; changePassword.id = 'change-password'; changePassword.textContent = 'Change password';
    app.querySelector('.side-footer')?.prepend(changePassword);
  }
  if (active === 'candidates' && !['candidate', 'recruiter'].includes(user.role)) {
    const search = app.querySelector('#candidate-search');
    const toolbar = search?.parentElement;
    toolbar?.classList.add('flex-wrap');
    if (toolbar && !user.branchId) {
      const branch = document.createElement('select');
      branch.id = 'candidate-branch-filter'; branch.className = 'select'; branch.setAttribute('aria-label', 'Filter by branch');
      branch.innerHTML = '<option value="">All branches</option>';
      store.data.branches.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; branch.append(option); });
      toolbar.insertBefore(branch, search);
    }
    const empty = document.createElement('p');
    empty.id = 'candidate-filter-empty'; empty.className = 'mt-4 text-sm text-slate-500'; empty.hidden = true;
    empty.textContent = 'No candidates match these filters.';
    app.querySelector('.table-wrap')?.after(empty);
    app.querySelectorAll('.table-wrap tbody tr').forEach(row => {
      const candidate = candidates.find(item => item.id === row.dataset.candidateRow);
      const actions = row.querySelector('td:last-child');
      if (!candidate || !actions) return;
      row.dataset.search = [candidate.name, candidate.passport, candidate.trackingNumber, candidate.email, candidate.phone, candidate.status, branchName(candidate.branchId), candidateJobs(candidate)].join(' ').toLocaleLowerCase();
      row.dataset.branch = candidate.branchId;
      row.querySelector('[data-candidate]')?.remove();
      const open = document.createElement('button');
      open.type = 'button'; open.className = 'candidate-name-link'; open.textContent = candidate.name; open.dataset.candidate = candidate.id;
      const identityCell = row.children[0];
      identityCell?.querySelector('strong')?.replaceWith(open);
      if (identityCell && candidate.trackingNumber) { const tracking = document.createElement('span'); tracking.className = 'block text-[11px] font-semibold text-teal-700'; tracking.textContent = `Tracking: ${candidate.trackingNumber}`; identityCell.append(tracking); }
      const feeCell = row.children[4];
      if (feeCell) feeCell.innerHTML = `<strong>${money(candidate.commissionTotal || candidate.agreedFee)}</strong><span class="block text-[11px] text-slate-400">Commission Total · Paid ${money(candidate.paidAmount)} · Due ${money(candidate.dueAmount)}</span>`;
      const workflowButton = document.createElement('button');
      workflowButton.className = 'btn btn-ghost ml-1'; workflowButton.type = 'button'; workflowButton.dataset.workflow = candidate.id; workflowButton.textContent = 'Update stage';
      actions.append(workflowButton);
      if (user.role === 'super_admin') {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-ghost ml-1 text-red-700'; deleteButton.type = 'button'; deleteButton.dataset.deleteCandidate = candidate.id; deleteButton.textContent = 'Delete';
        actions.append(deleteButton);
      }
    });
  }
  if (active === 'users' && ['super_admin', 'branch_admin'].includes(user.role)) {
    app.querySelectorAll('.table-wrap tbody tr').forEach((row, index) => {
      const account = store.data.users[index];
      const actions = row.querySelector('td:last-child');
      if (user.role !== 'super_admin' || account?.role !== 'recruiter' || !actions) return;
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-ghost ml-1 text-red-700'; deleteButton.type = 'button'; deleteButton.dataset.deleteRecruiter = account.id; deleteButton.textContent = 'Delete';
      actions.append(deleteButton);
    });
    app.querySelectorAll('.table-wrap tbody tr').forEach((row, index) => {
      const account = store.data.users[index];
      const actions = row.querySelector('td:last-child');
      if (!account || account.role === 'candidate' || !actions) return;
      const usernameLine = document.createElement('span');
      usernameLine.className = 'block text-[11px] text-teal-700'; usernameLine.textContent = `Username: ${account.username || 'Not assigned'}`;
      row.children[0]?.append(usernameLine);
      if (user.role !== 'super_admin') return;
      const resetButton = document.createElement('button');
      resetButton.className = 'btn btn-ghost ml-1'; resetButton.type = 'button'; resetButton.dataset.resetUser = account.id; resetButton.textContent = 'Reset password';
      actions.append(resetButton);
    });
  }
  if (active === 'jobs' && user.role !== 'candidate') {
    const panel = document.createElement('section');
    panel.className = 'card mt-6 p-5';
    const canEdit = ['super_admin', 'branch_admin'].includes(user.role);
    panel.innerHTML = `<div><h2 class="display text-lg font-bold">Job orders</h2><p class="mt-1 text-xs text-slate-500">New orders stay pending until a Super Admin or Branch Admin approves them.</p></div><div class="table-wrap mt-4"><table><thead><tr><th>Reference</th><th>Job</th><th>Country</th><th>Status</th><th>Applicants</th><th></th></tr></thead><tbody>${store.data.jobs.map(job => `<tr><td>${escapeHtml(job.reference || '—')}</td><td>${escapeHtml(job.title)}</td><td>${escapeHtml(job.country)}</td><td>${badge(escapeHtml(job.status === 'Pending_approval' ? 'Pending approval' : job.status))}</td><td>${store.data.applications.filter(application => application.jobId === job.id).length}</td><td>${canEdit && job.status === 'Pending_approval' ? `<button type="button" class="btn btn-primary" data-approve-job="${job.id}">Approve</button>` : ''}${canEdit ? `<button type="button" class="btn btn-ghost ml-1" data-edit-job="${job.id}">Edit</button>` : ''}${user.role === 'super_admin' ? `<button type="button" class="btn btn-ghost ml-1 text-red-700" data-delete-job="${job.id}">Delete</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6">No job orders.</td></tr>'}</tbody></table></div>`;
    app.querySelector('.main')?.append(panel);
    panel.querySelectorAll('tbody tr').forEach((row, index) => {
      const job = store.data.jobs[index]; if (!job) return;
      row.children[1]?.insertAdjacentHTML('beforeend', `<span class="block mt-2 text-xs"><strong>Expected salary:</strong> ${escapeHtml(job.currency)} ${escapeHtml(job.minimumSalary)} - ${escapeHtml(job.maximumSalary)}</span><span class="block mt-2 text-xs whitespace-pre-wrap"><strong>Qualifications:</strong> ${escapeHtml(job.requiredSkills || 'Not specified')}</span>`);
    });
  }
  app.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => { window.location.hash = button.dataset.nav; app.querySelector('.sidebar')?.classList.remove('mobile-open'); }));
  document.querySelector('#switch-user')?.addEventListener('click', () => {
    const loginForm = document.querySelector('#login-form');
    loginForm?.reset();
    loginForm?.querySelectorAll('input').forEach(input => { input.value = ''; });
    store.logout();
  });
  document.querySelector('#change-password')?.addEventListener('click', openChangePasswordModal);
  document.querySelectorAll('.metric-card').forEach(card => {
    const label = card.querySelector('p')?.textContent;
    const target = { 'Active candidates': 'candidates', 'Open job orders': 'jobs', 'Pending finance': 'finance', Documents: 'documents' }[label];
    if (target) { card.dataset.nav = target; card.tabIndex = 0; card.classList.add('metric-link'); }
  });
  businessUI.enhance(active || 'overview');
  labelTableCells();
  wireActions();
}

function renderPage(active, user, candidates, transactions, selectedJobId, selectedCandidateStatus) {
  if (user.role === 'recruiter') return active === 'jobs' ? businessUI.recruiterJobs() : businessUI.recruiterCandidates();
  if (active === 'recruiters' && ['super_admin', 'branch_admin'].includes(user.role)) return businessUI.recruiterPage();
  if (active === 'candidates') return candidatesPageV2(user, candidates, selectedCandidateStatus);
  if (active === 'jobs') return jobsBrowsePage(user);
  if (active === 'applications' && ['super_admin', 'recruiter', 'branch_admin', 'branch_staff'].includes(user.role)) return applicationsPage(user, candidates, selectedJobId);
  if (active === 'finance') return businessUI.financePage();
  if (active === 'passports' && ['super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance'].includes(user.role)) return passportsPage(user);
  if (active === 'branches' && user.role === 'super_admin') return branchesPage();
  if (active === 'users' && ['super_admin', 'branch_admin'].includes(user.role)) return usersPage(user);
  if (active === 'audit' && user.role === 'super_admin') return businessUI.auditPage();
  if (['settings', 'backups'].includes(active) && user.role === 'super_admin') return backupsPage();
  if (active === 'documents') return documentsPage(user);
  return overviewPage(user, candidates, transactions);
}
function candidateJobs(candidate) { return (candidate.applications || []).map(application => `${application.job?.title || 'Job'} · ${application.job?.country || ''}`).join(', ') || 'Not assigned'; }
function candidateStageControl(_user, candidate) { return badge(escapeHtml(candidate.status)); }
function candidatesPageV2(user, candidates, selectedStatus = '') {
  const filtered = selectedStatus ? candidates.filter(candidate => normalizedCandidateStage(candidate.status) === selectedStatus) : candidates;
  const selectedLabel = candidateWorkflowStages.find(([value]) => value === selectedStatus)?.[1] || selectedStatus;
  return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">${user.role === 'candidate' ? 'My application' : 'Candidate registry'}</h2><p class="mt-1 text-xs text-slate-500">${selectedStatus ? `${filtered.length} candidates at ${escapeHtml(selectedLabel)} stage` : 'Candidate details, workflow stage, job assignments, and fees'}</p></div><div class="flex gap-2">${selectedStatus ? '<button type="button" class="btn btn-ghost" data-clear-candidate-status>Clear status filter</button>' : ''}<input class="input" id="candidate-search" placeholder="Search candidates" />${user.role !== 'candidate' ? '<button class="btn btn-primary" data-open="add-candidate">+ Register candidate</button>' : ''}</div></div><div class="table-wrap mt-5"><table><thead><tr><th>Candidate</th><th>Stage</th><th>Job applied for</th><th>Country</th><th>Fees (KES)</th><th></th></tr></thead><tbody>${filtered.map(candidate => `<tr data-candidate-row="${candidate.id}" data-row="${candidate.name.toLowerCase()}"><td><strong>${candidate.name}</strong><span class="block text-[11px] text-slate-400">${candidate.passport}</span></td><td>${candidateStageControl(user, candidate)}</td><td>${candidateJobs(candidate)}</td><td>${(candidate.applications || []).map(application => application.job?.country).filter(Boolean).join(', ') || '—'}</td><td><strong>${money(candidate.commissionTotal || candidate.agreedFee)}</strong><span class="block text-[11px] text-slate-400">Paid ${money(candidate.paidAmount)} · Due ${money(candidate.dueAmount)}</span></td><td><button class="btn btn-ghost" data-candidate="${candidate.id}">Details</button></td></tr>`).join('') || `<tr><td colspan="6">No candidates in this status.</td></tr>`}</tbody></table></div></div>`;
}
function financePageV2(user, transactions) { const canApprove = ['super_admin', 'super_finance', 'branch_finance'].includes(user.role); return `<div class="card p-5"><div class="flex items-center justify-between"><div><h2 class="display text-lg font-bold">${user.role === 'super_finance' ? 'Finance Global' : 'Branch ledger'}</h2><p class="mt-1 text-xs text-slate-500">Receipts update Commission Total paid · refunds reverse it · other transactions are listed separately.</p></div><button class="btn btn-primary" data-open="new-transaction">+ Record payment</button></div><div class="table-wrap mt-5"><table><thead><tr><th>Applicant</th><th>Type</th><th>Branch</th><th>Amount (KES)</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${transactions.map(item => `<tr><td><strong>${item.candidate?.name || item.party}</strong><span class="block text-[11px] text-slate-400">${item.candidate?.passport || 'Unlinked'}</span></td><td>${escapeHtml(item.type)}${item.otherDescription ? `<span class="block text-[11px] text-slate-500">${escapeHtml(item.otherDescription)}</span>` : ''}</td><td>${branchName(item.branchId)}</td><td class="font-bold">${money(item.amountKes)}<span class="block text-[11px] text-slate-400">${item.currency} ${money(item.amount)} · ×${item.exchangeRate}</span></td><td>${badge(item.status)}</td><td>${item.date}</td><td>${canApprove && /pending/i.test(item.status) ? `<button class="btn btn-ghost" data-approve="${item.id}">Approve</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`; }
function passportsPage(user) { const canReceive = ['super_admin', 'branch_staff'].includes(user.role); const canUpdate = canReceive; const statusLabels = { In_Storage: 'In storage', Released_To_Candidate: 'Released to candidate', Released_To_Embassy: 'Released to embassy', Returned_To_Office: 'Returned to office' }; return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">Physical passport inventory</h2><p class="mt-1 text-xs text-slate-500">${user.branchId ? `Branch custody register · ${branchName(user.branchId)}` : 'Agency-wide custody register'}</p></div>${canReceive ? '<button class="btn btn-primary" data-open="receive-passport">+ Receive passport</button>' : ''}</div><div class="table-wrap mt-5"><table><thead><tr><th>Candidate</th><th>Passport number</th>${user.role === 'super_admin' || user.role === 'super_finance' ? '<th>Branch</th>' : ''}<th>Received</th><th>Received by</th><th>Storage location</th><th>Custody status</th><th></th></tr></thead><tbody>${store.data.passports.map(record => `<tr><td><strong>${record.candidate?.name || 'Candidate'}</strong><span class="block text-[11px] text-slate-400">${record.candidate?.phone || ''}</span></td><td>${record.candidate?.passport || '—'}</td>${user.role === 'super_admin' || user.role === 'super_finance' ? `<td>${record.branch?.name || branchName(record.branchId)}</td>` : ''}<td>${new Date(record.receivedAt).toLocaleString()}</td><td>${record.receivedBy?.name || '—'}</td><td>${record.storageLocation || 'Not recorded'}</td><td>${canUpdate ? `<select class="select passport-status-select" data-passport-id="${record.id}" data-current="${record.status}">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${record.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select>` : badge(statusLabels[record.status] || record.status)}</td><td>${record.notes || ''}</td></tr>`).join('') || `<tr><td colspan="8" class="py-8 text-center text-sm text-slate-500">No physical passports have been checked into this inventory yet.</td></tr>`}</tbody></table></div></div>`; }
function overviewPage(user, candidates, transactions) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const placements = store.data.applications.filter(item => item.status === 'Selected' && new Date(item.updatedAt || item.createdAt || item.date) >= monthStart).length;
  const currentCandidate = user.role === 'candidate' ? candidates.find(item => item.id === user.candidateId) : null;
  const cards = user.role === 'candidate'
    ? [['Application stage', currentCandidate?.status || 'Application', 'current status'], ['Documents', `${currentCandidate?.docs || 0} of 6`, 'uploaded'], ['Next action', currentCandidate?.status === 'Deployed' ? 'Complete' : 'Contact your branch', 'application support']]
    : [['Active candidates', candidates.length, user.branchId ? `${branchName(user.branchId)} office` : 'Across all offices'], ['Open job orders', store.data.jobs.filter(item => item.status === 'Open').length, 'global pool'], ['Placements this month', placements, `${new Date().toLocaleDateString('en-US', { month: 'long' })} to date`], ['Pending finance', money(transactions.filter(item => /pending/i.test(item.status)).reduce((sum, item) => sum + Number(item.amountKes ?? item.amount), 0)), user.role === 'branch_finance' ? 'branch ledger' : user.branchId ? `${branchName(user.branchId)} ledger` : 'all branches']];
  const workflowPulse = [
    ['Document verification', candidates.filter(item => item.status === 'Document Verification').length, 'amber'],
    ['Interview', candidates.filter(item => item.status === 'Interview').length, 'green'],
    ['Visa processing', candidates.filter(item => item.status === 'Visa Processing').length, 'blue']
  ];
  return `<section class="grid gap-4 ${cards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}">${cards.map(([label, value, note]) => `<div class="card metric-card"><p class="text-xs font-bold uppercase tracking-[.12em] text-slate-400">${label}</p><p class="display mt-5 text-2xl font-bold">${value}</p><p class="mt-2 text-xs text-teal-700">${note}</p></div>`).join('')}</section><section class="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div class="card p-5"><div class="flex items-center justify-between"><div><h2 class="display text-lg font-bold">Recent candidate movement</h2><p class="mt-1 text-xs text-slate-500">${user.branchId ? `${branchName(user.branchId)} branch activity` : 'Live activity across ROMS'}</p></div><button class="btn btn-ghost" data-nav="candidates">View all</button></div><div class="table-wrap mt-5"><table><thead><tr><th>Candidate</th><th>Stage</th><th>Branch</th><th></th></tr></thead><tbody>${candidates.slice(0, 4).map(candidate => `<tr><td><strong>${escapeHtml(candidate.name)}</strong><span class="block text-[11px] text-slate-400">${escapeHtml(candidate.passport)}</span></td><td>${badge(escapeHtml(candidate.status))}</td><td>${escapeHtml(branchName(candidate.branchId))}</td><td><button class="text-xs font-bold text-teal-700" data-candidate="${candidate.id}">Open →</button></td></tr>`).join('')}</tbody></table></div></div><div class="card overflow-hidden"><div class="bg-teal-800 p-5 text-white"><p class="text-xs uppercase tracking-[.15em] text-teal-200">Workflow pulse</p><h2 class="display mt-2 text-xl font-bold">Live stage counts</h2></div><div class="space-y-4 p-5">${workflowPulse.map(([label, count, tone]) => `<div class="flex items-center justify-between"><span class="text-sm font-semibold">${label}</span><span class="badge badge-${tone}">${count}</span></div>`).join('')}</div></div></section>`;
}
function candidatesPage(user, candidates) { return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">${user.role === 'candidate' ? 'My application' : 'Candidate registry'}</h2><p class="mt-1 text-xs text-slate-500">${user.branchId ? `Restricted to ${branchName(user.branchId)} registrations` : 'Global view with branch visibility'}</p></div><div class="flex gap-2"><input class="input" id="candidate-search" placeholder="Search candidates" /><button class="btn btn-primary" data-open="add-candidate">+ Register candidate</button></div></div><div class="table-wrap mt-5"><table id="candidate-table"><thead><tr><th>Candidate</th><th>Branch</th><th>Stage</th><th>Fees</th><th>Registered</th><th></th></tr></thead><tbody>${candidates.map(candidate => `<tr data-row="${candidate.name.toLowerCase()}"><td><strong>${candidate.name}</strong><span class="block text-[11px] text-slate-400">${candidate.passport}</span></td><td>${branchName(candidate.branchId)}</td><td>${badge(candidate.status)}</td><td><strong>${money(candidate.paidAmount)}</strong><span class="block text-[11px] text-slate-400">Due ${money(candidate.dueAmount)}</span></td><td>${candidate.submitted}</td><td><button class="btn btn-ghost" data-candidate="${candidate.id}">Edit</button><button class="btn btn-ghost ml-1" data-assign="${candidate.id}">Assign</button></td></tr>`).join('')}</tbody></table></div></div>`; }
function jobsPage() { return `<div class="card p-5"><div class="flex items-center justify-between"><div><h2 class="display text-lg font-bold">Global job orders</h2><p class="mt-1 text-xs text-slate-500">Select a job order to start an application</p></div><button class="btn btn-primary" data-open="new-job">+ New job order</button></div><div class="mt-5 grid gap-4 md:grid-cols-3">${store.data.jobs.map(job => `<article class="job-order-card rounded-xl border border-stone-200 p-4" tabindex="0" role="link" data-open-application="${job.id}"><div class="flex items-start justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Legacy order'} · ${job.country}</span></div><h3 class="display mt-5 font-bold">${job.title}</h3><p class="mt-1 text-xs text-slate-500">${job.employer} · ${job.location || 'Location pending'}</p><div class="mt-5 flex justify-between text-xs"><span>${job.filled} / ${job.openings} filled</span><strong class="text-teal-700">${job.openings - job.filled} open</strong></div><p class="mt-2 text-xs text-slate-500">${job.currency || ''} ${job.minimumSalary || 0} - ${job.maximumSalary || 0} · ${job.contractDurationMonths || 0} months</p><div class="mt-2 h-1.5 rounded-full bg-stone-100"><div class="h-full rounded-full bg-teal-700" style="width:${Math.min(100, job.filled / Math.max(1, job.openings) * 100)}%"></div></div><span class="btn btn-ghost mt-5 block w-full text-center">Start application →</span></article>`).join('')}</div></div>`; }
function jobsPageV2() { const countries = ['Qatar', 'Kuwait', 'UAE', 'Saudi', 'Oman', 'Bahrain', 'Europe', 'USA/ Canada/ UK']; const types = [...new Set(store.data.jobs.map(job => job.jobType).filter(Boolean))].sort(); return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">Global job orders</h2><p class="mt-1 text-xs text-slate-500">Filter by destination and job type. Select a job to start a new applicant application.</p></div><button class="btn btn-primary" data-open="new-job">+ New job order</button></div><div class="mt-5 grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold text-slate-500">Country<select id="jobs-country-filter" class="select mt-2 w-full"><option value="">All countries</option>${countries.map(country => `<option>${country}</option>`).join('')}</select></label><label class="text-xs font-bold text-slate-500">Job type<select id="jobs-type-filter" class="select mt-2 w-full"><option value="">All job types</option>${types.map(type => `<option>${type}</option>`).join('')}</select></label></div><div class="mt-5 grid gap-4 md:grid-cols-3">${store.data.jobs.map(job => `<article class="job-order-card rounded-xl border border-stone-200 p-4" data-job-card data-country="${job.country}" data-job-type="${job.jobType || 'Other'}" tabindex="0" role="link" data-open-application="${job.id}"><div class="flex items-start justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Legacy order'} · ${job.country}</span></div><h3 class="display mt-5 font-bold">${job.title}</h3><p class="mt-1 text-xs text-teal-800">${job.jobType || 'Other'}</p><p class="mt-1 text-xs text-slate-500">${job.employer} · ${job.location || 'Location pending'}</p><div class="mt-5 flex justify-between text-xs"><span>${job.filled} / ${job.openings} filled</span><strong class="text-teal-700">${job.openings - job.filled} open</strong></div><p class="mt-2 text-xs text-slate-500">${job.currency || ''} ${job.minimumSalary || 0} - ${job.maximumSalary || 0} · ${job.contractDurationMonths || 0} months</p><div class="mt-2 h-1.5 rounded-full bg-stone-100"><div class="h-full rounded-full bg-teal-700" style="width:${Math.min(100, job.filled / Math.max(1, job.openings) * 100)}%"></div></div><span class="btn btn-ghost mt-5 block w-full text-center">Start application →</span></article>`).join('')}</div></div>`; }
let jobBrowseMode = 'country';
let selectedJobBrowseValue = '';
const jobDestinations = ['Qatar', 'Kuwait', 'UAE', 'Saudi', 'Oman', 'Bahrain', 'Europe', 'USA/ Canada/ UK'];
const jobTypeOptions = ['Security', 'Cleaners', 'Warehouse', 'Nurses', 'Care & Healthcare', 'Construction', 'Hospitality', 'Domestic Work', 'Manufacturing', 'Agriculture', 'Driving & Transport', 'Other'];

function jobsBrowsePage(user) {
  const jobs = store.data.jobs;
  const countries = [...new Set([...jobDestinations, ...jobs.map(job => job.country).filter(country => country && !jobDestinations.includes(country))])];
  const types = [...new Set([...jobTypeOptions, ...jobs.map(job => job.jobType || 'Other')])];
  if (jobBrowseMode === 'type' && selectedJobBrowseValue) {
    const selectedJobs = jobs.filter(job => job.status === 'Open' && (job.jobType || 'Other') === selectedJobBrowseValue);
    return `<section class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><button class="btn btn-ghost" data-type-list>← All job types</button><h2 class="display mt-3 text-xl font-bold">${selectedJobBrowseValue}</h2><p class="mt-1 text-xs text-slate-500">Available in ${[...new Set(selectedJobs.map(job => job.country))].join(', ') || 'no destinations yet'}</p></div><label class="text-xs font-bold text-slate-500">Go to job type<select id="type-page-select" class="select mt-2 w-full">${types.map(type => `<option ${type === selectedJobBrowseValue ? 'selected' : ''}>${type}</option>`).join('')}</select></label></div>${selectedJobs.length ? `<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${selectedJobs.map(job => `<button type="button" class="job-order-card compact-job-card text-left" data-open-application="${job.id}"><span class="flex items-center justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Job order'}</span></span><strong class="display mt-4 block">${job.title}</strong><span class="mt-1 block text-xs text-slate-500">${job.employer} · ${job.location}, ${job.country}</span><span class="mt-2 block text-xs text-slate-500">${job.headcountRequired || job.openings} positions · ${job.contractDurationMonths} months</span><span class="mt-2 block text-xs font-bold text-teal-800">Tap job card to apply</span></button>`).join('')}</div>` : '<p class="mt-5 rounded-lg bg-stone-50 p-5 text-sm text-slate-500">There are no open job orders for this type yet.</p>'}</section>`;
  }
  if (jobBrowseMode === 'country' && selectedJobBrowseValue) {
    const selectedJobs = jobs.filter(job => job.status === 'Open' && job.country === selectedJobBrowseValue);
    return `<section class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><button class="btn btn-ghost" data-country-list>← All destinations</button><h2 class="display mt-3 text-xl font-bold">${selectedJobBrowseValue}</h2><p class="mt-1 text-xs text-slate-500">${selectedJobs.length} open ${selectedJobs.length === 1 ? 'job order' : 'job orders'}</p></div><label class="text-xs font-bold text-slate-500">Go to country<select id="country-page-select" class="select mt-2 w-full">${countries.map(country => `<option ${country === selectedJobBrowseValue ? 'selected' : ''}>${country}</option>`).join('')}</select></label></div>${selectedJobs.length ? `<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${selectedJobs.map(job => `<button type="button" class="job-order-card compact-job-card text-left" data-open-application="${job.id}"><span class="flex items-center justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Job order'}</span></span><strong class="display mt-4 block">${job.title}</strong><span class="mt-1 block text-xs font-semibold text-teal-800">${job.jobType || 'Other'}</span><span class="mt-1 block text-xs text-slate-500">${job.employer} · ${job.location}, ${job.country}</span><span class="mt-2 block text-xs text-slate-500">${job.headcountRequired || job.openings} positions · ${job.contractDurationMonths} months</span><span class="mt-2 block text-xs font-bold text-teal-800">Tap job card to apply</span></button>`).join('')}</div>` : '<p class="mt-5 rounded-lg bg-stone-50 p-5 text-sm text-slate-500">There are no open jobs for this destination yet.</p>'}</section>`;
  }
  const selectedJobs = selectedJobBrowseValue
    ? jobs.filter(job => job.status === 'Open' && (jobBrowseMode === 'country' ? job.country === selectedJobBrowseValue : (job.jobType || 'Other') === selectedJobBrowseValue))
    : [];
  const cards = jobBrowseMode === 'country'
    ? countries.map(country => {
      const matches = jobs.filter(job => job.country === country && job.status === 'Open');
      return `<button type="button" class="browse-card ${selectedJobBrowseValue === country ? 'selected' : ''}" data-browse-value="${country}"><span class="browse-card-title">${country}</span><span class="browse-card-count">${matches.length} open ${matches.length === 1 ? 'job' : 'jobs'}</span><span class="browse-card-preview">${matches.slice(0, 3).map(job => job.title).join(' · ') || 'No open listings yet'}</span></button>`;
    }).join('')
    : types.map(type => {
      const matches = jobs.filter(job => job.status === 'Open' && (job.jobType || 'Other') === type);
      const countries = [...new Set(matches.map(job => job.country))];
      return `<button type="button" class="browse-card ${selectedJobBrowseValue === type ? 'selected' : ''}" data-browse-value="${type}"><span class="browse-card-title">${type}</span><span class="browse-card-count">${matches.length} open ${matches.length === 1 ? 'job' : 'jobs'}</span><span class="browse-card-preview">${countries.join(' · ') || 'No open listings yet'}</span></button>`;
    }).join('');
  const heading = jobBrowseMode === 'country' ? selectedJobBrowseValue : selectedJobBrowseValue;
  return `<section class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">Global job orders</h2><p class="mt-1 text-xs text-slate-500">Browse by destination or job type, then select an open role to register a new applicant.</p></div><button class="btn btn-primary" data-open="new-job">+ New job order</button></div><div class="browse-mode mt-5" role="tablist" aria-label="Browse job orders"><button type="button" class="${jobBrowseMode === 'country' ? 'active' : ''}" data-browse-mode="country">By country</button><button type="button" class="${jobBrowseMode === 'type' ? 'active' : ''}" data-browse-mode="type">By job type</button></div><div class="browse-card-grid mt-4">${cards}</div></section>${selectedJobBrowseValue ? `<section class="mt-6"><div class="mb-3 flex items-center justify-between"><div><h2 class="display text-lg font-bold">${heading}</h2><p class="text-xs text-slate-500">${selectedJobs.length} matching open ${selectedJobs.length === 1 ? 'position' : 'positions'}</p></div><button class="btn btn-ghost" data-clear-job-browse>Clear selection</button></div>${selectedJobs.length ? `<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">${selectedJobs.map(job => `<button type="button" class="job-order-card text-left" data-open-application="${job.id}"><span class="flex items-center justify-between">${badge(job.status)}<span class="text-xs text-slate-400">${job.reference || 'Job order'}</span></span><strong class="display mt-4 block">${job.title}</strong><span class="mt-1 block text-xs font-semibold text-teal-800">${job.jobType || 'Other'}</span><span class="mt-1 block text-xs text-slate-500">${job.employer} · ${job.location}, ${job.country}</span><span class="mt-3 block text-xs text-slate-500">${job.headcountRequired || job.openings} positions · ${job.contractDurationMonths} months</span><span class="mt-4 block text-sm font-bold text-teal-800">Select job and apply →</span></button>`).join('')}</div>` : '<div class="card p-5 text-sm text-slate-500">There are no open job orders in this selection yet.</div>'}</section>` : '<p class="mt-4 text-xs text-slate-500">Choose a card to view the matching job orders.</p>'}`;
}

function applicationsPage(user, _candidates, selectedJobId) {
  const job = store.data.jobs.find(item => item.id === selectedJobId && item.status === 'Open');
  if (!job) return `<div class="card max-w-3xl p-5"><h2 class="display text-lg font-bold">New applicant application</h2><p class="mt-2 text-sm text-slate-500">Select an open job order first.</p><button class="btn btn-primary mt-5" data-nav="jobs">Browse job orders</button></div>`;
  const officeControl = user.role === 'super_admin'
    ? `<label class="block text-xs font-bold text-slate-500">Office location *<select name="branchId" id="application-branch" class="select mt-2 w-full" required><option value="">Select office</option>${store.data.branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}</select></label>`
    : `<input type="hidden" name="branchId" id="application-branch" value="${user.branchId || ''}" />`;
  return `<div class="card max-w-4xl p-5"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wide text-teal-700">New applicant</p><h2 class="display mt-1 text-xl font-bold">Apply for ${job.title}</h2><p class="mt-1 text-sm text-slate-500">${job.reference || ''} · ${job.employer} · ${job.location}, ${job.country}</p></div><button type="button" class="btn btn-ghost" data-nav="jobs">← Job orders</button></div><form id="new-application-form" class="mt-6 space-y-6"><input type="hidden" name="jobId" value="${job.id}" /><fieldset><legend class="display text-sm font-bold">Personal information</legend><div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input name="firstName" class="input" placeholder="First name *" required /><input name="middleName" class="input" placeholder="Middle name" /><input name="lastName" class="input" placeholder="Last name *" required /><label class="text-xs font-bold text-slate-500">Date of birth *<input name="dateOfBirth" class="input mt-2 w-full" type="date" required /></label><select name="gender" class="select" required><option value="">Gender *</option><option>Male</option><option>Female</option></select><select name="maritalStatus" class="select" required><option value="">Marital status *</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select><input name="weightKg" class="input" type="number" min="1" step="0.1" placeholder="Weight (kg)" /><input name="heightFt" class="input" type="number" min="1" step="0.1" placeholder="Height (ft)" /></div></fieldset><fieldset><legend class="display text-sm font-bold">Identification</legend><div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input name="passport" class="input" placeholder="Passport number *" required /><label class="text-xs font-bold text-slate-500">Passport expiry<input name="passportExpiry" class="input mt-2 w-full" type="date" /></label><input name="nationalId" class="input" placeholder="National ID" /><input name="nationality" class="input" placeholder="Nationality" /></div></fieldset><fieldset><legend class="display text-sm font-bold">Contact information</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input name="email" class="input" type="email" placeholder="Email *" required /><input name="phone" class="input" type="tel" placeholder="Phone number *" required /><input name="alternatePhone" class="input" type="tel" placeholder="Alternate phone" /><textarea name="address" class="input sm:col-span-2" placeholder="Address"></textarea></div></fieldset><fieldset><legend class="display text-sm font-bold">Registration</legend><div class="mt-3 grid gap-3 sm:grid-cols-2">${officeControl}<select name="registeredBy" class="select" required><option value="">Registered by *</option><option>Rabiya</option><option>Self</option><option>Sub-Agent</option></select><input name="subAgentName" class="input sm:col-span-2" placeholder="Sub-agent name (required when selected)" /></div></fieldset><div class="rounded-lg bg-stone-50 p-4"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Selected job order</p><p class="mt-2 font-bold">${job.reference || ''} · ${job.title}</p><p class="text-sm text-slate-500">${job.location}, ${job.country} · ${job.contractDurationMonths} months</p></div><button class="btn btn-primary w-full" type="submit">Register applicant and submit application</button></form></div>`;
}
function financePage(user, transactions) { return `<div class="card p-5"><div class="flex items-center justify-between"><div><h2 class="display text-lg font-bold">${user.role === 'super_finance' ? 'Agency finance' : 'Branch ledger'}</h2><p class="mt-1 text-xs text-slate-500">${user.role === 'super_finance' ? 'Consolidated view across all branch offices' : `Transactions for ${branchName(user.branchId)}`}</p></div><button class="btn btn-primary" data-open="new-transaction">+ Record payment</button></div><div class="table-wrap mt-5"><table><thead><tr><th>Party</th><th>Type</th><th>Branch</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${transactions.map(item => `<tr><td><strong>${item.party}</strong></td><td>${item.type}</td><td>${branchName(item.branchId)}</td><td class="font-bold">${money(item.amount)}</td><td>${badge(item.status)}</td><td>${item.date}</td><td>${/pending/i.test(item.status) ? `<button class="btn btn-ghost" data-approve="${item.id}">Approve</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`; }
function usersPage(currentUser) {
  const branchAdmin = currentUser.role === 'branch_admin';
  const canManage = currentUser.role === 'super_admin';
  const title = branchAdmin ? 'Branch users' : 'System users';
  const scope = branchAdmin ? `Read-only accounts in ${branchName(currentUser.branchId)} branch` : 'Manage roles, branches, and account access';
  return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">${title}</h2><p class="mt-1 text-xs text-slate-500">${scope}</p></div>${canManage ? '<button class="btn btn-primary" data-open="new-user">+ Add user</button>' : ''}</div><div class="table-wrap mt-5"><table><thead><tr><th>User</th><th>Function</th><th>Branch</th><th>Status</th><th></th></tr></thead><tbody>${store.data.users.map(user => `<tr><td><strong>${escapeHtml(user.name)}</strong><span class="block text-[11px] text-slate-400">${escapeHtml(user.email)}</span></td><td>${roleLabels[user.role]}</td><td>${branchName(user.branchId)}</td><td>${badge(user.active === false ? 'Inactive' : 'Active')}</td><td>${canManage ? `<button class="btn btn-ghost" data-edit-user="${user.id}">Edit</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function auditPage() { return `<div class="card p-5"><div><h2 class="display text-lg font-bold">Audit log</h2><p class="mt-1 text-xs text-slate-500">Super Admin view · immutable action history</p></div><div class="table-wrap mt-5"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${store.data.auditLogs.map(log => `<tr><td class="whitespace-nowrap">${new Date(log.createdAt).toLocaleString()}</td><td><strong>${log.actor?.name || log.actorName || 'System'}</strong><span class="block text-[11px] text-slate-400">${log.actor?.email || log.actorEmail || ''}</span></td><td>${badge(log.action)}</td><td>${log.entity}${log.entityId ? ` · ${log.entityId}` : ''}</td><td><code class="text-[11px]">${JSON.stringify(log.metadata || {})}</code></td></tr>`).join('')}</tbody></table></div></div>`; }
function branchesPage() { return `<div class="card p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="display text-lg font-bold">Branch offices</h2><p class="mt-1 text-xs text-slate-500">Global branch performance overview</p></div><div class="flex gap-2"><button class="btn btn-ghost" data-nav="users">System users</button><button class="btn btn-ghost" data-open="new-user">+ Add system user</button><button class="btn btn-primary" data-open="new-branch">+ Add branch</button></div></div><div class="mt-5 grid gap-4 md:grid-cols-3">${store.data.branches.map(branch => `<article class="rounded-xl border border-stone-200 p-5"><div class="flex items-center justify-between"><span class="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white" style="background:${branch.accent}">${branch.code}</span><span class="text-xs text-slate-400">${branch.staff || 0} staff</span></div><h3 class="display mt-5 font-bold">${branch.name}</h3><div class="mt-5 grid grid-cols-2 gap-3 text-xs"><div><strong class="block text-lg">${branch.activeCandidates || 0}</strong><span class="text-slate-500">Active candidates</span></div><div><strong class="block text-lg">${branch.deployed || 0}</strong><span class="text-slate-500">Deployed</span></div><div><strong class="block text-lg">${branch._count?.candidates || 0}</strong><span class="text-slate-500">Total candidates</span></div><div><strong class="block text-lg">${money(branch.totalRevenue || 0)}</strong><span class="text-slate-500">Revenue</span></div></div><button class="btn btn-ghost mt-5 w-full" data-nav="candidates">Open branch candidates →</button></article>`).join('')}</div></div>`; }
function backupsPage() { return `<section class="card max-w-3xl p-5"><div><h2 class="display text-lg font-bold">Backups and restore</h2><p class="mt-1 text-sm text-slate-500">Create an encrypted Drive backup or restore a paired database and documents snapshot.</p></div><div class="mt-5 flex flex-wrap items-center gap-3"><button class="btn btn-primary" id="backup-now">Back up to Google Drive</button><span id="backup-run-status" class="text-xs text-slate-500" role="status">Checking backup service…</span></div><div class="mt-6 border-t border-stone-200 pt-5"><label class="block text-xs font-bold text-slate-600">Available snapshots<select id="backup-snapshot" class="select mt-2 w-full"><option value="">Loading backups…</option></select></label><label class="mt-4 block text-xs font-bold text-slate-600">Type RESTORE ROMS to enable restore<input id="backup-restore-confirmation" class="input mt-2 w-full" autocomplete="off" placeholder="RESTORE ROMS" /></label><button class="btn btn-coral mt-4 w-full" id="restore-backup" type="button" disabled>Restore selected snapshot</button><p class="mt-3 text-xs leading-5 text-slate-500">Restore replaces the live database and uploaded documents. A pre-restore safety copy is created first, and the API restarts during the operation.</p></div></section>`; }
function documentsPage(user) { const candidate = store.data.candidates.find(item => item.id === user.candidateId); return `<div class="card p-6"><h2 class="display text-xl font-bold">Your deployment file</h2><p class="mt-2 text-sm text-slate-500">Keep your documents current as your application moves forward.</p><div class="mt-7 space-y-3">${['Passport bio page', 'Police clearance', 'Medical certificate', 'Employment contract', 'Visa submission'].map((item, index) => `<div class="flex items-center justify-between rounded-xl border border-stone-200 p-4"><span class="text-sm font-semibold">${item}</span><span>${index < (candidate?.docs || 0) ? badge('Uploaded') : `<button class="btn btn-ghost">Upload</button>`}</span></div>`).join('')}</div></div>`; }

function openWorkflowEditor(id) {
  const candidate = store.data.candidates.find(item => item.id === id);
  if (!candidate) return;
  const stages = [
    ['Application', '1. Application / physical passport submission'],
    ['Document_Verification', '2. Document verification'],
    ['Interview', '3. Interview'],
    ['Offer_Contract', '4. Offer and contract'],
    ['Commission_Processing', '5. Commission processing'],
    ['Visa_Processing', '6. Visa processing'],
    ['Visa_Approved', '7. Visa approval'],
    ['Balance_Payment', '8. Balance payment'],
    ['Ticketing', '9. Ticketing'],
    ['Deployed', '10. Deployment']
  ];
  const current = stages.find(([value, label]) => label.toLowerCase().includes(candidate.status.toLowerCase()) || value.replaceAll('_', ' ') === candidate.status)?.[0] || 'Application';
  const element = modal('Application workflow', `<div class="space-y-5"><div><strong class="display">${candidate.name}</strong><p class="text-xs text-slate-500">Stages must be completed in order.</p></div><label class="block text-xs font-bold text-slate-500">Current / next stage<select id="workflow-status" class="select mt-2 w-full">${stages.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('')}</select></label><fieldset class="space-y-3"><legend class="display text-sm font-bold">Stage evidence</legend><label class="flex gap-2 text-sm"><input id="workflow-passport-received" type="checkbox" ${candidate.physicalPassportReceived ? 'checked' : ''} /><span>Physical passport received at branch</span></label><label class="flex gap-2 text-sm"><input id="workflow-documents-verified" type="checkbox" ${candidate.documentsVerified ? 'checked' : ''} /><span>Required identification and job-specific documents verified</span></label><div class="grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold text-slate-500">Interview date<input id="workflow-interview-date" type="date" class="input mt-2 w-full" value="${candidate.interviewDate?.slice(0, 10) || ''}" /></label><label class="text-xs font-bold text-slate-500">Interview result<select id="workflow-interview-result" class="select mt-2 w-full"><option value="">Not completed</option><option value="Passed" ${candidate.interviewOutcome === 'Passed' ? 'selected' : ''}>Passed</option><option value="Failed" ${candidate.interviewOutcome === 'Failed' ? 'selected' : ''}>Failed</option></select></label></div><label class="flex gap-2 text-sm"><input id="workflow-offer-issued" type="checkbox" ${candidate.offerIssued ? 'checked' : ''} /><span>Offer and contract issued</span></label><label class="flex gap-2 text-sm"><input id="workflow-offer-signed" type="checkbox" ${candidate.offerSigned ? 'checked' : ''} /><span>Offer and contract signed</span></label></fieldset><p class="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Passport, verified documents, passed interview, signed contract, and cleared balance are required at their respective transitions.</p><button class="btn btn-primary w-full" id="workflow-save">Save and advance</button></div>`);
  element.querySelector('#workflow-save').onclick = async () => {
    try {
      await store.updateCandidate(candidate.id, {
        status: element.querySelector('#workflow-status').value,
        physicalPassportReceived: element.querySelector('#workflow-passport-received').checked,
        documentsVerified: element.querySelector('#workflow-documents-verified').checked,
        interviewDate: element.querySelector('#workflow-interview-date').value || null,
        interviewOutcome: element.querySelector('#workflow-interview-result').value || null,
        offerIssued: element.querySelector('#workflow-offer-issued').checked,
        offerSigned: element.querySelector('#workflow-offer-signed').checked
      });
      element.remove(); showToast('Workflow updated.');
    } catch (error) { showToast(error.message || 'Could not advance workflow.'); }
  };
}

function openCommissionEditor(id) {
  const candidate = store.data.candidates.find(item => item.id === id);
  if (!candidate) return;
  const costs = [
    ['visaFee', 'Visa fee'], ['medicalFee', 'Medical fee'],
    ['foreignAffairsAttestationFee', 'Foreign Affairs attestation'], ['kmpduMedicalFee', 'KMPDU medical'],
    ['embassyAttestationFee', 'Embassy attestation'], ['airTicketFee', 'Air ticket']
  ];
  const commissionTotal = Number(candidate.commissionTotal || candidate.agreedFee || 0);
  const content = `<div class="space-y-4"><div><strong class="display">${candidate.name}</strong><p class="text-xs text-slate-500">Client payable breakdown · all amounts in KES</p></div><label class="block text-xs font-bold text-slate-500">Commission Total (KES)<input id="commission-total" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${commissionTotal}" /></label><div class="grid gap-3 sm:grid-cols-2">${costs.map(([field, label]) => `<label class="text-xs font-bold text-slate-500">${label}<input data-commission-cost="${field}" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${Number(candidate[field] || 0)}" /></label>`).join('')}</div><div class="rounded-lg bg-teal-50 p-4 text-sm">Office Fee <strong id="office-fee" class="float-right">${money(candidate.officeFee || 0)}</strong><p class="mt-1 text-xs text-slate-500">Automatically calculated as Commission Total minus visa, medical, attestations, and ticket.</p></div><p id="commission-error" class="hidden rounded-lg bg-red-50 p-3 text-xs text-red-700"></p><button class="btn btn-primary w-full" id="commission-save">Save Commission Total</button></div>`;
  const element = modal('Client Commission Total', content);
  const totalInput = element.querySelector('#commission-total');
  const costInputs = [...element.querySelectorAll('[data-commission-cost]')];
  const officeTarget = element.querySelector('#office-fee');
  const errorTarget = element.querySelector('#commission-error');
  const updateOfficeFee = () => {
    const total = Number(totalInput.value || 0);
    const sum = costInputs.reduce((acc, input) => acc + Number(input.value || 0), 0);
    const officeFee = total - sum;
    officeTarget.textContent = money(officeFee);
    errorTarget.textContent = officeFee < 0 ? 'The listed costs cannot exceed Commission Total.' : '';
    errorTarget.classList.toggle('hidden', officeFee >= 0);
  };
  totalInput.addEventListener('input', updateOfficeFee);
  costInputs.forEach(input => input.addEventListener('input', updateOfficeFee));
  element.querySelector('#commission-save').onclick = async () => {
    updateOfficeFee();
    if (Number(totalInput.value) < 0 || costInputs.some(input => Number(input.value || 0) < 0) || Number(totalInput.value) < costInputs.reduce((sum, input) => sum + Number(input.value || 0), 0)) return;
    const values = Object.fromEntries(costInputs.map(input => [input.dataset.commissionCost, Number(input.value || 0)]));
    try {
      await store.updateCandidate(candidate.id, { commissionTotal: Number(totalInput.value || 0), ...values });
      element.remove(); openCandidateProfileTabbed(id, 'commission'); showToast('Commission Total and Office Fee saved.');
    } catch (error) { showToast(error.message || 'Could not save Commission Total.'); }
  };
}

function wireActions() {
  document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => { window.location.hash = button.dataset.nav; }));
  document.querySelectorAll('[data-candidate-status]').forEach(button => button.addEventListener('click', () => { window.location.hash = `candidates?status=${encodeURIComponent(button.dataset.candidateStatus)}`; }));
  document.querySelector('[data-clear-candidate-status]')?.addEventListener('click', () => { window.location.hash = 'candidates'; });
  const backupButton = document.querySelector('#backup-now');
  if (backupButton) {
    const snapshotSelect = document.querySelector('#backup-snapshot');
    const confirmationInput = document.querySelector('#backup-restore-confirmation');
    const restoreButton = document.querySelector('#restore-backup');
    const status = document.querySelector('#backup-run-status');
    const refreshSnapshots = async () => {
      try {
        const result = await store.listBackups();
        snapshotSelect.innerHTML = result.snapshots.length
          ? `<option value="">Select a database and documents snapshot</option>${result.snapshots.map(snapshot => `<option value="${snapshot}">${snapshot.replace('T', ' ').replace('Z', ' UTC')}</option>`).join('')}`
          : '<option value="">No complete Drive snapshots found</option>';
        const current = await store.backupStatus();
        status.textContent = current.running ? `Backup ${current.state}…` : current.result === 'success' ? 'Last backup completed successfully.' : 'Ready';
      } catch (error) {
        snapshotSelect.innerHTML = '<option value="">Drive backups unavailable</option>';
        status.textContent = error.message;
      }
      restoreButton.disabled = !(snapshotSelect.value && confirmationInput.value === 'RESTORE ROMS');
    };
    const updateRestoreEnabled = () => { restoreButton.disabled = !(snapshotSelect.value && confirmationInput.value === 'RESTORE ROMS'); };
    snapshotSelect.addEventListener('change', updateRestoreEnabled);
    confirmationInput.addEventListener('input', updateRestoreEnabled);
    backupButton.onclick = async () => {
      backupButton.disabled = true; status.textContent = 'Backup starting…';
      try {
        await store.startBackup();
        for (let attempt = 0; attempt < 60; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const current = await store.backupStatus();
          status.textContent = current.running ? 'Database and documents are being backed up…' : current.result === 'success' ? 'Backup completed successfully.' : 'Backup service stopped; check system logs.';
          if (!current.running) break;
        }
        await refreshSnapshots();
      } catch (error) { status.textContent = error.message; }
      finally { backupButton.disabled = false; }
    };
    restoreButton.onclick = async () => {
      if (!snapshotSelect.value || confirmationInput.value !== 'RESTORE ROMS') return;
      if (!window.confirm(`Restore snapshot ${snapshotSelect.value}? This replaces the live database and uploaded documents. A safety copy will be made first.`)) return;
      restoreButton.disabled = true; backupButton.disabled = true;
      status.textContent = 'Restore started. The API will restart; wait about a minute, then reload ROMS.';
      try { await store.restoreBackup(snapshotSelect.value, confirmationInput.value); }
      catch (error) { status.textContent = error.message; backupButton.disabled = false; await refreshSnapshots(); }
    };
    refreshSnapshots();
  }
  const filterCandidates = () => {
    const search = (app.querySelector('#candidate-search')?.value || '').trim().toLocaleLowerCase();
    const branch = app.querySelector('#candidate-branch-filter')?.value || '';
    let count = 0;
    app.querySelectorAll('[data-candidate-row]').forEach(row => {
      row.hidden = Boolean((branch && row.dataset.branch !== branch) || (search && !row.dataset.search?.includes(search)));
      if (!row.hidden) count++;
    });
    const empty = app.querySelector('#candidate-filter-empty');
    if (empty) empty.hidden = count > 0 || !app.querySelector('[data-candidate-row]');
  };
  app.querySelector('#candidate-search')?.addEventListener('input', filterCandidates);
  app.querySelector('#candidate-branch-filter')?.addEventListener('change', filterCandidates);
  document.querySelectorAll('[data-stage-candidate]').forEach(select => select.addEventListener('change', async () => {
    const previous = select.dataset.currentStage;
    try {
      await store.updateCandidate(select.dataset.stageCandidate, { status: select.value });
      showToast('Candidate stage updated.');
    } catch (error) {
      select.value = previous;
      showToast(error.message || 'Workflow update failed. Complete stage evidence before advancing.');
    }
  }));
  const filterJobs = () => { const country = document.querySelector('#jobs-country-filter')?.value || ''; const type = document.querySelector('#jobs-type-filter')?.value || ''; document.querySelectorAll('[data-job-card]').forEach(card => { card.hidden = Boolean((country && card.dataset.country !== country) || (type && card.dataset.jobType !== type)); }); };
  document.querySelector('#jobs-country-filter')?.addEventListener('change', filterJobs);
  document.querySelector('#jobs-type-filter')?.addEventListener('change', filterJobs);
  document.querySelectorAll('[data-browse-mode]').forEach(button => button.addEventListener('click', () => { jobBrowseMode = button.dataset.browseMode; selectedJobBrowseValue = ''; dashboardView(); }));
  document.querySelectorAll('[data-browse-value]').forEach(button => button.addEventListener('click', () => { selectedJobBrowseValue = button.dataset.browseValue; dashboardView(); }));
  document.querySelector('[data-clear-job-browse]')?.addEventListener('click', () => { selectedJobBrowseValue = ''; dashboardView(); });
  document.querySelector('[data-country-list]')?.addEventListener('click', () => { selectedJobBrowseValue = ''; dashboardView(); });
  document.querySelector('#country-page-select')?.addEventListener('change', event => { selectedJobBrowseValue = event.target.value; dashboardView(); });
  document.querySelector('[data-type-list]')?.addEventListener('click', () => { selectedJobBrowseValue = ''; dashboardView(); });
  document.querySelector('#type-page-select')?.addEventListener('change', event => { selectedJobBrowseValue = event.target.value; dashboardView(); });
  document.querySelectorAll('[data-approve]').forEach(button => button.addEventListener('click', async () => { await store.updateTransaction(button.dataset.approve, 'Paid'); showToast('Transaction approved and ledger updated.'); }));
  document.querySelectorAll('[data-passport-id]').forEach(select => select.addEventListener('change', async () => { const previous = select.dataset.current || select.value; try { await store.updatePassport(select.dataset.passportId, { status: select.value }); select.dataset.current = select.value; showToast('Passport custody status updated.'); } catch (error) { select.value = previous; showToast(error.message || 'Could not update passport status.'); } }));
  document.querySelectorAll('[data-candidate]').forEach(button => button.addEventListener('click', () => openCandidateProfileTabbed(button.dataset.candidate)));
  document.querySelectorAll('[data-workflow]').forEach(button => button.addEventListener('click', () => openWorkflowEditor(button.dataset.workflow)));
  document.querySelectorAll('[data-delete-candidate]').forEach(button => button.addEventListener('click', async () => {
    const candidate = store.data.candidates.find(item => item.id === button.dataset.deleteCandidate);
    if (!candidate) return;
    const transactionCount = store.data.transactions.filter(item => item.candidateId === candidate.id).length;
    if (transactionCount) return showToast('Delete this candidate’s transaction entries first.');
    if (!window.confirm(`Permanently delete ${candidate.name}? Their application links, documents, passport record, and candidate login will also be removed.`)) return;
    try { await store.deleteCandidate(candidate.id); showToast('Candidate deleted.'); }
    catch (error) { showToast(error.message || 'Could not delete candidate.'); }
  }));
  document.querySelectorAll('[data-delete-transaction]').forEach(button => button.addEventListener('click', async () => {
    const transaction = store.data.transactions.find(item => item.id === button.dataset.deleteTransaction);
    if (!transaction) return;
    const balanceEffect = transaction.status !== 'Paid' ? 'The candidate balance will not change.' : transaction.type === 'Refund' ? 'The candidate’s paid total will be restored.' : ['Receipt', 'Candidate fee', 'Agency commission'].includes(transaction.type) ? 'The candidate’s paid total will be reduced.' : 'The candidate commission balance will not change.';
    if (!window.confirm(`Delete the ${money(transaction.amountKes ?? transaction.amount)} ${transaction.type} for ${transaction.candidate?.name || transaction.party}? ${balanceEffect}`)) return;
    try { await store.deleteTransaction(transaction.id); showToast('Transaction deleted and candidate balance updated.'); }
    catch (error) { showToast(error.message || 'Could not delete transaction.'); }
  }));
  document.querySelectorAll('[data-delete-recruiter]').forEach(button => button.addEventListener('click', async () => {
    const recruiter = store.data.users.find(item => item.id === button.dataset.deleteRecruiter);
    if (!recruiter || !window.confirm(`Permanently delete recruiter ${recruiter.name} (${recruiter.email})? Audit history will be retained.`)) return;
    try { await store.deleteRecruiter(recruiter.id); showToast('Recruiter deleted.'); }
    catch (error) { showToast(error.message || 'Could not delete recruiter.'); }
  }));
  document.querySelectorAll('[data-approve-job]').forEach(button => button.addEventListener('click', async () => {
    const job = store.data.jobs.find(item => item.id === button.dataset.approveJob);
    if (!job || !window.confirm(`Approve ${job.reference || job.title} and publish it to applicants?`)) return;
    try { await store.approveJob(job.id); showToast('Job order approved and published.'); }
    catch (error) { showToast(error.message || 'Could not approve job order.'); }
  }));
  document.querySelectorAll('[data-edit-job]').forEach(button => button.addEventListener('click', () => openJobEditorModal(button.dataset.editJob)));
  document.querySelectorAll('[data-delete-job]').forEach(button => button.addEventListener('click', async () => {
    const job = store.data.jobs.find(item => item.id === button.dataset.deleteJob);
    if (!job) return;
    const applicationCount = store.data.applications.filter(item => item.jobId === job.id).length;
    if (!window.confirm(`Permanently delete ${job.reference || job.title} and its ${applicationCount} application link(s)? Candidate records will remain.`)) return;
    try { await store.deleteJob(job.id); showToast('Job order and its application links deleted.'); }
    catch (error) { showToast(error.message || 'Could not delete job order.'); }
  }));
  document.querySelectorAll('[data-assign], [data-assign-job]').forEach(button => button.addEventListener('click', () => openAssignModal(button.dataset.assign || null, button.dataset.assignJob || null)));
  document.querySelectorAll('[data-open-application]').forEach(card => {
    const open = () => { window.location.hash = `applications?jobId=${encodeURIComponent(card.dataset.openApplication)}`; };
    card.addEventListener('click', event => { if (card.tagName === 'BUTTON' || !event.target.closest('button')) open(); });
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
  document.querySelector('#new-application-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    if (values.registeredBy === 'Sub-Agent' && !values.subAgentName.trim()) return showToast('Enter the sub-agent name.');
    try {
      await store.addCandidate({ ...values, branchId: values.branchId || undefined, jobId: values.jobId });
      showToast('Applicant registered and application submitted.');
      window.location.hash = 'candidates';
    } catch (error) { showToast(error.message || 'Could not submit this application.'); }
  });
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openSimpleModal(button.dataset.open)));
  document.querySelectorAll('[data-edit-user]').forEach(button => button.addEventListener('click', () => openUserEditModal(button.dataset.editUser)));
  document.querySelectorAll('[data-reset-user]').forEach(button => button.addEventListener('click', async () => {
    const account = store.data.users.find(item => item.id === button.dataset.resetUser);
    if (!account || !window.confirm(`Issue a one-time password for ${account.name} (${account.username})? Their current sessions will be signed out.`)) return;
    try { showTemporaryCredential(await store.resetUserPassword(account.id)); }
    catch (error) { showToast(error.message || 'Could not reset this password.'); }
  }));
}
function modal(title, content) { const element = document.createElement('div'); element.className = 'modal-backdrop'; element.innerHTML = `<div class="modal-dialog"><div class="modal-header"><h2 class="display text-xl font-bold">${title}</h2><button type="button" class="modal-close" data-close aria-label="Close">×</button></div><div class="modal-body">${content}</div></div>`; if (title === 'Edit system user') { const passwordInput = element.querySelector('#edit-user-password'); if (passwordInput) { passwordInput.type = 'hidden'; passwordInput.value = ''; } const roleSelect = element.querySelector('#edit-user-role'); if (roleSelect) [...roleSelect.options].forEach(option => { const allowed = store.user?.role === 'branch_admin' ? ['branch_staff', 'branch_finance'].includes(option.value) : option.value !== 'candidate'; if (!allowed) option.remove(); }); if (store.user?.role === 'branch_admin') element.querySelector('#edit-user-branch')?.setAttribute('disabled', 'disabled'); } document.body.append(element); const close = () => element.remove(); element.querySelector('[data-close]').onclick = close; element.addEventListener('click', event => { if (event.target === element) close(); }); element._close = close; return element; }
function showTemporaryCredential(result) {
  const element = modal('Temporary sign-in', `<div class="space-y-4"><p id="credential-message" class="text-sm text-slate-600"></p><div><span class="text-xs text-slate-500">Username</span><strong id="credential-username" class="mt-1 block font-mono"></strong></div><div id="temporary-password-block"><span class="text-xs text-slate-500">One-time password</span><strong id="credential-password" class="mt-1 block break-all rounded-lg bg-stone-100 p-3 font-mono"></strong><button class="btn btn-ghost mt-2" type="button" id="copy-temporary-password">Copy password</button></div><p class="text-xs text-slate-500">The user must enter their registered email and choose a new password at first sign-in.</p></div>`);
  element.querySelector('#credential-username').textContent = result.username || '';
  element.querySelector('#credential-message').textContent = result.emailSent ? `A one-time password was sent to ${result.email || 'the registered email address'}. It expires in 24 hours.` : 'Email delivery is not configured. Share this one-time password securely; it expires in 24 hours.';
  if (result.temporaryPassword) element.querySelector('#credential-password').textContent = result.temporaryPassword;
  else element.querySelector('#temporary-password-block').remove();
  element.querySelector('#copy-temporary-password')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(result.temporaryPassword); showToast('One-time password copied.'); }
    catch { showToast('Could not copy the password.'); }
  });
}

function openChangePasswordModal() {
  const user = store.user;
  const element = modal('Change password', `<form id="change-password-form" class="space-y-4"><p class="text-sm text-slate-500">Confirm your username, registered email, and current password to change your password.</p><label class="block text-xs font-bold text-slate-600">Username<input class="input mt-2 w-full" name="username" autocomplete="username" value="${escapeHtml(user.username || '')}" required /></label><label class="block text-xs font-bold text-slate-600">Registered email<input class="input mt-2 w-full" name="email" type="email" autocomplete="email" value="${escapeHtml(user.email || '')}" required /></label><label class="block text-xs font-bold text-slate-600">Current password<input class="input mt-2 w-full" name="oldPassword" type="password" autocomplete="current-password" required /></label><label class="block text-xs font-bold text-slate-600">New password<input class="input mt-2 w-full" name="password" type="password" autocomplete="new-password" minlength="10" required /></label><label class="block text-xs font-bold text-slate-600">Confirm new password<input class="input mt-2 w-full" name="confirmPassword" type="password" autocomplete="new-password" minlength="10" required /></label><p class="text-xs text-slate-500">Use at least 10 characters with letters and numbers.</p><p id="change-password-error" class="hidden rounded-lg bg-red-50 p-3 text-xs text-red-700"></p><button class="btn btn-primary w-full" type="submit">Change password</button></form>`);
  element.querySelector('#change-password-form').onsubmit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const error = element.querySelector('#change-password-error');
    const button = event.currentTarget.querySelector('[type="submit"]');
    if (values.password !== values.confirmPassword) { error.textContent = 'The new passwords do not match.'; error.classList.remove('hidden'); return; }
    button.disabled = true;
    try {
      await store.changePassword(values);
      element.remove(); await store.logout(); window.location.hash = 'login'; showToast('Password changed. Sign in with your new password.');
    } catch (failure) { error.textContent = failure.message; error.classList.remove('hidden'); button.disabled = false; }
  };
}

function openUserEditModal(id) { const user = store.data.users.find(item => item.id === id); if (!user) return; const element = modal('Edit system user', `<div class="mt-5 space-y-3"><input id="edit-user-name" class="input w-full" value="${user.name}" placeholder="Full name" required /><input class="input w-full" value="${user.email}" disabled /><label class="block text-xs font-bold text-slate-500">System role<select id="edit-user-role" class="select mt-2 w-full" required>${Object.entries(roleLabels).map(([key, label]) => `<option value="${key}" ${key === user.role ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="block text-xs font-bold text-slate-500">Branch<select id="edit-user-branch" class="select mt-2 w-full"><option value="">No branch / global</option>${store.data.branches.map(branch => `<option value="${branch.id}" ${branch.id === user.branchId ? 'selected' : ''}>${branch.name}</option>`).join('')}</select></label><input id="edit-user-password" class="input w-full" type="password" minlength="8" placeholder="New password (optional)" /><label class="flex items-center gap-2 text-sm"><input id="edit-user-active" type="checkbox" ${user.active !== false ? 'checked' : ''} /> Account active</label></div><button class="btn btn-primary mt-5 w-full" id="edit-user-save">Save changes</button>`); element.querySelector('#edit-user-save').onclick = async () => { try { await store.updateUser(user.id, { name: element.querySelector('#edit-user-name').value.trim(), role: element.querySelector('#edit-user-role').value, branchId: element.querySelector('#edit-user-branch').value || null, active: element.querySelector('#edit-user-active').checked, password: element.querySelector('#edit-user-password').value || undefined }); element.remove(); showToast('User updated.'); } catch (error) { showToast(error.message || 'Could not update user.'); } }; }
function openCandidateProfileV2(id) { const candidate = store.data.candidates.find(item => item.id === id); if (!candidate) return; const element = modal('Candidate profile', `<div class="space-y-5"><div class="flex items-start justify-between rounded-lg bg-stone-50 p-4"><div class="flex items-center gap-3"><div class="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-teal-100 text-lg font-bold text-teal-800">${candidate.profilePicturePath ? '<img class="h-full w-full object-cover" src="' + candidate.profilePicturePath + '" alt="" />' : candidate.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><strong class="display block text-lg">${candidate.name}</strong><span class="text-xs text-slate-500">${candidate.email} · ${candidate.phone}</span></div></div><button class="btn btn-ghost" id="candidate-edit-button" title="Edit candidate">✎</button></div><div class="grid gap-3 sm:grid-cols-2 text-sm"><div><span class="text-xs text-slate-500">Application stage</span><strong class="block">${badge(candidate.status)}</strong></div><div><span class="text-xs text-slate-500">Passport</span><strong class="block">${candidate.passport}</strong></div><div><span class="text-xs text-slate-500">Job applied for</span><strong class="block">${candidateJobs(candidate)}</strong></div><div><span class="text-xs text-slate-500">Country</span><strong class="block">${(candidate.applications || []).map(application => application.job?.country).filter(Boolean).join(', ') || '—'}</strong></div><div><span class="text-xs text-slate-500">Agreed fee</span><strong class="block">${money(candidate.agreedFee)}</strong></div><div><span class="text-xs text-slate-500">Paid amount</span><strong class="block">${money(candidate.paidAmount)}</strong></div><div><span class="text-xs text-slate-500">Amount due</span><strong class="block">${money(candidate.dueAmount)}</strong></div></div><div><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Special comments</p><p class="mt-2 whitespace-pre-wrap text-sm">${candidate.specialComments || 'No special comments.'}</p></div><div class="border-t border-stone-200 pt-4"><p class="text-xs font-bold text-slate-500">Profile picture</p><div class="mt-2 flex gap-2"><input id="candidate-profile-file" class="input min-w-0 flex-1" type="file" accept="image/*" /><button type="button" class="btn btn-ghost" id="candidate-profile-upload">Upload</button></div></div><div><p class="text-xs font-bold text-slate-500">Documents</p><div class="mt-2 flex gap-2"><select id="candidate-document-type" class="select"><option>Passport</option><option>Police Clearance</option><option>Medical Certificate</option><option>Employment Contract</option><option>Visa</option><option>Other</option></select><input id="candidate-document-file" class="input min-w-0 flex-1" type="file" /><button type="button" class="btn btn-ghost" id="candidate-document-upload">Upload</button></div><div class="mt-2 space-y-1 text-sm">${(candidate.documents || []).map(document => `<p>${document.documentType}: ${document.name}</p>`).join('') || '<p class="text-slate-500">No documents uploaded.</p>'}</div></div></div>`); element.querySelector('#candidate-edit-button').onclick = () => { element.remove(); openCandidateEditor(id); }; element.querySelector('#candidate-profile-upload').onclick = async () => { const file = element.querySelector('#candidate-profile-file').files[0]; if (!file) return showToast('Choose a profile picture first.'); await store.uploadDocument(id, 'Profile picture', file, 'Profile Picture', 'profile'); element.remove(); showToast('Profile picture uploaded.'); }; element.querySelector('#candidate-document-upload').onclick = async () => { const file = element.querySelector('#candidate-document-file').files[0]; if (!file) return showToast('Choose a document first.'); await store.uploadDocument(id, file.name, file, element.querySelector('#candidate-document-type').value); element.remove(); showToast('Document uploaded.'); }; }
function openCandidateEditor(id) { const candidate = store.data.candidates.find(item => item.id === id); if (!candidate) return; const statuses = ['Registered', 'Briefing Done', 'Medical Done', 'Post Medical Follow-up', 'Embassy Appointment Set', 'Visa Received', 'PDOS Done', 'Ticket Purchased', 'Deployed']; const assignedJob = candidate.applications?.[0]?.jobId || ''; const element = modal('Candidate details', `<div class="space-y-5"><div class="grid gap-3 sm:grid-cols-2"><input id="edit-candidate-first" class="input" value="${candidate.firstName || ''}" placeholder="First name" required /><input id="edit-candidate-middle" class="input" value="${candidate.middleName || ''}" placeholder="Middle name" /><input id="edit-candidate-last" class="input" value="${candidate.lastName || ''}" placeholder="Last name" required /><input id="edit-candidate-dob" class="input" type="date" value="${candidate.dateOfBirth?.slice(0, 10) || ''}" required /><select id="edit-candidate-gender" class="select"><option>Male</option><option>Female</option></select><select id="edit-candidate-marital" class="select"><option>${candidate.maritalStatus || 'Single'}</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select><input id="edit-candidate-passport" class="input" value="${candidate.passport || ''}" placeholder="Passport number" required /><input id="edit-candidate-passport-expiry" class="input" type="date" value="${candidate.passportExpiry?.slice(0, 10) || ''}" /><input id="edit-candidate-national-id" class="input" value="${candidate.nationalId || ''}" placeholder="National ID" /><input id="edit-candidate-nationality" class="input" value="${candidate.nationality || ''}" placeholder="Nationality" /><input id="edit-candidate-email" class="input" type="email" value="${candidate.email || ''}" placeholder="Email" required /><input id="edit-candidate-phone" class="input" value="${candidate.phone || ''}" placeholder="Phone" required /><input id="edit-candidate-alt-phone" class="input" value="${candidate.alternatePhone || ''}" placeholder="Alternate phone" /><input id="edit-candidate-address" class="input sm:col-span-2" value="${candidate.address || ''}" placeholder="Address" /></div><label class="block text-xs font-bold text-slate-500">Application status<select id="edit-candidate-status" class="select mt-2 w-full">${statuses.map(status => `<option ${status === candidate.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label class="block text-xs font-bold text-slate-500">Job assignment<select id="edit-candidate-job" class="select mt-2 w-full"><option value="">No assignment</option>${store.data.jobs.filter(job => job.status === 'Open').map(job => `<option value="${job.id}" ${job.id === assignedJob ? 'selected' : ''}>${job.title} · ${job.country}</option>`).join('')}</select></label><div class="grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold text-slate-500">Agreed fee<input id="edit-candidate-fee" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${candidate.agreedFee}" /></label><label class="text-xs font-bold text-slate-500">Paid amount (finance-managed)<input class="input mt-2 w-full bg-stone-100" value="${candidate.paidAmount}" disabled /></label></div><div class="rounded-lg border border-stone-200 p-3 text-sm">Balance due: <strong>${money(candidate.dueAmount)}</strong></div><label class="block text-xs font-bold text-slate-500">Special comments<textarea id="edit-candidate-comments" class="input mt-2 min-h-24 w-full">${candidate.specialComments || ''}</textarea></label><div class="border-t border-stone-200 pt-4"><p class="text-xs font-bold text-slate-500">Documents</p><div class="mt-2 flex gap-2"><input id="candidate-document-file" class="input min-w-0 flex-1" type="file" /><button type="button" class="btn btn-ghost" id="candidate-document-upload">Upload</button></div><div class="mt-2 space-y-1 text-xs text-slate-500">${(candidate.documents || []).map(document => `<p>${document.name}</p>`).join('') || '<p>No documents uploaded.</p>'}</div></div></div><button class="btn btn-primary mt-5 w-full" id="candidate-detail-save">Save candidate details</button>`); element.querySelector('#candidate-document-upload').onclick = async () => { const file = element.querySelector('#candidate-document-file').files[0]; if (!file) return showToast('Choose a document first.'); try { await store.uploadDocument(candidate.id, file.name, file); showToast('Document uploaded.'); } catch (error) { showToast(error.message); } }; element.querySelector('#candidate-detail-save').onclick = async () => { try { await store.updateCandidate(candidate.id, { firstName: element.querySelector('#edit-candidate-first').value.trim(), middleName: element.querySelector('#edit-candidate-middle').value.trim(), lastName: element.querySelector('#edit-candidate-last').value.trim(), dateOfBirth: element.querySelector('#edit-candidate-dob').value, gender: element.querySelector('#edit-candidate-gender').value, maritalStatus: element.querySelector('#edit-candidate-marital').value, passport: element.querySelector('#edit-candidate-passport').value.trim(), passportExpiry: element.querySelector('#edit-candidate-passport-expiry').value, nationalId: element.querySelector('#edit-candidate-national-id').value.trim(), nationality: element.querySelector('#edit-candidate-nationality').value.trim(), email: element.querySelector('#edit-candidate-email').value.trim(), phone: element.querySelector('#edit-candidate-phone').value.trim(), alternatePhone: element.querySelector('#edit-candidate-alt-phone').value.trim(), address: element.querySelector('#edit-candidate-address').value.trim(), status: element.querySelector('#edit-candidate-status').value, jobId: element.querySelector('#edit-candidate-job').value || undefined, agreedFee: Number(element.querySelector('#edit-candidate-fee').value || 0), specialComments: element.querySelector('#edit-candidate-comments').value.trim() }); element.remove(); showToast('Candidate details updated.'); } catch (error) { showToast(error.message || 'Could not update candidate.'); } }; }
function openCandidateModal(id) { const candidate = store.data.candidates.find(item => item.id === id); if (!candidate) return; const statuses = ['Registered', 'Briefing Done', 'Medical Done', 'Post Medical Follow-up', 'Embassy Appointment Set', 'Visa Received', 'PDOS Done', 'Ticket Purchased', 'Deployed']; const element = modal('Candidate profile', `<div class="mt-5 space-y-4"><div class="rounded-lg bg-stone-50 p-4"><strong class="display block text-lg">${candidate.name}</strong><span class="text-xs text-slate-500">${candidate.passport} · ${branchName(candidate.branchId)}</span></div><label class="block text-xs font-bold text-slate-500">Application status<select id="candidate-edit-status" class="select mt-2 w-full">${statuses.map(status => `<option ${status === candidate.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><div class="grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold text-slate-500">Agreed fee<input id="candidate-agreed-fee" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${candidate.agreedFee}" /></label><label class="text-xs font-bold text-slate-500">Paid amount<input id="candidate-paid-amount" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${candidate.paidAmount}" /></label></div><div class="rounded-lg border border-stone-200 p-3 text-sm">Balance due: <strong id="candidate-due">${money(candidate.dueAmount)}</strong></div><label class="block text-xs font-bold text-slate-500">Special comments<textarea id="candidate-comments" class="input mt-2 min-h-24 w-full" placeholder="Notes visible on the candidate profile">${candidate.specialComments || ''}</textarea></label></div><button class="btn btn-primary mt-5 w-full" id="candidate-save">Save candidate profile</button>`); const updateDue = () => { const due = Number(element.querySelector('#candidate-agreed-fee').value || 0) - Number(element.querySelector('#candidate-paid-amount').value || 0); element.querySelector('#candidate-due').textContent = money(Math.max(0, due)); }; element.querySelector('#candidate-agreed-fee').addEventListener('input', updateDue); element.querySelector('#candidate-paid-amount').addEventListener('input', updateDue); element.querySelector('#candidate-save').onclick = async () => { try { await store.updateCandidate(candidate.id, { status: element.querySelector('#candidate-edit-status').value, agreedFee: Number(element.querySelector('#candidate-agreed-fee').value || 0), paidAmount: Number(element.querySelector('#candidate-paid-amount').value || 0), specialComments: element.querySelector('#candidate-comments').value.trim() }); element.remove(); showToast('Candidate profile updated.'); } catch (error) { showToast(error.message || 'Could not update candidate.'); } }; }
function openAssignModal(candidateId, jobId) { const candidates = visibleCandidates(store.user); const jobs = store.data.jobs.filter(job => job.status === 'Open'); const element = modal('Assign candidate', `<p class="mt-2 text-sm text-slate-500">Jobs are global, but candidate choices respect your branch access.</p><label class="mt-6 block text-xs font-bold text-slate-500">Candidate<select id="assign-candidate" class="select mt-2 w-full">${candidates.map(candidate => `<option value="${candidate.id}" ${candidate.id === candidateId ? 'selected' : ''}>${candidate.name} · ${branchName(candidate.branchId)}</option>`).join('')}</select></label><label class="mt-4 block text-xs font-bold text-slate-500">Job order<select id="assign-job" class="select mt-2 w-full">${jobs.map(job => `<option value="${job.id}" ${job.id === jobId ? 'selected' : ''}>${job.title} · ${job.country}</option>`).join('')}</select></label><button class="btn btn-primary mt-6 w-full" id="confirm-assign">Create assignment</button>`); element.querySelector('#confirm-assign').onclick = async () => { await store.addApplication({ candidateId: element.querySelector('#assign-candidate').value, jobId: element.querySelector('#assign-job').value, status: 'Shortlisted' }); element.remove(); showToast('Candidate assigned to job order.'); }; }
function openJobEditorModal(id) {
  const job = store.data.jobs.find(item => item.id === id);
  if (!job) return;
  const jobTypes = [...new Set([...jobTypeOptions, job.jobType || 'Other'])];
  const element = modal('Edit job order', `<form id="edit-job-form" class="space-y-4"><div class="grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold text-slate-500">Job title<input name="title" class="input mt-2 w-full" value="${escapeHtml(job.title)}" required /></label><label class="text-xs font-bold text-slate-500">Job type<select name="jobType" class="select mt-2 w-full">${jobTypes.map(type => `<option ${type === job.jobType ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></label><label class="text-xs font-bold text-slate-500">Employer<input name="employer" class="input mt-2 w-full" value="${escapeHtml(job.employer)}" required /></label><label class="text-xs font-bold text-slate-500">Country<input name="country" class="input mt-2 w-full" value="${escapeHtml(job.country)}" required /></label><label class="text-xs font-bold text-slate-500">Location<input name="location" class="input mt-2 w-full" value="${escapeHtml(job.location)}" required /></label><label class="text-xs font-bold text-slate-500">Headcount<input name="headcountRequired" class="input mt-2 w-full" type="number" min="1" value="${job.headcountRequired || job.openings}" required /></label><label class="text-xs font-bold text-slate-500">Contract months<input name="contractDurationMonths" class="input mt-2 w-full" type="number" min="0" value="${job.contractDurationMonths}" required /></label><label class="text-xs font-bold text-slate-500">Currency<input name="currency" class="input mt-2 w-full" value="${escapeHtml(job.currency)}" required /></label><label class="text-xs font-bold text-slate-500">Minimum salary<input name="minimumSalary" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${job.minimumSalary}" required /></label><label class="text-xs font-bold text-slate-500">Maximum salary<input name="maximumSalary" class="input mt-2 w-full" type="number" min="0" step="0.01" value="${job.maximumSalary}" required /></label></div><label class="block text-xs font-bold text-slate-500">Required skills<input name="requiredSkills" class="input mt-2 w-full" value="${escapeHtml(job.requiredSkills)}" required /></label><label class="block text-xs font-bold text-slate-500">Comments<textarea name="comments" class="input mt-2 w-full">${escapeHtml(job.comments || '')}</textarea></label><p id="edit-job-error" class="hidden rounded-lg bg-red-50 p-3 text-xs text-red-700"></p><button class="btn btn-primary w-full" type="submit">Save job order</button></form>`);
  businessUI.employerSelector(element, job.recruiterId);
  element.querySelector('#edit-job-form').onsubmit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await store.updateJob(id, values); element.remove(); showToast('Job order updated.'); }
    catch (error) { const target = element.querySelector('#edit-job-error'); target.textContent = error.message; target.classList.remove('hidden'); }
  };
}
function openSimpleModal(type) {
  const isBranchAdmin = store.user?.role === 'branch_admin';
  const creatableRoles = isBranchAdmin ? ['branch_staff', 'branch_finance'] : ['super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance', 'recruiter'];
  const userRoleOptions = `<option value="">Select role *</option>${creatableRoles.map(role => `<option value="${role}">${roleLabels[role]}</option>`).join('')}`;
  const userBranchControl = isBranchAdmin
    ? `<input id="user-branch" type="hidden" value="${store.user.branchId}" />`
    : `<select id="user-branch" class="select w-full"><option value="">Attach to branch</option>${store.data.branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}</select>`;
  const forms = {
    'receive-passport': { title: 'Receive physical passport', content: `${store.data.candidates.length ? `<select id="passport-candidate" class="select mt-6 w-full" required><option value="">Select candidate *</option>${store.data.candidates.map(candidate => `<option value="${candidate.id}">${candidate.name} · ${candidate.passport}</option>`).join('')}</select><input id="passport-location" class="input mt-3 w-full" placeholder="Storage location (e.g. cabinet/shelf)" /><textarea id="passport-notes" class="input mt-3 w-full" placeholder="Notes"></textarea><button class="btn btn-primary mt-4 w-full" id="modal-save">Record passport receipt</button>` : '<p class="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">No candidates are available in your branch scope yet.</p><button class="btn btn-ghost mt-5 w-full" data-close>Close</button>'}` },
    'new-user': { title: isBranchAdmin ? 'Add branch user' : 'Add system user', content: `<div class="mt-5 space-y-3"><input id="user-name" class="input w-full" placeholder="Full name *" required /><input id="user-username" class="input w-full" placeholder="Username *" minlength="3" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required /><input id="user-email" class="input w-full" type="email" placeholder="Work email *" required /><select id="user-role" class="select w-full" required>${userRoleOptions}</select>${userBranchControl}<p class="text-xs text-slate-500">ROMS issues a one-time password. The user must confirm their email and choose a new password at first sign-in.</p></div><button class="btn btn-primary mt-5 w-full" id="modal-save">Create user</button>` },
    'new-branch': { title: 'Add branch office', content: `<input id="branch-name" class="input mt-6 w-full" placeholder="Branch name" required /><input id="branch-code" class="input mt-3 w-full" placeholder="Branch code" maxlength="4" required /><button class="btn btn-primary mt-4 w-full" id="modal-save">Create branch</button>` },
    'add-candidate': { title: 'Register candidate', content: `<div class="space-y-5"><fieldset><legend class="display text-sm font-bold">Personal information</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input id="candidate-first" class="input" placeholder="First name *" required /><input id="candidate-middle" class="input" placeholder="Middle name" /><input id="candidate-last" class="input" placeholder="Last name *" required /><label class="text-xs font-bold text-slate-500">Date of birth *<input id="candidate-dob" class="input mt-1 w-full" type="date" required /></label><select id="candidate-gender" class="select" required><option value="">Gender *</option><option>Male</option><option>Female</option></select><select id="candidate-marital" class="select" required><option value="">Select marital status *</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select><input id="candidate-weight" class="input" type="number" min="1" step="0.1" placeholder="Weight (kg)" /><input id="candidate-height" class="input" type="number" min="1" step="0.1" placeholder="Height (ft)" /></div></fieldset><fieldset><legend class="display text-sm font-bold">Identification</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input id="candidate-passport" class="input" placeholder="Passport number *" required /><label class="text-xs font-bold text-slate-500">Passport expiry<input id="candidate-passport-expiry" class="input mt-1 w-full" type="date" /></label><input id="candidate-national-id" class="input" placeholder="National ID" /><input id="candidate-nationality" class="input" placeholder="Nationality" /></div></fieldset><fieldset><legend class="display text-sm font-bold">Contact information</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><input id="candidate-email" class="input" type="email" placeholder="Email *" required /><input id="candidate-phone" class="input" type="tel" placeholder="Phone number *" required /><input id="candidate-alt-phone" class="input" type="tel" placeholder="Alternate phone" /><textarea id="candidate-address" class="input sm:col-span-2" placeholder="Address"></textarea></div></fieldset><fieldset><legend class="display text-sm font-bold">Job application</legend><select id="candidate-job" class="select mt-3 w-full"><option value="">Select job applied for</option>${store.data.jobs.filter(job => job.status === 'Open').map(job => `<option value="${job.id}">${job.title} · ${job.employer} · ${job.country}</option>`).join('')}</select></fieldset><fieldset><legend class="display text-sm font-bold">Registration location</legend><div class="mt-3 grid gap-3 sm:grid-cols-2"><select id="candidate-branch" class="select" required><option value="">Office location *</option>${store.data.branches.map(branch => `<option value="${branch.id}" ${branch.id === store.user.branchId ? 'selected' : ''}>${branch.name}</option>`).join('')}</select><select id="candidate-registered-by" class="select" required><option value="">Registered by *</option><option>Rabiya</option><option>Self</option><option>Sub-Agent</option></select><input id="candidate-sub-agent" class="input hidden sm:col-span-2" placeholder="Sub-agent name *" /></div></fieldset></div><button class="btn btn-primary mt-5 w-full" id="modal-save">Register candidate</button>` },
    'new-job': { title: 'Create job order', content: `<div class="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1"><input id="job-title" class="input w-full" placeholder="Job title *" required /><input id="job-employer" class="input w-full" placeholder="Employer *" required /><div class="grid gap-3 sm:grid-cols-2"><input id="job-headcount" class="input" type="number" min="1" placeholder="Headcount required *" required /><input id="job-duration" class="input" type="number" min="1" placeholder="Contract months *" required /><input id="job-currency" class="input" placeholder="Currency * (e.g. USD)" required /><input id="job-min-salary" class="input" type="number" min="0" step="0.01" placeholder="Minimum salary *" required /><input id="job-max-salary" class="input" type="number" min="0" step="0.01" placeholder="Maximum salary *" required /><input id="job-location" class="input" placeholder="Location *" required /><input id="job-country" class="input" placeholder="Country *" required /></div><input id="job-skills" class="input w-full" placeholder="Required skills *" required /><textarea id="job-comments" class="input w-full" placeholder="Comments"></textarea></div><button class="btn btn-primary mt-5 w-full" id="modal-save">Publish job order</button>` },
    'new-transaction': { title: 'Record payment', content: `${store.data.candidates.length ? `<select id="txn-candidate" class="select mt-6 w-full" required><option value="">Map to registered applicant *</option>${store.data.candidates.map(candidate => `<option value="${candidate.id}">${candidate.name} · ${candidate.passport}</option>`).join('')}</select><select id="txn-type" class="select mt-3 w-full" required><option value="">Select transaction type *</option><option value="Receipt">Receipt</option><option value="Refund">Refund</option><option value="Other">Other</option></select><input id="txn-other-description" class="input mt-3 hidden w-full" placeholder="Specify other transaction *" /><div class="grid gap-3 sm:grid-cols-2"><select id="txn-currency" class="select mt-3" required><option value="KES">KES</option><option value="USD">USD</option><option value="AED">AED</option><option value="QAR">QAR</option><option value="EUR">EUR</option></select><input id="txn-rate" class="input mt-3" type="number" min="0.000001" step="0.000001" value="1" placeholder="Rate to KES" required /></div><input id="txn-amount" class="input mt-3 w-full" type="number" min="0" step="0.01" placeholder="Amount in selected currency" required /><select id="txn-method" class="select mt-3 w-full" required><option value="">Mode of payment *</option><option>Cash</option><option>Mobile Money</option><option>Bank Transfer</option><option>Card</option><option>Cheque</option></select><input id="txn-reference" class="input mt-3 w-full" placeholder="Payment reference *" required /><p class="text-xs text-slate-500">Receipt increases the candidate’s Commission Total paid. Refund reduces it. Other entries are recorded separately.</p><button class="btn btn-primary mt-4 w-full" id="modal-save">Save payment</button>` : '<p class="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">No registered applicants are available. Register a candidate before recording a payment.</p><button class="btn btn-ghost mt-5 w-full" data-close>Close</button>'}` }
  };
  const form = forms[type] || forms['new-branch'];
  const element = modal(form.title, form.content);
  element.querySelector('#txn-type')?.addEventListener('change', event => {
    const otherDescription = element.querySelector('#txn-other-description');
    const isOther = event.target.value === 'Other';
    otherDescription.classList.toggle('hidden', !isOther);
    otherDescription.required = isOther;
    if (!isOther) otherDescription.value = '';
  });
  if (type === 'new-job') {
    businessUI.employerSelector(element);
    element.querySelector('#job-skills').placeholder = 'Qualifications / required skills *';
    const countryInput = element.querySelector('#job-country');
    const countrySelect = document.createElement('select'); countrySelect.id = 'job-country'; countrySelect.name = 'country'; countrySelect.className = 'select w-full'; countrySelect.required = true;
    countrySelect.innerHTML = '<option value="">Select destination *</option>';
    [...new Set([...jobDestinations, ...store.data.jobs.map(job => job.country).filter(Boolean)])].forEach(country => { const option = document.createElement('option'); option.value = country; option.textContent = country; countrySelect.append(option); });
    const addCountryOption = document.createElement('option'); addCountryOption.value = '__add_country__'; addCountryOption.textContent = 'Add a new country…'; countrySelect.append(addCountryOption);
    countryInput.replaceWith(countrySelect);
    const customCountry = document.createElement('input'); customCountry.id = 'job-country-custom'; customCountry.className = 'input mt-3 w-full hidden'; customCountry.placeholder = 'Enter new country name *'; customCountry.required = false; countrySelect.insertAdjacentElement('afterend', customCountry);
    countrySelect.addEventListener('change', () => { const custom = countrySelect.value === '__add_country__'; customCountry.classList.toggle('hidden', !custom); customCountry.required = custom; if (custom) customCountry.focus(); });
    const typeSelect = document.createElement('select'); typeSelect.id = 'job-type'; typeSelect.name = 'jobType'; typeSelect.className = 'select mt-3 w-full'; typeSelect.required = true;
    typeSelect.innerHTML = '<option value="">Select job type *</option><option>Care & Healthcare</option><option>Construction</option><option>Hospitality</option><option>Domestic Work</option><option>Manufacturing</option><option>Agriculture</option><option>Driving & Transport</option><option>Other</option>';
    element.querySelector('#job-title').insertAdjacentElement('afterend', typeSelect);
  }
  const registeredBy = element.querySelector('#candidate-registered-by');
  const subAgent = element.querySelector('#candidate-sub-agent');
  registeredBy?.addEventListener('change', () => subAgent.classList.toggle('hidden', registeredBy.value !== 'Sub-Agent'));
  element.querySelector('#modal-save')?.addEventListener('click', async () => {
    try {
      const invalid = [...element.querySelectorAll('[required]')].find(input => !input.value.trim());
      if (invalid) { invalid.focus(); showToast('Complete the required fields.'); return; }
      let createdUser = null;
      if (type === 'receive-passport') await store.receivePassport({ candidateId: element.querySelector('#passport-candidate').value, storageLocation: element.querySelector('#passport-location').value.trim(), notes: element.querySelector('#passport-notes').value.trim() });
      if (type === 'new-user') createdUser = await store.addUser({ name: element.querySelector('#user-name').value.trim(), username: element.querySelector('#user-username').value.trim(), email: element.querySelector('#user-email').value.trim(), role: element.querySelector('#user-role').value, branchId: element.querySelector('#user-branch').value || null });
      if (type === 'new-branch') await store.addBranch({ name: element.querySelector('#branch-name').value.trim(), code: element.querySelector('#branch-code').value.trim().toUpperCase(), candidates: 0, accent: '#0f766e' });
      if (type === 'add-candidate') await store.addCandidate({ firstName: element.querySelector('#candidate-first').value.trim(), middleName: element.querySelector('#candidate-middle').value.trim(), lastName: element.querySelector('#candidate-last').value.trim(), dateOfBirth: element.querySelector('#candidate-dob').value, gender: element.querySelector('#candidate-gender').value, maritalStatus: element.querySelector('#candidate-marital').value, weightKg: element.querySelector('#candidate-weight').value, heightFt: element.querySelector('#candidate-height').value, passport: element.querySelector('#candidate-passport').value.trim(), passportExpiry: element.querySelector('#candidate-passport-expiry').value, nationalId: element.querySelector('#candidate-national-id').value.trim(), nationality: element.querySelector('#candidate-nationality').value.trim(), email: element.querySelector('#candidate-email').value.trim(), phone: element.querySelector('#candidate-phone').value.trim(), alternatePhone: element.querySelector('#candidate-alt-phone').value.trim(), address: element.querySelector('#candidate-address').value.trim(), branchId: element.querySelector('#candidate-branch').value, jobId: element.querySelector('#candidate-job').value || undefined, registeredBy: element.querySelector('#candidate-registered-by').value, subAgentName: element.querySelector('#candidate-sub-agent').value.trim() });
      if (type === 'new-job') { const countrySelect = element.querySelector('#job-country'); const country = countrySelect.value === '__add_country__' ? element.querySelector('#job-country-custom').value.trim() : countrySelect.value; if (!country) { countrySelect.focus(); showToast('Select or enter a country.'); return; } await store.addJob({ title: element.querySelector('#job-title').value.trim(), jobType: element.querySelector('#job-type').value, employer: element.querySelector('#job-employer').value.trim(), headcountRequired: Number(element.querySelector('#job-headcount').value), contractDurationMonths: Number(element.querySelector('#job-duration').value), currency: element.querySelector('#job-currency').value.trim().toUpperCase(), minimumSalary: Number(element.querySelector('#job-min-salary').value), maximumSalary: Number(element.querySelector('#job-max-salary').value), location: element.querySelector('#job-location').value.trim(), country, requiredSkills: element.querySelector('#job-skills').value.trim(), comments: element.querySelector('#job-comments').value.trim() }); }
      if (type === 'new-transaction') await store.addTransaction({ candidateId: element.querySelector('#txn-candidate').value, type: element.querySelector('#txn-type').value, otherDescription: element.querySelector('#txn-other-description').value.trim(), currency: element.querySelector('#txn-currency').value, exchangeRate: Number(element.querySelector('#txn-rate').value), amount: Number(element.querySelector('#txn-amount').value), paymentMethod: element.querySelector('#txn-method').value, paymentReference: element.querySelector('#txn-reference').value.trim(), date: new Date().toISOString() });
      element.remove();
      if (type === 'new-user') { showTemporaryCredential(createdUser); return; }
      if (type === 'new-job') { showToast('Job order submitted for approval.'); window.location.hash = 'jobs'; return; }
      showToast('Candidate saved to ROMS.');
    } catch (error) { showToast(error?.response?.message || error?.message || 'Could not save this record.'); }
  });
}

document.addEventListener('pointerdown', event => {
  const sidebar = app.querySelector('.sidebar');
  const menuButton = app.querySelector('.mobile-menu-button');
  if (!sidebar?.classList.contains('mobile-open') || sidebar.contains(event.target) || menuButton?.contains(event.target)) return;
  sidebar.classList.remove('mobile-open');
});
store.subscribe(dashboardView); window.addEventListener('hashchange', dashboardView); dashboardView(); store.initialize();

function openCandidateEditorWithWorkflow(id) {
  const candidate = store.data.candidates.find(item => item.id === id);
  if (!candidate) return;
  openCandidateEditor(id);
  const statusSelect = document.querySelector('#edit-candidate-status');
  if (!statusSelect) return;
  statusSelect.replaceChildren(...candidateWorkflowStages.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  statusSelect.value = normalizedCandidateStage(candidate.status);
}
