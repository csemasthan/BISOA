const nodemailer = require("nodemailer");
const path = require("path"); 
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    secure: +process.env.SMTP_PORT === 465, // true for 465, false for 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

async function sendOTPEmail(email, otp) {
  const info = await transporter.sendMail({
    from: `"BISOA" <no-reply@workflow.local>`,
    to: email,
    subject: "Your OTP code for login",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });
  console.log("OTP e-mail sent:", info.messageId);
}

// … previous transporter code …

async function sendPasswordMail(email, password) {
    await transporter.sendMail({
      from: '"BISOA" <no-reply@workflow.local>',
      to: email,
      subject: "Password for your account",
      html: `<p>Welcome! Your temporary password is <b>${password}</b>.</p>
             <p>Please log in and change it immediately.</p>`
    });
  }

  /* ───── generic helper  (to, subject, html, text) ───────────────── */
  async function sendMail(to, subject, html, text = "", pdfPath = null) {
    const safePdfPath = path.normalize(pdfPath).replace(/\\/g, "/");
    return transporter.sendMail({
      from: '"BISOA" <no-reply@workflow.local>',
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ""),
      html,
      attachments: pdfPath
        ? [{ filename: path.basename(pdfPath), path: safePdfPath }]
        : []
    });
  }   

  module.exports = { sendOTPEmail,sendPasswordMail, sendMail };
