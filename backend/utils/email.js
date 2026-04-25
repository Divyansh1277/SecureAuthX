/**
 * Email Utility – Send OTP emails via Nodemailer
 */

const nodemailer = require('nodemailer');

// Create transporter – uses Ethereal in development
let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // If real credentials are provided, use them
  if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('ethereal')) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Create Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('✓ Using Ethereal test email account:', testAccount.user);
  }

  return transporter;
}

/**
 * Send an OTP code via email
 */
async function sendOTP(email, otp, username) {
  try {
    const transport = await getTransporter();

    const mailOptions = {
      from: `"SecureAuthX" <${process.env.EMAIL_FROM || 'noreply@secureauthx.com'}>`,
      to: email,
      subject: 'SecureAuthX – Your Verification Code',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563eb; font-size: 24px; margin: 0;">🔐 SecureAuthX</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="color: #1e293b; font-size: 16px; margin: 0 0 8px;">Hello <strong>${username}</strong>,</p>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Use the following code to verify your identity:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; background: #eff6ff; color: #2563eb; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 32px; border-radius: 8px; border: 2px dashed #93c5fd;">
                ${otp}
              </span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">This code expires in <strong>5 minutes</strong>.</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    };

    const info = await transport.sendMail(mailOptions);

    // Log Ethereal preview URL in development
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📧 Email preview URL:', previewUrl);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOTP };
