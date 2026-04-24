/**
 * SecureAuthX – Auth Page Handlers
 * Login form, signup form, password requirements, attempt tracking
 */

// ─── Login Page ─────────────────────────────────────────────────

function initLoginPage() {
  const form = document.getElementById('loginForm');
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  // Password visibility toggle
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }

  // Login form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showToast('error', 'Missing Fields', 'Please enter both username and password.');
        return;
      }

      const btn = document.getElementById('loginBtn');
      btn.classList.add('btn-loading');
      showSpinner();

      try {
        const res = await apiPost('/api/auth/login', { username, password });

        if (res.success) {
          // Clear attempt warning on success
          hideAttemptWarning();

          if (res.mfaRequired) {
            sessionStorage.setItem('mfaLogin', JSON.stringify({
              tempToken: res.tempToken,
              userId: res.userId
            }));
            showToast('success', 'Password Verified', 'Please complete MFA verification.');
            setTimeout(() => window.location.href = '/verify-otp', 800);
          } else {
            localStorage.setItem('authToken', res.token);
            localStorage.setItem('authUser', JSON.stringify(res.user));
            showToast('success', 'Welcome!', `Logged in as ${res.user.username}`);
            setTimeout(() => {
              window.location.href = res.user.role === 'admin' ? '/admin' : '/dashboard';
            }, 800);
          }
        } else {
          // Handle locked account
          if (res.remainingMinutes && res.lockedUntil) {
            showLockCountdown(res.lockedUntil);
          }

          // Show remaining attempts warning
          if (res.attemptsRemaining !== undefined) {
            showAttemptWarning(res.attemptsRemaining);
          }

          showToast('error', 'Login Failed', res.message);
        }
      } catch (err) {
        showToast('error', 'Connection Error', 'Unable to connect to the server.');
      } finally {
        btn.classList.remove('btn-loading');
        hideSpinner();
      }
    });
  }
}

function showAttemptWarning(remaining) {
  const container = document.getElementById('attemptWarning');
  if (!container) return;

  container.className = remaining <= 2 ? 'attempt-warning critical' : 'attempt-warning';
  container.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span>You have <strong>${remaining}</strong> attempt${remaining !== 1 ? 's' : ''} remaining before your account is locked.</span>
  `;
  container.classList.remove('hidden');
}

function hideAttemptWarning() {
  const container = document.getElementById('attemptWarning');
  if (container) container.classList.add('hidden');
}

function showLockCountdown(lockedUntil) {
  const lockDiv = document.getElementById('lockCountdown');
  const timerEl = document.getElementById('lockTimer');
  const form = document.getElementById('loginForm');

  if (!lockDiv || !timerEl) return;

  lockDiv.classList.remove('hidden');
  hideAttemptWarning();
  if (form) form.style.opacity = '0.4';
  if (form) form.style.pointerEvents = 'none';

  const lockTime = new Date(lockedUntil.includes('Z') ? lockedUntil : lockedUntil + 'Z');

  const interval = setInterval(() => {
    const now = new Date();
    const diff = lockTime - now;

    if (diff <= 0) {
      clearInterval(interval);
      lockDiv.classList.add('hidden');
      if (form) form.style.opacity = '1';
      if (form) form.style.pointerEvents = 'auto';
      showToast('info', 'Account Unlocked', 'You can try logging in again.');
      return;
    }

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

// ─── Signup Page ────────────────────────────────────────────────

function initSignupPage() {
  const form = document.getElementById('signupForm');
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');

  // Password visibility toggle
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }

  // Password requirements checklist
  if (passwordInput) {
    passwordInput.addEventListener('focus', () => {
      const reqBox = document.getElementById('passwordRequirements');
      if (reqBox) reqBox.style.display = 'block';
    });

    passwordInput.addEventListener('input', () => {
      const val = passwordInput.value;
      updatePasswordRequirements(val);
    });
  }

  // Confirm password match
  if (confirmInput) {
    confirmInput.addEventListener('input', () => {
      const errorEl = document.getElementById('confirmError');
      if (confirmInput.value && confirmInput.value !== passwordInput.value) {
        confirmInput.classList.add('error');
        confirmInput.classList.remove('success');
        if (errorEl) errorEl.classList.remove('hidden');
      } else {
        confirmInput.classList.remove('error');
        if (errorEl) errorEl.classList.add('hidden');
        if (confirmInput.value === passwordInput.value && confirmInput.value) {
          confirmInput.classList.add('success');
        }
      }
    });
  }

  // Signup form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;

      // Client-side validation
      if (!username || !email || !password || !confirmPassword) {
        showToast('error', 'Missing Fields', 'Please fill in all required fields.');
        return;
      }

      if (password !== confirmPassword) {
        showToast('error', 'Password Mismatch', 'Passwords do not match.');
        return;
      }

      // Check all requirements met
      const reqs = getPasswordRequirements(password);
      const allMet = reqs.length >= 8 && reqs.hasUpper && reqs.hasLower && reqs.hasNumber && reqs.hasSpecial;
      if (!allMet) {
        showToast('error', 'Password Requirements', 'Please meet all password requirements.');
        return;
      }

      const btn = document.getElementById('signupBtn');
      btn.classList.add('btn-loading');
      showSpinner();

      try {
        const res = await apiPost('/api/auth/signup', {
          username,
          email,
          password,
          confirmPassword,
          role: 'user'
        });

        if (res.success) {
          showToast('success', 'Account Created!', 'Set up MFA to secure your account.');

          sessionStorage.setItem('mfaSetup', JSON.stringify(res.mfa));
          sessionStorage.setItem('signupUser', JSON.stringify(res.user));

          setTimeout(() => window.location.href = '/mfa-setup', 1000);
        } else {
          showToast('error', 'Signup Failed', res.message);
          if (res.feedback) {
            res.feedback.forEach(f => showToast('warning', 'Requirement', f, 4000));
          }
        }
      } catch (err) {
        showToast('error', 'Connection Error', 'Unable to connect to the server.');
      } finally {
        btn.classList.remove('btn-loading');
        hideSpinner();
      }
    });
  }
}

// ─── Password Requirements Helpers ──────────────────────────────

function getPasswordRequirements(password) {
  return {
    length: password.length,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password)
  };
}

function updatePasswordRequirements(password) {
  const reqs = getPasswordRequirements(password);

  const checks = {
    reqLength: reqs.length >= 8,
    reqUpper: reqs.hasUpper,
    reqLower: reqs.hasLower,
    reqNumber: reqs.hasNumber,
    reqSpecial: reqs.hasSpecial
  };

  Object.entries(checks).forEach(([id, met]) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('met', met);
    }
  });
}

// ─── Password Strength Calculator ───────────────────────────────

function checkPasswordStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', text: 'Weak' };
  if (score <= 3) return { level: 'medium', text: 'Medium' };
  if (score <= 5) return { level: 'strong', text: 'Strong' };
  return { level: 'very-strong', text: 'Very Strong' };
}
