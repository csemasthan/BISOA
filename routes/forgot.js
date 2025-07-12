const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { sendOTPEmail } = require("../utils/mailer");

// STEP 1: Show forgot password form
router.get("/forgot", (req, res) => {
  res.render("forgot", {
    error: null,
    success: null,
    messages: req.flash('messages'), // Pass the flash message
    });
});

// STEP 2: Send OTP to email
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.render("forgot", { error: "Email is required.", success: null });

  try {
    const [[user]] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.render("forgot", { error: "No user with that email.", success: null });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes

    await pool.query("UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE id = ?", [
      otp,
      expiry,
      user.id,
    ]);

    await sendOTPEmail(email, otp);
    req.flash("messages", { text: "OTP sent successfully.", type: "success" });
    res.render("forgot-otp", {
      email,
      messages: req.flash('messages'), // Pass the flash message
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    req.flash("messages", { text: "Error sending OTP.", type: "danger" });
    res.render("forgot",{
      messages: req.flash('messages'), // Pass the flash message
    });
  }
});

// STEP 3: Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const [[user]] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !user.reset_otp || !user.reset_otp_expires) {
    req.flash("messages", { text: "Invalid request.", type: "danger" });
    return res.render("forgot", {
       success: null,
       messages: req.flash('messages'), // Pass the flash message
      });
  }

  const now = new Date();
  if (now > user.reset_otp_expires) {
    req.flash("messages", { text: "OTP Expired.", type: "danger" });
    return res.render("forgot", {
       email,
       messages:  req.flash('messages'), // Pass the flash message
    });
  }
  if (user.reset_otp !== otp) {
    req.flash("messages", { text: "Invalid OTP.", type: "danger" });
    return res.render("forgot-otp", {
       email,
       messages:  req.flash('messages'), // Pass the flash message
    });
  }

  req.flash("messages", { text: "OTP verified successfully.", type: "success" });
  res.render("forgot-reset", { email, 
    messages: req.flash('messages'), // Pass the flash message
    error: null });
});

// STEP 4: Set new password
const bcrypt = require("bcrypt");
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.render("forgot-reset", { email, error: "All fields required." });

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expires = NULL WHERE email = ?",
    [hash, email]
  );
  req.flash('messages',{text:"Password Reset Successfully", type:"success"}); // Pass the flash message
  res.redirect("/login");
});

module.exports = router;
