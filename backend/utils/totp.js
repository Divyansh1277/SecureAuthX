/**
 * TOTP Utility – Google Authenticator integration via speakeasy
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const totpUtil = {
  /**
   * Generate a new TOTP secret for a user
   */
  generateSecret(username) {
    const secret = speakeasy.generateSecret({
      name: `SecureAuthX:${username}`,
      issuer: 'SecureAuthX',
      length: 20
    });
    return {
      base32: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  },

  /**
   * Generate a QR code data URL from an otpauth URL
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });
      return qrDataUrl;
    } catch (err) {
      console.error('QR Code generation error:', err);
      throw new Error('Failed to generate QR code');
    }
  },

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2  // Allow 2 intervals of tolerance (60 seconds)
    });
  }
};

module.exports = totpUtil;
