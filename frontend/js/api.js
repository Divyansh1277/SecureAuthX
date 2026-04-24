/**
 * SecureAuthX – API Client
 * Fetch wrapper with JWT authentication and error handling
 */

const API_BASE = '';

/**
 * Make an authenticated API request
 */
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(API_BASE + url, {
      ...options,
      headers,
      credentials: 'include'
    });

    const data = await response.json();

    // Handle 401 – auto logout
    if (response.status === 401) {
      const path = window.location.pathname;
      const excludedPaths = ['/login', '/signup', '/verify-otp', '/forgot-password'];
      const isExcluded = excludedPaths.some(p => path.includes(p));

      if (!isExcluded) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        showToast('error', 'Session Expired', 'Please log in again.');
        setTimeout(() => window.location.href = '/login', 1500);
      }
    }

    // Handle 403 – access denied
    if (response.status === 403) {
      window.location.href = '/access-denied';
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * GET request
 */
async function apiGet(url) {
  return apiRequest(url, { method: 'GET' });
}

/**
 * POST request
 */
async function apiPost(url, body) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Check authentication status and redirect if needed
 */
function requireAuth(allowedRoles = []) {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('authUser') || 'null');

  if (!token || !user) {
    window.location.href = '/login';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = '/access-denied';
    return null;
  }

  return user;
}

/**
 * Logout
 */
function logout(skipConfirm = false) {
  if (!skipConfirm && !confirm("Are you sure you want to log out?")) {
    return;
  }
  apiPost('/api/auth/logout', {}).catch(() => {});
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  sessionStorage.clear();
  window.location.href = '/login';
}
