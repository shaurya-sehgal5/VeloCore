// Central place for every API base URL and environment-driven setting.
// Vite exposes env vars prefixed with VITE_ via import.meta.env, so ops/deploy
// configs can override these without touching code.
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AUTH_BASE = `${API_ROOT}/api/auth`;
export const DASH_BASE = `${API_ROOT}/api/dashboard`;
export const ENV_BASE = `${API_ROOT}/api/env`;
export const SERVICES_BASE = `${API_ROOT}/api/deployments`; // GET /:id/runtime — confirmed real
export const REDEPLOY_BASE = `${API_ROOT}/api/deploy/redeploy`; // confirmed real (seen in backend logs)
// UNCONFIRMED — restart/stop follow the same /api/deploy/<verb>/:id shape as the
// confirmed redeploy route above. Point this at the real routes once confirmed.
export const ACTION_BASE = `${API_ROOT}/api/deployments`;
export const SOCKET_URL = API_ROOT;

// Grafana link is intentionally configurable and never embedded in the page.
export const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3001';

export const FREE_TIER_LIMIT = 2;
export const MONO = "'JetBrains Mono', monospace";
