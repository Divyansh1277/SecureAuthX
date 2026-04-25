/**
 * Input Validators – Password strength, email format, sanitization
 * Prevents SQL injection and buffer overflow via strict validation
 */

const validators = {
  /**
   * Validate password strength
   * Returns { valid, score, feedback[] }
   */
  validatePassword(password) {
    const feedback = [];
    let score = 0;

    if (!password || typeof password !== 'string') {
      return { valid: false, score: 0, feedback: ['Password is required'] };
    }

    // Buffer overflow prevention – cap length
    if (password.length > 128) {
      return { valid: false, score: 0, feedback: ['Password must not exceed 128 characters'] };
    }

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters required');

    if (password.length >= 12) score++;

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('At least one uppercase letter required');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('At least one lowercase letter required');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('At least one digit required');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    else feedback.push('At least one special character required');

    const valid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) &&
                  /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let strength = 'weak';
    if (score >= 6) strength = 'very-strong';
    else if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return { valid, score, strength, feedback };
  },

  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 254) return false;  // RFC 5321 limit
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  },

  /**
   * Validate username format
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 3 || username.length > 30) return false;
    return /^[a-zA-Z0-9_]+$/.test(username);
  },

  /**
   * Sanitize input – trim whitespace and cap length
   * Prevents buffer overflow via input size limits
   */
  sanitizeInput(input, maxLength = 255) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
  },

  /**
   * Validate OTP format (6 digits)
   */
  validateOtp(otp) {
    if (!otp || typeof otp !== 'string') return false;
    return /^\d{6}$/.test(otp.trim());
  }
};

module.exports = validators;
