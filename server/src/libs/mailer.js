const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // SSL/TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send email using nodemailer
 * @param {Object} mailOptions - Email options { to, subject, html, text }
 */
const sendMail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      ...mailOptions,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Alias for sendMail
const sendEmail = sendMail;

module.exports = { sendMail, sendEmail };
