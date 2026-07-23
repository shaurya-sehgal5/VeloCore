
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const AUTH_BASE = `${API_ROOT}/api/auth`;
export const DASH_BASE = `${API_ROOT}/api/dashboard`;
export const ENV_BASE = `${API_ROOT}/api/env`;
export const SERVICES_BASE = `${API_ROOT}/api/deployments`; 
export const REDEPLOY_BASE = `${API_ROOT}/api/deploy/redeploy`; 
export const ACTION_BASE = `${API_ROOT}/api/deployments`;
export const SOCKET_URL = API_ROOT;
export const DOCKER_DASHBOARD_URL = "localhost:3500";
export const KUBERNETES_DASHBOARD_URL = "localhost:3600";

export const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3001';

export const FREE_TIER_LIMIT = 2;
export const MONO = "'JetBrains Mono', monospace";
