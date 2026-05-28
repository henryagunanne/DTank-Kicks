const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_HOST) { 
    console.log("[email skipped]", to, subject); 
    return; 
  }

  try {
    await getTransporter().sendMail({ 
      from: `"DTank-Kicks" <${process.env.SMTP_USER || "no-reply@dtank-kicks.com"}>`, // Use SMTP_USER as sender if available, otherwise fallback to no-reply address
      to,   // Recipient email address
      subject, // Email subject line
      html  // HTML content of the email
    });
  } catch (e) { 
    console.error("Email error:", e.message); 
  }
}

module.exports = { sendEmail };
