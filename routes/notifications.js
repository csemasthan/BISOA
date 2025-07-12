const express  = require("express");
const path     = require("path");
const multer   = require("multer");
const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();

/*─── Multer for PDF uploads ───────────────────────────────────────*/
const storage = multer.diskStorage({
  destination: "uploads/notifications/",
  filename:   (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("Only PDF files allowed"), false)
});

/*─── Compose page ─────────────────────────────────────────────────*/
router.get("/notifications",
  ensureLogin, ensurePermission("SEND_NOTIFICATION"),
  async (req,res) => {

  const [roles] = await pool.query("SELECT id,name FROM roles ORDER BY id");
  const roleFilter = Number(req.query.role_id) || null;

  let where = "", params = [];
  if (roleFilter) { where = "WHERE u.role_id = ?"; params.push(roleFilter); }

  const [users] = await pool.query(`
      SELECT u.id,u.name,u.email,r.name role_name,r.id role_id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ${where}
      ORDER BY r.id, u.name
  `, params);

  res.render("notifications", {
    roles,
    users,
    roleFilter,
    messages: req.flash('messages'), // Pass the flash message
  });
});

/*─── Create job (multi-channel + PDF) ─────────────────────────────*/
router.post("/notifications",
  ensureLogin, ensurePermission("SEND_NOTIFICATION"), upload.single("pdf"),
  async (req,res) => {

  const { subject, body, when } = req.body;
  const channels   = Array.isArray(req.body.channel) ? req.body.channel : [req.body.channel];
  const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [req.body.recipients];

  const cleanIds = recipients.filter(Boolean);
  if (!cleanIds.length) {
    req.flash('messages', { text: "Select at least one recipient.", type: "danger" }); // Fixed the comma
    return res.redirect("/notifications");
  }

  const scheduledAt =
    !when || isNaN(Date.parse(when)) ? new Date() : new Date(when);

  const pdfPath = req.file ? req.file.path : null;

  for (const ch of channels) {
    const [jobResult] = await pool.query(`
      INSERT INTO notification_jobs
        (subject, body, channel, scheduled_at, pdf_path, created_by)
      VALUES (?,?,?,?,?,?)
    `, [subject, body, ch, scheduledAt, pdfPath, req.session.userId]);

    const jobId = jobResult.insertId;
    const rows  = cleanIds.map(uid => [jobId, uid]);
    await pool.query("INSERT INTO notification_recipients (job_id,user_id) VALUES ?", [rows]);

    await logAudit(
      "NOTIFY_JOB_CREATED",
      `Job#${jobId} (${ch}) to ${rows.length} user(s) @ ${scheduledAt}`,
      req.session.userId
    );
  }

  req.flash('messages',{text:"Notification scheduled.", type:"success"}); // Pass the flash message
  res.redirect("/notifications");
});

/*─── Sent / Scheduled log ─────────────────────────────────────────*/
router.get("/notifications/log",
  ensureLogin, ensurePermission("SEND_NOTIFICATION"),
  async (req,res) => {

  const [logs] = await pool.query(`
    SELECT nj.*, usr.name AS sender,
           GROUP_CONCAT(u2.name ORDER BY u2.name SEPARATOR ', ') AS recipients
      FROM notification_jobs nj
      JOIN users usr  ON usr.id  = nj.created_by
      JOIN notification_recipients nr ON nr.job_id = nj.id
      JOIN users u2   ON u2.id   = nr.user_id
     GROUP BY nj.id
     ORDER BY nj.created_at DESC
  `);

  res.render("notification-log", {
     logs,
     messages: req.flash('messages'), // Pass the flash message 
    });
});

/*─── Cancel a future job ──────────────────────────────────────────*/
router.post("/notifications/cancel/:id",
  ensureLogin, ensurePermission("SEND_NOTIFICATION"),
  async (req,res) => {

  const { id } = req.params;
  const [[job]] = await pool.query("SELECT * FROM notification_jobs WHERE id = ?", [id]);

  if (!job)          { req.flash("error","Job not found."); return res.redirect("/notifications/log"); }
  if (new Date(job.scheduled_at) <= new Date()) {
    req.flash('messages',{text:"Cannot cancel; already sent or sending.", type:"danger"}); // Pass the flash message
    return res.redirect("/notifications/log");
  }

  await pool.query("DELETE FROM notification_recipients WHERE job_id = ?", [id]);
  await pool.query("DELETE FROM notification_jobs WHERE id = ?", [id]);

  await logAudit("NOTIFY_JOB_CANCELLED", `Cancelled job#${id}`, req.session.userId);
  req.flash("messages", { text: "Scheduled notification cancelled.", type: "success" });
  res.redirect("/notifications/log");
});

  
  // Bulk: Mark all as read
router.post("/notifications/mark-all-read", ensureLogin, async (req, res) => {
    await pool.query(`
      UPDATE notification_recipients 
      SET is_read = true 
      WHERE user_id = ?
    `, [req.session.userId]);
    req.flash("messages", { text: "All notifications marked as read.", type: "success" });
    res.redirect("/my-notifications");
  });
  
  // Bulk: Delete all
  router.post("/notifications/delete-all", ensureLogin, async (req, res) => {
    const userId = req.session.userId;
    const filter = req.body.filter || "unread";
  
    let condition = "";
    if (filter === "unread") {
      condition = "AND is_read = false";
    } else if (filter === "read") {
      condition = "AND is_read = true";
    }
  
    const [result] = await pool.query(
      `DELETE FROM notification_recipients 
       WHERE user_id = ? ${condition}`,
      [userId]
    );
    req.flash("messages", { text: `Deleted ${result.affectedRows} ${filter} notification(s).`, type: "success" });
    res.redirect("/my-notifications?filter=" + filter);
  });
  
  
  /* ─── toggle read / unread ──────────────────────────────── */
  router.post("/notifications/toggle/:id", ensureLogin, async (req, res) => {
    const { id } = req.params;
    await pool.query(
      `UPDATE notification_recipients
          SET is_read = NOT is_read
        WHERE id = ? AND user_id = ?`,
      [id, req.session.userId]
    );
    req.flash("messages", { text: " Notification status updated.", type: "success" });
    res.redirect("/my-notifications");
  });
  
  /* ─── delete single ─────────────────────────────────────── */
  router.post("/notifications/delete/:id", ensureLogin, async (req, res) => {
    await pool.query(
      `DELETE FROM notification_recipients
        WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );
    req.flash("messages", { text: " Notification deleted.", type: "success" });
    res.redirect("/my-notifications");
  });


//retrive user notifications
router.get("/my-notifications", ensureLogin, async (req, res) => {
    const userId = req.session.userId;
    const filter = req.query.filter || "unread";
  
    let condition = "";
    if (filter === "unread") {
      condition = "AND nr.is_read = false";
    } else if (filter === "read") {
      condition = "AND nr.is_read = true";
    }
  
    const [notifications] = await pool.query(`
        SELECT nr.id AS rec_id, nr.is_read, nj.subject, nj.body, nj.created_at, nj.pdf_path
        FROM notification_recipients nr
        JOIN notification_jobs nj ON nj.id = nr.job_id
        WHERE nr.user_id = ? ${condition} and nj.channel ='TEXT'
        ORDER BY nj.created_at DESC
      `, [userId]);
  
    res.render("user-notifications", {
      notifications,
      filter
    });
  });
  

module.exports = router;
