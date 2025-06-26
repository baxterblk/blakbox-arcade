const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPasswordResetEmail(email, username, tempPassword) {
  const mailOptions = {
    from: `"Blakbox Arcade" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Blakbox Arcade - Password Reset",
    html: `
      <div style="background: #0a0a0a; color: #00ffff; padding: 40px; font-family: Orbitron, monospace;">
        <h1 style="color: #ff006e; text-shadow: 0 0 10px #ff006e;">Blakbox Arcade</h1>
        <h2>Password Reset</h2>
        <p>Hello ${username},</p>
        <p>Your password has been reset. Your temporary password is:</p>
        <p style="background: #1a1a2e; padding: 20px; border: 2px solid #00ffff; font-size: 24px; text-align: center;">
          <strong>${tempPassword}</strong>
        </p>
        <p>Please login and change your password immediately.</p>
        <p style="color: #ff006e;">Happy Gaming\!</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };
