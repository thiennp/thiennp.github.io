export type RuntimeMode = 'live' | 'static';

export function getRuntimeMode(): RuntimeMode {
  if (typeof window === 'undefined') {
    return 'static';
  }

  const host = window.location.hostname;
  const port = window.location.port;
  if (host === 'thiennp.github.io') {
    return 'static';
  }
  if (host === '127.0.0.1' || host === 'localhost') {
    if (port === '3120' || port === '3121') {
      return 'live';
    }
  }

  return 'static';
}

export function getDashboardUrl(mode: RuntimeMode) {
  if (mode === 'live') {
    return '/api/dashboard';
  }
  if (typeof window === 'undefined') {
    return '/report/dashboard.json';
  }
  return new URL('dashboard.json', window.location.href).toString();
}

export function getHealthUrl(mode: RuntimeMode) {
  if (mode === 'live') {
    return '/api/health';
  }
  return '';
}

export function getWebSocketUrl(mode: RuntimeMode) {
  if (mode !== 'live' || typeof window === 'undefined') {
    return '';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}
