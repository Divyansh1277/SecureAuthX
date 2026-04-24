/**
 * SecureAuthX – Admin Dashboard Logic
 * Chart.js visualizations, user management, system logs
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth(['admin']);
  if (!user) return;

  // Set user info
  document.getElementById('sidebarUsername').textContent = user.username;
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();

  // Initialize navigation
  initSidebarToggle();
  initDashboardNav({
    navDashboard: 'dashboardView',
    navAnalytics: 'analyticsView',
    navUsers: 'usersView',
    navLogs: 'logsView'
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
  initIdleTimeout(15 * 60 * 1000);

  // Load dashboard data
  loadAdminDashboard();

  // Auto-refresh every 30 seconds
  setInterval(loadAdminDashboard, 30000);

  // Delete user event listener
  let userToDelete = null;
  const deleteModal = document.getElementById('deleteModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  document.getElementById('usersTableBody').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-user-btn')) {
      userToDelete = e.target.getAttribute('data-id');
      if (deleteModal) deleteModal.style.display = 'flex';
    }
  });

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.style.display = 'none';
      userToDelete = null;
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!userToDelete) return;
      
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';
      
      try {
        const res = await apiRequest(`/api/admin/users/${userToDelete}`, { method: 'DELETE' });
        if (res.success) {
          showToast('success', 'User Deleted', res.message);
          loadAllUsers();
          loadAdminDashboard();
        } else {
          showToast('error', 'Error', res.message);
        }
      } catch (err) {
        showToast('error', 'Error', 'Failed to delete user.');
      } finally {
        deleteModal.style.display = 'none';
        userToDelete = null;
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete';
      }
    });
  }
});

let loginResultsChart = null;
let roleDistChart = null;
let systemActivityChart = null;
let analyticsChart = null;
let successRateChart = null;

async function loadAdminDashboard() {
  try {
    const res = await apiGet('/api/admin/dashboard');
    if (!res.success) {
      showToast('error', 'Error', res.message);
      return;
    }

    const { stats, roleDistribution, loginActivity, recentLogs } = res.data;

    // ── Update Stats ──
    animateNumber(document.getElementById('statUsers'), stats.totalUsers);
    animateNumber(document.getElementById('statSuccess'), stats.successfulLogins);
    animateNumber(document.getElementById('statFailed'), stats.failedLogins);
    animateNumber(document.getElementById('statTotal'), stats.totalLoginAttempts);

    document.getElementById('userCountBadge').textContent = stats.totalUsers;

    // ── Charts ──
    renderLoginResultsChart(stats);
    renderRoleDistChart(roleDistribution);
    renderSystemActivityChart(loginActivity);
    renderAnalyticsChart(loginActivity);
    renderSuccessRateChart(stats);

    // ── Threat Level ──
    updateThreatLevel(stats);

    // ── Recent Logs ──
    renderAdminLogs(recentLogs, 'recentLogsBody');
    document.getElementById('logsCount').textContent = `${recentLogs.length} entries`;

    // ── Load users and all logs ──
    loadAllUsers();
    loadAllLogs();

  } catch (err) {
    console.error('Admin dashboard error:', err);
    showToast('error', 'Error', 'Failed to load dashboard data.');
  }
}

// ─── Login Results Bar Chart ────────────────────────────────────

function renderLoginResultsChart(stats) {
  const ctx = document.getElementById('loginResultsChart');
  if (!ctx) return;

  const data = {
    labels: ['Successful', 'Failed'],
    datasets: [{
      data: [stats.successfulLogins, stats.failedLogins],
      backgroundColor: [
        'rgba(34, 197, 94, 0.85)',
        'rgba(239, 68, 68, 0.85)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 48
    }]
  };

  if (loginResultsChart) {
    loginResultsChart.data = data;
    loginResultsChart.update('none');
    return;
  }

  loginResultsChart = new Chart(ctx, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} login attempts`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
            color: '#475569'
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

// ─── Role Distribution Pie/Doughnut ─────────────────────────────

function renderRoleDistChart(roleDistribution) {
  const ctx = document.getElementById('roleDistChart');
  if (!ctx) return;

  const roleLabels = roleDistribution.map(r => r.role.charAt(0).toUpperCase() + r.role.slice(1));
  const roleCounts = roleDistribution.map(r => r.count);
  const roleColors = roleDistribution.map(r =>
    r.role === 'admin' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(37, 99, 235, 0.85)'
  );
  const roleBorders = roleDistribution.map(r =>
    r.role === 'admin' ? 'rgba(245, 158, 11, 1)' : 'rgba(37, 99, 235, 1)'
  );

  const data = {
    labels: roleLabels,
    datasets: [{
      data: roleCounts,
      backgroundColor: roleColors,
      borderColor: roleBorders,
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  if (roleDistChart) {
    roleDistChart.data = data;
    roleDistChart.update('none');
    return;
  }

  roleDistChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            color: '#475569'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} users`
          }
        }
      }
    }
  });
}

// ─── System Activity Line Chart ─────────────────────────────────

function renderSystemActivityChart(loginActivity) {
  const ctx = document.getElementById('systemActivityChart');
  if (!ctx) return;

  // Generate last 30 days labels
  const labels = [];
  const successData = [];
  const failureData = [];
  const totalData = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const activity = loginActivity.find(a => a.date === dateStr);
    const s = activity ? activity.success_count : 0;
    const f = activity ? activity.failure_count : 0;
    successData.push(s);
    failureData.push(f);
    totalData.push(s + f);
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Total',
        data: totalData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Successful',
        data: successData,
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#22c55e'
      },
      {
        label: 'Failed',
        data: failureData,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#ef4444'
      }
    ]
  };

  if (systemActivityChart) {
    systemActivityChart.data = data;
    systemActivityChart.update('none');
    return;
  }

  systemActivityChart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
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
            font: { family: "'Inter', sans-serif", size: 10 },
            color: '#94a3b8',
            maxTicksLimit: 10
          },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
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

// ─── Analytics Extended Chart ───────────────────────────────────

function renderAnalyticsChart(loginActivity) {
  const ctx = document.getElementById('analyticsChart');
  if (!ctx) return;

  const labels = [];
  const successData = [];
  const failureData = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const activity = loginActivity.find(a => a.date === dateStr);
    successData.push(activity ? activity.success_count : 0);
    failureData.push(activity ? activity.failure_count : 0);
  }

  if (analyticsChart) {
    analyticsChart.data.labels = labels;
    analyticsChart.data.datasets[0].data = successData;
    analyticsChart.data.datasets[1].data = failureData;
    analyticsChart.update('none');
    return;
  }

  analyticsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Successful',
          data: successData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Failed',
          data: failureData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 10 },
            color: '#94a3b8',
            maxTicksLimit: 10
          },
          border: { display: false }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
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

// ─── Success Rate Doughnut ──────────────────────────────────────

function renderSuccessRateChart(stats) {
  const ctx = document.getElementById('successRateChart');
  if (!ctx) return;

  const total = stats.successfulLogins + stats.failedLogins;
  const rate = total > 0 ? Math.round((stats.successfulLogins / total) * 100) : 100;

  const data = {
    labels: ['Success', 'Failed'],
    datasets: [{
      data: [stats.successfulLogins, stats.failedLogins],
      backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(226, 232, 240, 0.6)'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  if (successRateChart) {
    successRateChart.data = data;
    successRateChart.options.plugins.centerText = { text: rate + '%' };
    successRateChart.update('none');
    return;
  }

  // Plugin for center text
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rate + '%', width / 2, height / 2 - 8);
      ctx.font = "500 12px 'Inter', sans-serif";
      ctx.fillStyle = '#64748b';
      ctx.fillText('Success Rate', width / 2, height / 2 + 16);
      ctx.restore();
    }
  };

  successRateChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    plugins: [centerTextPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} attempts`
          }
        }
      }
    }
  });
}

// ─── Threat Level ───────────────────────────────────────────────

function updateThreatLevel(stats) {
  const total = stats.successfulLogins + stats.failedLogins;
  const failRate = total > 0 ? (stats.failedLogins / total) : 0;

  const threatEl = document.getElementById('threatLevel');
  const threatText = document.getElementById('threatText');
  const threatBar = document.getElementById('threatBar');

  const shieldCheck = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  const shieldAlert = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  const shieldX = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>';

  if (failRate < 0.15) {
    if (threatEl) { threatEl.innerHTML = shieldCheck; threatEl.style.color = 'var(--success-500)'; }
    if (threatText) { threatText.textContent = 'Low'; threatText.style.color = 'var(--success-600)'; }
    if (threatBar) { threatBar.style.width = (failRate * 100 * 3) + '%'; threatBar.className = 'progress-fill success'; }
  } else if (failRate < 0.35) {
    if (threatEl) { threatEl.innerHTML = shieldAlert; threatEl.style.color = 'var(--warning-500)'; }
    if (threatText) { threatText.textContent = 'Medium'; threatText.style.color = 'var(--warning-600)'; }
    if (threatBar) { threatBar.style.width = (failRate * 100) + '%'; threatBar.className = 'progress-fill warning'; }
  } else {
    if (threatEl) { threatEl.innerHTML = shieldX; threatEl.style.color = 'var(--danger-500)'; }
    if (threatText) { threatText.textContent = 'High'; threatText.style.color = 'var(--danger-600)'; }
    if (threatBar) { threatBar.style.width = (failRate * 100) + '%'; threatBar.className = 'progress-fill danger'; }
  }
}

// ─── Admin Logs Table ───────────────────────────────────────────

function renderAdminLogs(logs, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 48px; color: var(--text-tertiary);">
          No system logs recorded yet
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>
        <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
          ${log.status === 'success' ? '✓' : '✕'} ${log.status}
        </span>
      </td>
      <td style="font-weight: 600;">${log.username || '—'}</td>
      <td>${log.action}</td>
      <td style="font-size: 0.8125rem; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.details || '—'}</td>
      <td><code style="font-size: 0.75rem; background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">${log.ip || '—'}</code></td>
      <td style="color: var(--text-tertiary); font-size: 0.8125rem; white-space: nowrap;">${formatDateTime(log.timestamp)}</td>
    </tr>
  `).join('');
}

// ─── Load All Users ─────────────────────────────────────────────

async function loadAllUsers() {
  try {
    const res = await apiGet('/api/admin/users');
    if (!res.success) return;

    const tbody = document.getElementById('usersTableBody');
    const countEl = document.getElementById('totalUsersCount');

    if (countEl) countEl.textContent = `${res.data.length} users`;

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 48px; color: var(--text-tertiary);">No users found</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${u.role === 'admin' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #93c5fd, #3b82f6)'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem;">
              ${u.username.charAt(0).toUpperCase()}
            </div>
            <span style="font-weight: 600;">${u.username}</span>
          </div>
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">${u.email}</td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}">
            ${u.role}
          </span>
        </td>
        <td>
          <span class="badge ${u.mfaEnabled ? 'badge-success' : 'badge-neutral'}">
            ${u.mfaEnabled ? 'Active' : 'Off'}
          </span>
        </td>
        <td>
          ${u.locked
            ? '<span class="badge badge-danger">Locked</span>'
            : '<span class="badge badge-success">Active</span>'}
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-tertiary);">${formatTimeAgo(u.lastLogin)}</td>
        <td style="font-size: 0.8125rem; color: var(--text-tertiary);">${formatDate(u.createdAt)}</td>
        <td>
          ${u.role !== 'admin' 
            ? `<button class="btn btn-ghost btn-sm delete-user-btn" data-id="${u.id}" style="color: var(--danger-600); padding: 4px 8px; font-size: 0.75rem;">Delete</button>` 
            : '<span style="color: var(--text-tertiary); font-size: 0.75rem;">—</span>'}
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Load users error:', err);
  }
}

// ─── Load All Logs ──────────────────────────────────────────────

async function loadAllLogs() {
  try {
    const res = await apiGet('/api/admin/logs');
    if (!res.success) return;

    const tbody = document.getElementById('allLogsBody');
    const countEl = document.getElementById('allLogsCount');

    if (countEl) countEl.textContent = `${res.data.length} entries`;

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 48px; color: var(--text-tertiary);">No logs yet</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(log => `
      <tr>
        <td>
          <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
            ${log.status === 'success' ? '✓' : '✕'} ${log.status}
          </span>
        </td>
        <td style="font-weight: 600;">${log.username || '—'}</td>
        <td>${log.action}</td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.details || '—'}</td>
        <td><code style="font-size: 0.75rem; background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">${log.ip || '—'}</code></td>
        <td style="color: var(--text-tertiary); font-size: 0.8125rem; white-space: nowrap;">${formatDateTime(log.timestamp)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Load logs error:', err);
  }
}
