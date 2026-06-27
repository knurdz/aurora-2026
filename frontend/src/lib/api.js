// All API calls use relative /api path so they work through nginx in production
// and can be overridden via NEXT_PUBLIC_API_URL for local dev
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || res.statusText);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function getApiBase() {
  return API_BASE;
}

export function getGoogleLoginUrl(nextPath = '/dashboard') {
  const next = encodeURIComponent(nextPath);
  return `${API_BASE}/auth/google/start?next=${next}`;
}

export async function getCurrentUser() {
  return request('/auth/me');
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function analyzeDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/analyze', { method: 'POST', body: formData });
}

export async function getAnalysis(docId) {
  return request(`/analysis/${docId}`);
}

export async function getHistory() {
  return request('/history');
}

export async function getHealth() {
  return request('/health');
}

export async function getConfig() {
  return request('/config');
}

export async function getDashboardSummary() {
  return request('/dashboard/summary');
}

export async function getApiKeys() {
  return request('/dashboard/api-keys');
}

export async function createApiKey(name) {
  return request('/dashboard/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(keyId) {
  return request(`/dashboard/api-keys/${keyId}`, { method: 'DELETE' });
}
