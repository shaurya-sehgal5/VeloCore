// config.js
const API_ROOT = import.meta.env.VITE_API_URL || "";

export const AUTH_BASE = `${API_ROOT}/api/auth`;
export const DASH_BASE = `${API_ROOT}/api/dashboard`;
export const DASHBOARD_BASE = DASH_BASE;

export const ENV_BASE = `${API_ROOT}/api/env`;
export const SERVICES_BASE = `${API_ROOT}/api/deployments`;
export const REDEPLOY_BASE = `${API_ROOT}/api/deploy/redeploy`;
export const ACTION_BASE = `${API_ROOT}/api/deployments`;

export const SOCKET_URL = API_ROOT;

export const FRONTEND_URL =
  import.meta.env.VITE_FRONTEND_URL || window.location.origin;

export const GRAFANA_URL =
  import.meta.env.VITE_GRAFANA_URL || "http://3.110.163.70:30030";

export const KUBERNETES_DASHBOARD_URL = import.meta.env.VITE_KUBERNETES_DASHBOARD_URL ||
  `${GRAFANA_URL}/d/velocore-user-dashboard-1/velocore-deployment-dashboard`;

export const GITHUB_CLIENT_ID =
  import.meta.env.VITE_GITHUB_CLIENT_ID;

export const FREE_TIER_LIMIT = 2;

export const MONO = "'JetBrains Mono', monospace";

export const CONFIG = {
  API_ROOT,
  AUTH_BASE,
  DASH_BASE,
  DASHBOARD_BASE,
  ENV_BASE,
  SERVICES_BASE,
  REDEPLOY_BASE,
  ACTION_BASE,
  SOCKET_URL,
  FRONTEND_URL,
  GRAFANA_URL,
  KUBERNETES_DASHBOARD_URL,
  GITHUB_CLIENT_ID,
  FREE_TIER_LIMIT,
  MONO,
};

export default CONFIG;