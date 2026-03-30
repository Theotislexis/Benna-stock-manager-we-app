export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const API_BASE = 'http://localhost:5000/api';
  const API_ROOT = 'http://localhost:5000';
  
  const url = endpoint.startsWith('/api') 
    ? `${API_ROOT}${endpoint}` 
    : `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errBody = await res.json();
      errorMsg = errBody.error || errBody.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Handle No Content
  if (res.status === 204) return null;

  return res.json();
}
