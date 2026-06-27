// All API calls use relative /api path so they work through nginx in production
// and can be overridden via NEXT_PUBLIC_API_URL for local dev
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function analyzeDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAnalysis(docId) {
  const res = await fetch(`${API_BASE}/analysis/${docId}`);
  if (!res.ok) throw new Error('Analysis not found');
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Could not fetch history');
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Could not fetch config');
  return res.json();
}
