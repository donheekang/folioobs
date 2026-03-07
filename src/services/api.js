// ========== API SERVICE LAYER ==========
// Future-ready: swap mock data with real SEC 13F API endpoints

const API_BASE = import.meta.env.VITE_API_BASE || "";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ---- In-memory cache ----
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function clearCache(keyPattern) {
  if (!keyPattern) { cache.clear(); return; }
  for (const k of cache.keys()) {
    if (k.includes(keyPattern)) cache.delete(k);
  }
}

// ---- Fetch wrapper with retry ----
async function apiFetch(endpoint, { retries = 2, timeout = 10000, ...opts } = {}) {
  const url = `${API_BASE}${endpoint}`;
  const cacheKey = `${opts.method || "GET"}:${url}`;

  // Check cache for GET
  if (!opts.method || opts.method === "GET") {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(opts.headers || {}),
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = new Error(`API ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.response = res;
        throw err;
      }

      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (err) {
      if (attempt === retries || err.name === "AbortError") {
        clearTimeout(timer);
        throw err;
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
}

// ---- API endpoints (ready for real backend) ----
export const api = {
  // Investors
  getInvestors: () => apiFetch("/api/investors"),
  getInvestor: (id) => apiFetch(`/api/investors/${id}`),

  // Holdings
  getHoldings: (investorId) => apiFetch(`/api/investors/${investorId}/holdings`),
  getAllHoldings: () => apiFetch("/api/holdings"),

  // Quarterly
  getQuarterlyHistory: (investorId) => apiFetch(`/api/investors/${investorId}/history`),
  getQuarterlyActivity: (investorId) => apiFetch(`/api/investors/${investorId}/activity`),

  // Screener
  getScreenerData: (filters) => apiFetch("/api/screener", {
    method: "POST",
    body: JSON.stringify(filters),
  }),

  // Search
  search: (query) => apiFetch(`/api/search?q=${encodeURIComponent(query)}`),

  // SEC 13F filings
  getLatestFilings: () => apiFetch("/api/filings/latest"),
  getFiling: (filingId) => apiFetch(`/api/filings/${filingId}`),
};

export default api;
