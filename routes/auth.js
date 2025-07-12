const express = require("express");
const bcrypt  = require("bcrypt");
const { pool, getUserActivities, ensureLogin } = require("../config/db");
const { logAudit }= require("../utils/audit");

const router = express.Router();

/* ───────────── Login ─────────────────────────── */
router.get("/", (req, res) => {
    if (!req.session.userId) return res.redirect("/login");

    res.redirect("/dashboard");
  });

router.get("/login", (req, res) => {
    res.render("login", { error: null,  messages: req.flash('messages'), // Pass the flash message
     });  
  });

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const [[user]] = await pool.query(
        "SELECT id, password_hash, role_id, must_change_password FROM users WHERE email = ?",
        [email]
      );
      if (!user) return res.render("login", { error: "Invalid credentials." });
  
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok)   return res.render("login", { error: "Invalid credentials." });
  
      /* ───────── logged in ───────── */
      req.session.userId = user.id;
      req.session.roleId = user.role_id;

      const activities = await getUserActivities(user.role_id);
      req.session.activities = activities.map(a => a.code);      // e.g. ['UPLOAD_MOM','DELETE_MOM']
  
      if (user.must_change_password) {
        return res.redirect("/change-password");
      }
      res.redirect("/dashboard");
  
    } catch (err) {
      console.error(err);
      res.render("login", { error: "Server error." });
    }
  });
  
/* ───────── Change Password ───────── */

router.get("/change-password", ensureLogin, (req, res) => {
    if (!req.session.userId) return res.redirect("/login");
    res.render("change-password", { error: null });
  });
  
  router.post("/change-password", async (req, res) => {
    if (!req.session.userId) return res.redirect("/login");
    const { newpass, confirm } = req.body;
    if (!newpass || newpass !== confirm) {
      return res.render("change-password", { error: "Passwords do not match." });
    }
  
    try {
      const hash = await bcrypt.hash(newpass, 10);
      await pool.query(
        "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        [hash, req.session.userId]
      );
      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.render("change-password", { error: "Database error." });
    }
  });
  
/* ───────────── Dashboard ─────────────────────── */

router.get("/dashboard", ensureLogin, async (req, res)=> {
  if (!req.session.userId) return res.redirect("/login");
  
 
  const activities = await getUserActivities(req.session.roleId);
  const userId = req.session.userId;
  
    /* ───── fetch name ───── */
    const [[{ name }]] = await pool.query(
      "SELECT name FROM users WHERE id = ?", [userId]
    );
  
    /* ───── unread notifications count ─────
       assumes table `notification_reads` marks read rows            */
    const [[{ unread }]] = await pool.query(`
        SELECT COUNT(*) AS unread
    FROM notification_recipients n
LEFT JOIN notification_jobs r
       ON r.id = n.job_id AND n.user_id = ?
   WHERE r.channel = 'TEXT' and n.is_read=0`, [userId]);

  
/* ───── open polls the user hasn’t voted in ───── */
const [[{ openPolls }]] = await pool.query(`
  SELECT COUNT(*) AS openPolls
  FROM polls p
  WHERE NOW() BETWEEN p.open_time AND p.close_time
    AND NOT EXISTS (
      SELECT 1 
      FROM poll_votes v
      WHERE v.poll_id = p.id AND v.user_id = ?
    )
    AND EXISTS (
      SELECT 1 
      FROM poll_roles pr
      WHERE pr.poll_id = p.id 
      AND pr.role_id = (SELECT role_id FROM users WHERE id = ?)
    )
`, [userId, userId]);


      /* ───── Pending Proposals ───── */
      const [[{ pendingTopicsCount }]] = await pool.query(`
        SELECT COUNT(*) AS pendingTopicsCount
          FROM topic_proposals WHERE status = "PENDING"`);
  
      /*───── Tiles sorting by urgency ─────*/
          const tiles = [
            {
              title: "Approve Topics",
              url: "/moderate-topics",
              icon: "bi-check2-square text-success",
              visible: activities.some(a => a.code === 'APPROVE_TOPIC'),
              badge: pendingTopicsCount,
              highlight: pendingTopicsCount > 0,
              tooltip: "Approve topics proposed by users",
              urgency: pendingTopicsCount > 0 ? 3 : 0
            },
            {
              title: "Notifications",
              url: "/my-notifications",
              icon: "bi-bell-fill text-warning",
              visible: true,
              badge: unread,
              highlight: unread>0,
              tooltip: "Unread notifications",
              urgency: unread > 0 ? 2 : 0
            },
            {
              title: "Polls",
              url: "/polls",
              icon: "bi-bar-chart-fill text-primary",
              visible: true,
              badge: openPolls,
              highlight: openPolls > 0,
              tooltip: "Ongoing polls",
              urgency: openPolls>0 ? 1 : 0
            },
            {
              title: "Minutes of Meeting",
              url: "/documents",
              icon: "bi-file-earmark-text-fill text-success",
              visible: true,
              tooltip: "Documents uploaded by the Association",
              urgency: 0
            },
            {
              title: "Dealing Matters by Association",
              url: "/topics",
              icon: "bi-journals text-info",
              visible: true,
              tooltip: "Issues/activities dealing by the Association",
              urgency: 0
            },
            {
              title: "Manage Dealing Matters by Association",
              url: "/manage-topics",
              icon: "bi-wrench-adjustable text-dark",
              visible: activities.some(a => a.code === 'MANAGE_TOPICS'),
              tooltip: "Add/edit/remove association topics",
              urgency: 0
            },
            {
              title: "Audit Logs",
              url: "/audit-logs",
              icon: "bi-shield-lock-fill text-secondary",
              visible: activities.some(a => a.code === 'VIEW_AUDIT'),
              tooltip: "Activity logs and changes by users",
              urgency: 0
            },
            {
              title: "Send Notification",
              url: "/notifications",
              icon: "bi-megaphone-fill text-danger",
              visible: activities.some(a => a.code === 'SEND_NOTIFICATION'),
              tooltip: "Send notification to other users",
              urgency: 0
            },
            {
              title: "Raise Concern or Propose Topic",
              url: "/propose-topic",
              icon: "bi-chat-dots-fill text-primary",
              visible: true,
              tooltip: "Raise concern or suggest a new topic",
              urgency: 0
            }
          ];
          


    /* ───── render ───── */
    res.render("dashboard", {
      userName              : name,
      activities            : activities,
      tiles
    });

});

/* ───────────── Logout ────────────────────────── */

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
