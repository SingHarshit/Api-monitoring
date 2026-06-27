// backend/src/services/emailService.js
const nodemailer = require('nodemailer')

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  })
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !to) {
    return false
  }

  const transporter = createTransporter()

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  })

  return true
}

module.exports = {
  sendEmail,
}