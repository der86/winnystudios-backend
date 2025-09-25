// utils/mailer.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendOrderEmail = async ({ to, from, subject, text, html }) => {
  try {
    const msg = { to, from, subject, text, html };
    await sgMail.send(msg);
    console.log("✅ Order email sent successfully");
  } catch (error) {
    console.error(
      "❌ Failed to send email:",
      error.response?.body || error.message
    );
    throw new Error("Email sending failed");
  }
};
