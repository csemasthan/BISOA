const express = require("express");
const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();

/* ───────────────── propose form + list of own proposals ───────────── */
router.get("/propose-topic", ensureLogin, ensurePermission("SUBMIT_TOPIC"), async (req, res) => {
  const [mine] = await pool.query(
    "SELECT * FROM topic_proposals WHERE requested_by = ? ORDER BY created_at DESC",
    [req.session.userId]
  );
  res.render("topic-propose", {
     mine,
     messages: req.flash('messages'), // Pass the flash message
     });
});

/* create proposal */
router.post("/propose-topic", ensureLogin, ensurePermission("SUBMIT_TOPIC"), async (req, res) => {
  const { title, description, is_public } = req.body;
  
  await pool.query(
    "INSERT INTO topic_proposals (requested_by, title, description, is_public) VALUES (?,?,?,?)",
    [req.session.userId, title, description, is_public ? 1 : 0]
  );
  await logAudit("TOPIC_PROPOSED", `Proposed '${title}'`, req.session.userId);
  req.flash("messages", { text: "Your topic submitted for approval", type: "success" });
  res.redirect("/propose-topic");
});

/* ───────────────── moderator queue ─────────────────────────────────── */
router.get("/moderate-topics", ensureLogin,  ensurePermission("APPROVE_TOPIC"), async (req, res) => {
  const [pending] = await pool.query(
    "SELECT tp.*, u.name AS proposer FROM topic_proposals tp JOIN users u ON u.id = tp.requested_by WHERE status = 'PENDING' ORDER BY created_at DESC"
  );
  res.render("topic-moderate", { pending });
});

/* approve / reject */
router.post("/moderate-topics/:id", ensureLogin, ensurePermission("APPROVE_TOPIC"), async (req, res) => {
  const propId      = req.params.id;
  const { action }  = req.body;            // "approve" or "reject"
  const { title, description, is_public, mod_remarks } = req.body;

  const [[prop]] = await pool.query(
    `SELECT tp.*, u.name AS proposer_name
       FROM topic_proposals tp
       JOIN users u ON u.id = tp.requested_by
      WHERE tp.id = ?`,
    [propId]
  );
  
  if (!prop || prop.status !== 'PENDING') return res.redirect("/moderate-topics");

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  /* update proposal row */
  await pool.query(
    `UPDATE topic_proposals
     SET status = ?, moderator_id = ?, decided_at = NOW(),
         title = ?, description = ?, is_public = ?, moderator_remarks = ?
     WHERE id = ?`,
    [ newStatus, req.session.userId, title, description, is_public ? 1 : 0, mod_remarks, propId ]
  );

  /* if approved → create real topic */
  if (newStatus === "APPROVED") {
    const [result] = await pool.query("INSERT INTO topics (title, description, is_public, user_id) VALUES (?, ?, ?, ?)", [title, description, is_public, prop.requested_by]);
    const newTopicId = result.insertId;
    await pool.query("UPDATE topic_proposals SET topic_id = ? WHERE id = ?",[newTopicId, propId]);
  }

  await logAudit(
    "TOPIC_PROPOSAL_"+newStatus,
    `${newStatus} '${title}' by ${prop.proposer_name} with the remarks:${mod_remarks||"-"}`,
    req.session.userId
  );

  res.redirect("/moderate-topics");
});

module.exports = router;
