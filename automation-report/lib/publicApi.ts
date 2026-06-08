export const AUTOMATION_API_BASE = 'https://thiennp.github.io/api/automation';
export const AUTOMATION_DASHBOARD_URL = `${AUTOMATION_API_BASE}/dashboard.json`;
export const AUTOMATION_WORK_STATUS_URL = `${AUTOMATION_API_BASE}/work-status`;
export const AUTOMATION_API_INDEX_URL = `${AUTOMATION_API_BASE}/index.json`;
export const AUTOMATION_REPOSITORY_DISPATCH_URL =
  'https://api.github.com/repos/thiennp/thiennp.github.io/dispatches';

export function getAutomationDashboardUrl(cacheBust = false) {
  if (!cacheBust) {
    return AUTOMATION_DASHBOARD_URL;
  }
  return `${AUTOMATION_DASHBOARD_URL}?t=${Date.now()}`;
}
