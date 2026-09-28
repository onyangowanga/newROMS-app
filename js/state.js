import { API_URL } from './config.js';

const emptyData = () => ({ branches: [], users: [], candidates: [], jobs: [], applications: [], transactions: [] });
const tokenKey = 'roms-access-token';
const readable = value => String(value || '').replaceAll('_', ' ');
const apiStatus = value => String(value || '').replaceAll(' ', '_');

async function request(path, options = {}, token = '') {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
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
    candidates: data.candidates.map(item => ({ ...item, branchId: item.branchId, submitted: item.submitted || item.createdAt, status: readable(item.status), docs: item.docs ?? 0 })),
    transactions: data.transactions.map(item => ({ ...item, branchId: item.branchId, status: readable(item.status), amount: Number(item.amount) })),
    applications: data.applications.map(item => ({ ...item, candidateId: item.candidateId, jobId: item.jobId, status: readable(item.status) }))
  };
}

export function createStore() {
  const data = emptyData();
  const listeners = [];
  let currentUser = null;
  let token = localStorage.getItem(tokenKey);
  const store = {
    data,
    loading: true,
    error: null,
    get user() { return currentUser; },
    subscribe(listener) { listeners.push(listener); return () => listeners.splice(listeners.indexOf(listener), 1); },
    async initialize() {
      if (!token) { store.loading = false; notify(); return; }
      try { currentUser = (await request('/auth/me', {}, token)).user; await store.refresh(); }
      catch (error) { token = null; localStorage.removeItem(tokenKey); currentUser = null; store.error = error; store.loading = false; notify(); }
    },
    async login(email, password) {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      token = result.token; localStorage.setItem(tokenKey, token); currentUser = result.user; await store.refresh();
    },
    async logout() {
      try { if (token) await request('/auth/logout', { method: 'POST' }, token); } finally { token = null; localStorage.removeItem(tokenKey); currentUser = null; Object.assign(data, emptyData()); notify(); }
    },
    async refresh() {
      store.loading = true;
      try {
        const [branches, users, candidates, jobs, applications, transactions] = await Promise.all([
          request('/branches', {}, token), currentUser.role === 'super_admin' ? request('/users', {}, token) : Promise.resolve([currentUser]),
          request('/candidates', {}, token), request('/jobs', {}, token), request('/applications', {}, token), request('/transactions', {}, token)
        ]);
        Object.assign(data, normalizeData({ branches, users, candidates, jobs, applications, transactions }));
        store.loading = false; store.error = null; notify();
      } catch (error) { store.error = error; store.loading = false; notify(); throw error; }
    },
    async addCandidate(candidate) { await request('/candidates', { method: 'POST', body: JSON.stringify({ ...candidate, status: apiStatus(candidate.status) }) }, token); await store.refresh(); },
    async updateCandidate(id, changes) { await request(`/candidates/${id}`, { method: 'PATCH', body: JSON.stringify({ ...changes, status: changes.status ? apiStatus(changes.status) : undefined }) }, token); await store.refresh(); },
    async addApplication(application) { await request('/applications', { method: 'POST', body: JSON.stringify({ ...application, status: apiStatus(application.status) }) }, token); await store.refresh(); },
    async addJob(job) { await request('/jobs', { method: 'POST', body: JSON.stringify(job) }, token); await store.refresh(); },
    async updateTransaction(id, status) { await request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: apiStatus(status) }) }, token); await store.refresh(); },
    async addTransaction(transaction) { await request('/transactions', { method: 'POST', body: JSON.stringify(transaction) }, token); await store.refresh(); },
    async addBranch(branch) { await request('/branches', { method: 'POST', body: JSON.stringify(branch) }, token); await store.refresh(); },
    async addUser(user) { await request('/users', { method: 'POST', body: JSON.stringify(user) }, token); await store.refresh(); },
    async updateUser(id, user) { await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(user) }, token); await store.refresh(); }
  };
  function notify() { listeners.forEach(listener => listener(store)); }
  return store;
}
