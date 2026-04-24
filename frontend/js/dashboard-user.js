/**
 * SecureAuthX – User Dashboard Logic
 * Chart.js visualizations, stats, activity logs
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth(['user', 'admin']);
  if (!user) return;

  // If user is admin, redirect to admin dashboard
  if (user.role === 'admin') {
    window.location.href = '/admin';
    return;
  }

  // Set user info in sidebar
  document.getElementById('sidebarUsername').textContent = user.username;
  document.getElementById('sidebarRole').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('welcomeTitle').textContent = `Welcome, ${user.username}`;
  document.getElementById('roleBadge').textContent = user.role.toUpperCase();

  // Initialize navigation
  initSidebarToggle();
  initDashboardNav({
    navDashboard: 'dashboardView',
    navSecurity: 'securityView',
    navHistory: 'historyView'
  });

  // Logout handler
  const logoutModal = document.getElementById('logoutModal');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'flex';
    else logout();
  });

  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', () => {
      logoutModal.style.display = 'none';
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      logoutModal.style.display = 'none';
      logout(true);
    });
  }

  // Initialize idle timeout
  initIdleTimeout(15 * 60 * 1000); // 15 minutes

  // Load dashboard data
  loadUserDashboard();

  // Auto-refresh every 60 seconds
  setInterval(loadUserDashboard, 60000);
});

let loginActivityChart = null;

async function loadUserDashboard() {
  try {
    const res = await apiGet('/api/user/dashboard');
    if (!res.success) {
      showToast('error', 'Error', res.message);
      return;
    }

    const { user: userData, stats, loginActivity, recentLogs } = res.data;

    // ── Update Stats ──
    animateNumber(document.getElementById('statLogins'), stats.totalLogins);
    document.getElementById('statLastLogin').textContent = formatTimeAgo(userData.lastLogin);
    document.getElementById('statSecurity').textContent = stats.securityScore + '%';

    // Security progress bar
    const secProgress = document.getElementById('securityProgress');
    if (secProgress) {
      secProgress.style.width = stats.securityScore + '%';
      secProgress.className = 'progress-fill';
      if (stats.securityScore >= 80) secProgress.classList.add('success');
      else if (stats.securityScore >= 50) secProgress.classList.add('');
      else secProgress.classList.add('danger');
    }

    // MFA status
    const mfaIcon = document.getElementById('mfaStatusIcon');
    const mfaValue = document.getElementById('statMfa');
    const mfaText = document.getElementById('mfaStatusText');
    const mfaBadge = document.getElementById('mfaBadge');

    if (userData.mfaEnabled) {
      mfaIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      mfaIcon.className = 'stat-icon green';
      mfaValue.textContent = 'Active';
      mfaValue.style.color = 'var(--success-600)';
      mfaText.className = 'stat-change up';
      mfaText.textContent = 'Protected';
      if (mfaBadge) mfaBadge.style.display = 'inline-flex';
    } else {
      mfaIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 3-4.5"/></svg>';
      mfaIcon.className = 'stat-icon red';
      mfaValue.textContent = 'Off';
      mfaValue.style.color = 'var(--danger-600)';
      mfaText.className = 'stat-change down';
      mfaText.textContent = 'Not protected';
    }

    // ── Security Section ──
    updateSecuritySection(userData, stats);

    // ── Login Activity Chart ──
    renderLoginActivityChart(loginActivity);

    // ── Recent Logs Table ──
    renderRecentLogs(recentLogs);

    // ── Load full history for history tab ──
    loadLoginHistory();

  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('error', 'Error', 'Failed to load dashboard data.');
  }
}

function updateSecuritySection(userData, stats) {
  // MFA in security view
  const mfaSecurityIcon = document.getElementById('mfaSecurityIcon');
  const mfaStrengthBar = document.getElementById('mfaStrengthBar');
  const mfaStrengthLabel = document.getElementById('mfaStrengthLabel');
  const secMfaIcon = document.getElementById('secMfaIcon');
  const secMfaLabel = document.getElementById('secMfaLabel');
  const secMfaDesc = document.getElementById('secMfaDesc');

  if (userData.mfaEnabled) {
    if (mfaSecurityIcon) { mfaSecurityIcon.style.background = 'var(--success-50)'; mfaSecurityIcon.style.color = 'var(--success-600)'; mfaSecurityIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'; }
    if (mfaStrengthBar) { mfaStrengthBar.style.width = '100%'; mfaStrengthBar.className = 'progress-fill success'; }
    if (mfaStrengthLabel) mfaStrengthLabel.textContent = 'Active';
    if (secMfaIcon) { secMfaIcon.style.background = 'var(--success-50)'; secMfaIcon.style.color = 'var(--success-600)'; secMfaIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'; }
    if (secMfaLabel) secMfaLabel.textContent = 'MFA Enabled';
    if (secMfaDesc) secMfaDesc.textContent = 'Your account is protected with multi-factor authentication';
  }

  // Account age
  const secAccountAge = document.getElementById('secAccountAge');
  if (secAccountAge) secAccountAge.textContent = formatDate(userData.createdAt);

  // Failed attempts
  const secFailedAttempts = document.getElementById('secFailedAttempts');
  if (secFailedAttempts) secFailedAttempts.textContent = `${stats.failedAttempts} recent failed attempts`;
}

function renderLoginActivityChart(loginActivity) {
  const ctx = document.getElementById('loginActivityChart');
  if (!ctx) return;

  // Generate last 7 days labels
  const labels = [];
  const successData = [];
  const failureData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

    const activity = loginActivity.find(a => a.date === dateStr);
    successData.push(activity ? activity.success_count : 0);
    failureData.push(activity ? activity.failure_count : 0);
  }

  if (loginActivityChart) {
    loginActivityChart.data.labels = labels;
    loginActivityChart.data.datasets[0].data = successData;
    loginActivityChart.data.datasets[1].data = failureData;
    loginActivityChart.update('none');
    return;
  }

  loginActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Successful',
          data: successData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Failed',
          data: failureData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 4
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#94a3b8'
          },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#94a3b8',
            stepSize: 1
          },
          border: { display: false }
        }
      }
    }
  });
}

function renderRecentLogs(logs) {
  const tbody = document.getElementById('recentLogsBody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="padding: 32px; color: var(--text-tertiary);">
          <div class="empty-state-icon" style="color: var(--text-tertiary);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          No activity recorded yet
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = logs.slice(0, 8).map(log => `
    <tr>
      <td>
        <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
          ${log.status === 'success' ? '✓' : '✕'} ${log.status}
        </span>
      </td>
      <td style="font-weight: 500;">${log.action}</td>
      <td><code style="font-size: 0.75rem; background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">${log.ip || '—'}</code></td>
      <td style="color: var(--text-tertiary); font-size: 0.8125rem;">${formatTimeAgo(log.timestamp)}</td>
    </tr>
  `).join('');
}

async function loadLoginHistory() {
  try {
    const res = await apiGet('/api/user/login-history');
    if (!res.success) return;

    const tbody = document.getElementById('fullHistoryBody');
    const count = document.getElementById('historyCount');

    if (count) count.textContent = `${res.data.length} entries`;

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 48px; color: var(--text-tertiary);">
            No login history yet
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(log => `
      <tr>
        <td>
          <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
            ${log.status === 'success' ? '✓' : '✕'} ${log.status}
          </span>
        </td>
        <td style="font-weight: 500;">${log.action}</td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">${log.details || '—'}</td>
        <td><code style="font-size: 0.75rem; background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">${log.ip || '—'}</code></td>
        <td style="color: var(--text-tertiary); font-size: 0.8125rem;">${formatDateTime(log.timestamp)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Login history error:', err);
  }
}
