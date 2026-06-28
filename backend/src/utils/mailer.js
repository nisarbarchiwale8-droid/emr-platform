import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export const sendMail = async ({ to, subject, html }) => {
  if (!env.SMTP_USER || env.SMTP_USER.includes('your-email')) {
    logger.warn(`[Mailer] SMTP not configured — email to ${to} skipped. Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    logger.info(`[Mailer] Email sent to ${to}`);
  } catch (err) {
    logger.error(`[Mailer] Failed to send email to ${to}: ${err.message}`);
  }
};

export const sendClinicWelcomeEmail = async ({ to, firstName, clinicName, email, password, planName }) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EMR Platform</title>
</head>
<body style="margin:0;padding:0;background:#F5F6FA;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(180deg,#6C63FF,#4B50D1);padding:40px 40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:28px;">🏥</span>
              </div>
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Welcome to EMR Platform</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Your clinic is ready to go paperless</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1F2937;font-size:16px;margin:0 0 8px;">Hi ${firstName},</p>
              <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Congratulations! <strong style="color:#1F2937;">${clinicName}</strong> has been registered on EMR Platform
                with the <strong style="color:#5A5FEF;">${planName}</strong> plan. Your account is now active.
              </p>

              <!-- Credentials Box -->
              <div style="background:#F5F6FA;border:1px solid #E6E8EC;border-radius:10px;padding:24px;margin-bottom:24px;">
                <p style="color:#1F2937;font-weight:600;font-size:14px;margin:0 0 16px;">🔑 Your Login Credentials</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#9CA3AF;font-size:13px;padding-bottom:10px;width:110px;">Login URL</td>
                    <td style="color:#5A5FEF;font-size:13px;padding-bottom:10px;font-weight:500;">http://localhost:5173</td>
                  </tr>
                  <tr>
                    <td style="color:#9CA3AF;font-size:13px;padding-bottom:10px;">Email</td>
                    <td style="color:#1F2937;font-size:13px;padding-bottom:10px;font-weight:500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="color:#9CA3AF;font-size:13px;">Password</td>
                    <td style="font-size:13px;">
                      <span style="background:#EEF0FF;color:#5A5FEF;padding:4px 12px;border-radius:6px;font-weight:600;font-family:monospace;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;margin-bottom:24px;">
                <p style="color:#166534;font-size:13px;margin:0;">
                  🔒 <strong>Security tip:</strong> Please change your password after your first login via Settings → Change Password.
                </p>
              </div>

              <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0;">
                If you need any help getting started, reply to this email and our support team will assist you.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E6E8EC;padding:24px 40px;text-align:center;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">
                EMR Platform · Designed for small clinics in India<br>
                © 2025 EMR Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  await sendMail({ to, subject: `Welcome to EMR Platform — ${clinicName} is live!`, html });
};
