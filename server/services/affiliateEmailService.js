const nodemailer = require("nodemailer");
const { getAffiliateEmailTemplate } = require("./affiliateEmailTemplates");

let transporterInstance = null;

function getTransporter() {
  if (transporterInstance) return transporterInstance;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP environment variables");
  }

  transporterInstance = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporterInstance;
}

async function sendAffiliateEmail({ type, recipientEmail, subject, payload }) {
  const transporter = getTransporter();
  const template = getAffiliateEmailTemplate(type, payload || {});
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("EMAIL_FROM or SMTP_USER must be configured");
  }

  return transporter.sendMail({
    from,
    to: recipientEmail,
    subject,
    text: template.text,
    html: template.html,
  });
}

module.exports = { sendAffiliateEmail };
