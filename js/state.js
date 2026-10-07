import { API_URL } from './config.js';

const emptyData = () => ({ branches: [], users: [], recruiters: [], candidates: [], jobs: [], applications: [], transactions: [], auditLogs: [], passports: [], userReport: [], company: { companyName: 'Rabiya Employment Links', logoData: null } });
const tokenKey = 'roms-access-token';
const readable = value => String(value || '').replaceAll('_', ' ');
const candidateStageLabels = { Registered: 'Application', Briefing_Done: 'Document Verification', Medical_Done: 'Document Verification', Post_Medical_Follow_up: 'Document Verification', Interview_scheduled: 'Interview', Job_matched: 'Offer Contract', Awaiting_payment: 'Balance Payment', Embassy_Appointment_Set: 'Visa Processing', Visa_Received: 'Visa Approved', PDOS_Done: 'Ticketing', Ticket_Purchased: 'Ticketing' };
const apiStatus = value => String(value || '').replaceAll(' ', '_');

async function request(path, options = {}, token = '') {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: options.cache || 'no-store',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function normalizeData(data) {
  return {
    ...data,
    candidates: data.candidates.map(item => { const commissionTotal = Number(item.commissionTotal || item.agreedFee || 0); return { ...item, branchId: item.branchId, submitted: item.submitted || item.createdAt, status: candidateStageLabels[item.status] || readable(item.status), docs: item.docs ?? 0, agreedFee: commissionTotal, commissionTotal, visaFee: Number(item.visaFee || 0), medicalFee: Number(item.medicalFee || 0), foreignAffairsAttestationFee: Number(item.foreignAffairsAttestationFee || 0), kmpduMedicalFee: Number(item.kmpduMedicalFee || 0), embassyAttestationFee: Number(item.embassyAttestationFee || 0), airTicketFee: Number(item.airTicketFee || 0), officeFee: Number(item.officeFee || 0), paidAmount: Number(item.paidAmount || 0), dueAmount: commissionTotal - Number(item.paidAmount || 0) }; }),
    transactions: data.transactions.map(item => ({ ...item, branchId: item.branchId, status: readable(item.status), amount: Number(item.amount), amountKes: Number(item.amountKes ?? item.amount), currency: item.currency || 'KES', exchangeRate: Number(item.exchangeRate || 1) })),
    applications: data.applications.map(item => ({ ...item, candidateId: item.candidateId, jobId: item.jobId, status: readable(item.status) }))
  };
}

export function createStore() {
  const data = emptyData();
  const listeners = [];
  let currentUser = null;
  localStorage.removeItem(tokenKey);
  let token = null;
  let idleTimer;
  let lastActivity = Date.now();
  const idleLimit = 10 * 60 * 1000;
  const expireSession = () => {
    if (!currentUser) return;
    document.querySelectorAll('.modal-backdrop, .document-preview-backdrop').forEach(element => element.remove());
    window.location.hash = 'login';
    store.logout();
  };
  const activity = () => {
    if (!currentUser) return;
    if (Date.now() - lastActivity >= idleLimit) return expireSession();
    lastActivity = Date.now();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(expireSession, idleLimit);
  };
  for (const event of ['pointerdown', 'keydown', 'pointermove', 'scroll', 'wheel', 'touchstart', 'input', 'change']) document.addEventListener(event, activity, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) activity(); });
  setInterval(() => {
    if (currentUser && !document.hidden && Date.now() - lastActivity < idleLimit) request('/auth/me', {}, token).catch(error => { if (error.status === 401) expireSession(); });
  }, 30000);
  const store = {
    data,
    loading: true,
    error: null,
    get user() { return currentUser; },
    subscribe(listener) { listeners.push(listener); return () => listeners.splice(listeners.indexOf(listener), 1); },
    async initialize() {
      if (!token) {
        try { [data.jobs, data.branches, data.company] = await Promise.all([request('/public/jobs'), request('/public/branches'), request('/public/company')]); }
        catch (error) { store.error = error; }
        store.loading = false; notify(); return;
      }
      try { currentUser = (await request('/auth/me', {}, token)).user; await store.refresh(); }
      catch (error) { token = null; localStorage.removeItem(tokenKey); currentUser = null; store.error = error; store.loading = false; notify(); }
    },
    async login(username, password) {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      token = result.token; currentUser = result.user;
      Object.assign(data, emptyData());
      lastActivity = Date.now(); activity();
      if (currentUser.passwordResetRequired) {
        Object.assign(data, emptyData()); store.loading = false; store.error = null; notify();
        return result;
      }
      await store.refresh();
      return result;
    },
    async logout() {
      const previousToken = token;
      token = null; currentUser = null; clearTimeout(idleTimer);
      Object.assign(data, emptyData()); store.loading = true; store.error = null; notify();
      try { if (previousToken) await request('/auth/logout', { method: 'POST' }, previousToken); }
      catch {}
      finally {
        token = null;
        localStorage.removeItem(tokenKey);
        currentUser = null;
        Object.assign(data, emptyData());
        store.loading = true;
        try { [data.jobs, data.branches, data.company] = await Promise.all([request('/public/jobs'), request('/public/branches'), request('/public/company')]); store.error = null; }
        catch (error) { store.error = error; }
        store.loading = false;
        notify();
      }
    },
    async publicApply(candidate) { return request('/public/applications', { method: 'POST', body: JSON.stringify(candidate) }); },
    async trackApplication(trackingNumber, email) { return request('/public/track', { method: 'POST', body: JSON.stringify({ trackingNumber, email }) }); },
    async trackByToken(token) { return request('/public/track/link', { method: 'POST', body: JSON.stringify({ token }) }); },
    async sendTrackingEmail(token) { return request('/public/track/link/email', { method: 'POST', body: JSON.stringify({ token }) }); },
    async downloadReceipt(token) {
      const response = await fetch(`${API_URL}/public/track/link/receipt.pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || `Request failed (${response.status})`); }
      return response.blob();
    },
    async refresh() {
      store.loading = true;
      const refreshToken = token;
      try {
        const passportAccess = ['super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance'].includes(currentUser.role);
        const [branches, users, candidates, jobs, applications, transactions, auditLogs, passports, company, userReport, recruiters] = await Promise.all([
          request('/branches', {}, token), ['super_admin', 'branch_admin'].includes(currentUser.role) ? request('/users', {}, token) : Promise.resolve([currentUser]),
          request('/candidates', {}, token), request('/jobs', {}, token), request('/applications', {}, token), currentUser.role === 'recruiter' ? Promise.resolve([]) : request('/transactions', {}, token), currentUser.role === 'super_admin' ? request('/audit', {}, token) : Promise.resolve([]), passportAccess ? request('/passports', {}, token) : Promise.resolve([]), request('/company', {}, token), ['super_admin', 'branch_admin'].includes(currentUser.role) ? request('/users/report', {}, token) : Promise.resolve([]), request('/recruiters', {}, token)
        ]);
        if (token !== refreshToken || !currentUser) return;
        Object.assign(data, normalizeData({ branches, users, candidates, jobs, applications, transactions, auditLogs, passports, company, userReport, recruiters }));
        store.loading = false; store.error = null; notify();
      } catch (error) {
        if (token !== refreshToken || !currentUser) return;
        if (error.status === 401) expireSession();
        else { store.error = error; store.loading = false; notify(); }
        throw error;
      }
    },
    async addCandidate(candidate) { const created = await request('/candidates', { method: 'POST', body: JSON.stringify({ ...candidate, status: apiStatus(candidate.status) }) }, token); await store.refresh(); return created; },
    async updateCandidate(id, changes) { await request(`/candidates/${id}`, { method: 'PATCH', body: JSON.stringify({ ...changes, status: changes.status ? apiStatus(changes.status) : undefined }) }, token); await store.refresh(); },
    async deleteCandidate(id) { await request(`/candidates/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async receivePassport(payload) { await request('/passports', { method: 'POST', body: JSON.stringify(payload) }, token); await store.refresh(); },
    async updatePassport(id, changes) { await request(`/passports/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }, token); await store.refresh(); },
    async deletePassport(id) { await request(`/passports/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async voidTransaction(id) { await request(`/transactions/${id}/void`, { method: 'POST' }, token); await store.refresh(); },
    async saveCompany(settings) { await request('/company', { method: 'PUT', body: JSON.stringify(settings) }, token); await store.refresh(); },
    async downloadBusinessFile(path, options = {}) {
      const response = await fetch(`${API_URL}${path}`, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || `Request failed (${response.status})`); }
      return response.blob();
    },
    async exportCandidates(ids, columns) { return store.downloadBusinessFile('/candidates/export', { method: 'POST', body: JSON.stringify({ ids, columns }) }); },
    async uploadDocument(id, name, file, documentType = 'Other', kind = 'document') { if ((file?.size || 0) > 10 * 1024 * 1024) throw new Error('Document must be 10MB or smaller'); const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); await request(`/candidates/${id}/documents`, { method: 'POST', body: JSON.stringify({ name, fileName: file.name, mimeType: file.type, documentType, kind, content }) }, token); await store.refresh(); },
    async uploadScannedPdf(id, documentType, files) { const total = [...files].reduce((sum, file) => sum + (file.size || 0), 0); if (total > 10 * 1024 * 1024) throw new Error('Scanned document must be 10MB or smaller'); const pages = await Promise.all([...files].map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, content: String(reader.result).split(',')[1] }); reader.onerror = reject; reader.readAsDataURL(file); }))); await request(`/candidates/${id}/documents/scan`, { method: 'POST', body: JSON.stringify({ documentType, name: `${documentType} scan`, pages }) }, token); await store.refresh(); },
    async fetchDocument(id, download = false) {
      const response = await fetch(`${API_URL}/documents/${encodeURIComponent(id)}${download ? '?download=1' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${response.status})`);
      }
      return response.blob();
    },
    async combineDocuments(candidateId, documentIds) {
      const response = await fetch(`${API_URL}/candidates/${encodeURIComponent(candidateId)}/documents/combined`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ documentIds })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${response.status})`);
      }
      return response.blob();
    },
    async deleteDocument(id) { await request(`/documents/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async addApplication(application) { await request('/applications', { method: 'POST', body: JSON.stringify({ ...application, status: apiStatus(application.status) }) }, token); await store.refresh(); },
    async addJob(job) { await request('/jobs', { method: 'POST', body: JSON.stringify({ ...job, recruiterId: job.recruiterId || job.employer }) }, token); await store.refresh(); },
    async updateJob(id, job) { await request(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(job) }, token); await store.refresh(); },
    async approveJob(id) { await request(`/jobs/${id}/approve`, { method: 'PATCH' }, token); await store.refresh(); },
    async deleteJob(id) { await request(`/jobs/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async updateTransaction(id, status) { await request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: apiStatus(status) }) }, token); await store.refresh(); },
    async addTransaction(transaction) { await request('/transactions', { method: 'POST', body: JSON.stringify(transaction) }, token); await store.refresh(); },
    async deleteTransaction(id) { await request(`/transactions/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async addBranch(branch) { await request('/branches', { method: 'POST', body: JSON.stringify(branch) }, token); await store.refresh(); },
    async updateBranch(id, branch) { await request(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(branch) }, token); await store.refresh(); },
    async deleteBranch(id) { await request(`/branches/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async addUser(user) { const created = await request('/users', { method: 'POST', body: JSON.stringify(user) }, token); await store.refresh().catch(() => {}); return created; },
    async addRecruiter(user) { const created = await request('/recruiters', { method: 'POST', body: JSON.stringify(user) }, token); await store.refresh().catch(() => {}); return created; },
    async updateUser(id, user) { await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(user) }, token); await store.refresh(); },
    async deleteUser(id) { await request(`/users/${id}`, { method: 'DELETE' }, token); await store.refresh(); },
    async resetUserPassword(id) { const result = await request(`/users/${id}/reset-password`, { method: 'POST' }, token); await store.refresh().catch(() => {}); return result; },
    async setFirstPassword(payload) { return request('/auth/first-password', { method: 'POST', body: JSON.stringify(payload) }, token); },
    async changePassword(payload) { return request('/auth/password/change', { method: 'POST', body: JSON.stringify(payload) }, token); },
    async listBackups() { return request('/admin/backups', {}, token); },
    async backupStatus(snapshot = '') { return request(`/admin/backups/status${snapshot ? `?snapshot=${encodeURIComponent(snapshot)}` : ''}`, {}, token); },
    async startBackup() { return request('/admin/backups', { method: 'POST' }, token); },
    async restoreBackup(snapshot, confirmation) { return request('/admin/backups/restore', { method: 'POST', body: JSON.stringify({ snapshot, confirmation }) }, token); },
    async deleteRecruiter(id) { await store.deleteUser(id); }
  };
  function notify() { listeners.forEach(listener => listener(store)); }
  return store;
}
