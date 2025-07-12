const express  = require("express");
const bcrypt   = require("bcrypt");
const path     = require("path");
const multer   = require("multer");
const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();

/* ───── Multer setup for avatars ───── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/avatars"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `u${req.session.userId}${ext}`);
  }
});
const upload = multer({ storage });

/* ───── GET /profile ───── */
router.get("/profile", ensureLogin,  async (req, res) => {
  const [[u]] = await pool.query("SELECT name, email, photo FROM users WHERE id = ?", [req.session.userId]);
  res.render("profile", { user: u, error: null, success: null });
});

/* ───── POST /profile ───── */
router.post("/profile",
  ensureLogin,
  upload.single("photo"),
  async (req, res) => {
    const { name, email, newPassword, confirm } = req.body;
    const userId = req.session.userId;

    const [[current]] = await pool.query("SELECT email, name, photo FROM users WHERE id = ?", [userId]);
    let error = null;

    /* 1. validate email uniqueness */
    if (email !== current.email) {
      const [[dup]] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
      if (dup) error = "Email already in use.";
    }

    /* 2. validate password match (if supplied) */
    if (!error && newPassword) {
      if (newPassword !== confirm) error = "Passwords do not match.";
    }

    if (error) {
      return res.render("profile", { user: current, error, success: null });
    }

    /* 3. build update fields */
    const fields = [];
    const values = [];

    if (name && name !== current.name)   { fields.push("name = ?");  values.push(name); }
    if (email && email !== current.email){ fields.push("email = ?"); values.push(email); }

    if (req.file) {                       // photo uploaded
      const rel = `/uploads/avatars/${req.file.filename}`;
      fields.push("photo = ?"); values.push(rel);
    }

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      fields.push("password_hash = ?"); values.push(hash);
    }

    if (fields.length) {
      values.push(userId);
      await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

      await logAudit(
        "PROFILE_UPDATE",
        `Updated fields: ${fields.join(", ").replace(/ = \?/g,"")}`,
        userId
      );
    }

    const [[updated]] = await pool.query("SELECT name, email, photo FROM users WHERE id = ?", [userId]);
    res.render("profile", { user: updated, error: null, success: "Profile updated." });
});

module.exports = router;
