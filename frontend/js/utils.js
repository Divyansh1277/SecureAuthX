/**
 * SecureAuthX – Utility Functions
 * Toast notifications, OTP inputs, spinners, countdown, idle timeout
 */

// ─── Toast Notification System ──────────────────────────────────

function showToast(type, title, message, duration = 5000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Loading Spinner ────────────────────────────────────────────

function showSpinner() {
  const overlay = document.getElementById('spinnerOverlay');
  if (overlay) overlay.classList.add('active');
}

function hideSpinner() {
  const overlay = document.getElementById('spinnerOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ─── OTP Input Handling ─────────────────────────────────────────

function initOtpInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const inputs = container.querySelectorAll('.otp-input');

  inputs.forEach((input, index) => {
    // Input event – auto-advance
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = value;

      if (value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }

      // Add filled class
      e.target.classList.toggle('filled', !!value);
    });

    // Keydown – handle backspace
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
        inputs[index - 1].classList.remove('filled');
      }
    });

    // Paste handling
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[^0-9]/g, '')
        .slice(0, 6);

      pasteData.split('').forEach((digit, i) => {
        if (inputs[i]) {
          inputs[i].value = digit;
          inputs[i].classList.add('filled');
        }
      });

      if (inputs[pasteData.length - 1]) {
        inputs[pasteData.length - 1].focus();
      }
    });

    // Focus styling
    input.addEventListener('focus', () => {
      input.select();
    });
  });

  // Focus first input
  if (inputs[0]) inputs[0].focus();
}

function getOtpValue(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return '';
  const inputs = container.querySelectorAll('.otp-input');
  return Array.from(inputs).map(i => i.value).join('');
}

function clearOtpInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.otp-input');
  inputs.forEach(i => {
    i.value = '';
    i.classList.remove('filled');
  });
  if (inputs[0]) inputs[0].focus();
}

// ─── Date Formatting ────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr.includes('Z') ? dateStr : dateStr + 'Z');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr.includes('Z') ? dateStr : dateStr + 'Z');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr.includes('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

// ─── Idle Timeout (Auto-Logout) ─────────────────────────────────

function initIdleTimeout(timeoutMs = 15 * 60 * 1000) {
  let idleTimer;

  function resetTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      showToast('warning', 'Session Expired', 'You have been logged out due to inactivity.');
      setTimeout(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = '/login';
      }, 2000);
    }, timeoutMs);
  }

  ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true });
  });

  resetTimer();
}

// ─── Number Animation ───────────────────────────────────────────

function animateNumber(element, target, duration = 1200) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ─── Sidebar Toggle (Mobile) ────────────────────────────────────

function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }
  }
}

// ─── Dashboard Navigation ───────────────────────────────────────

function initDashboardNav(navMap) {
  Object.entries(navMap).forEach(([navId, viewId]) => {
    const nav = document.getElementById(navId);
    if (nav) {
      nav.addEventListener('click', () => {
        // Hide all views
        Object.values(navMap).forEach(vId => {
          const view = document.getElementById(vId);
          if (view) view.classList.add('hidden');
        });

        // Deactivate all nav links
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

        // Show selected view
        const view = document.getElementById(viewId);
        if (view) view.classList.remove('hidden');

        // Activate nav link
        nav.classList.add('active');

        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
      });
    }
  });
}
