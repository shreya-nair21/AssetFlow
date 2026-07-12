const BASE_URL = 'http://localhost:5000/api';

export function getToken(): string | null {
  return localStorage.getItem('assetflow_token');
}

export function setToken(token: string) {
  localStorage.setItem('assetflow_token', token);
}

export function removeToken() {
  localStorage.removeItem('assetflow_token');
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('assetflow_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: any) {
  localStorage.setItem('assetflow_user', JSON.stringify(user));
}

export function removeCurrentUser() {
  localStorage.removeItem('assetflow_user');
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Clear credentials on session expiration
      removeToken();
      removeCurrentUser();
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup') && window.location.pathname !== '/') {
        window.location.href = '/login?expired=true';
      }
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP Error ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};
