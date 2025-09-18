// utils/mailer.js
import nodemailer from "nodemailer";

/**
 * Creates and returns a configured Nodemailer transporter
 */
export function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: String(SMTP_SECURE || "false") === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Sends an email using the configured transporter
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.from - Sender email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export async function sendOrderEmail({ to, from, subject, text, html }) {
  const transporter = createTransporter();
  return transporter.sendMail({ from, to, subject, text, html });
}