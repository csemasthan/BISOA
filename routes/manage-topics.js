const express = require("express");
const { pool } = require("../config/db");
const { ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// GET: Manage topics page
router.get("/manage-topics",ensureLogin, ensurePermission("MANAGE_TOPICS"), async (req, res) => {
  const [topics] = await pool.query("SELECT * FROM topics ORDER BY created_at DESC");
  res.render("manage-topics", {
    topics,
    error: null,
    success: null,
    messages: req.flash('messages'), // Pass the flash message 
  });
});

// POST: Create topic
router.post("/manage-topics/create", ensureLogin,  ensurePermission("MANAGE_TOPICS"), async (req, res) => {
  const { title, description, is_public } = req.body;
  if (!title){
    req.flash('messages', 'Please enter a title', { type: 'danger' });
    return res.redirect("/manage-topics");
  }

  await pool.query(
    "INSERT INTO topics (title, description, is_public, user_id) VALUES (?,?,?,?)",
    [title, description, Number(is_public) === 1 ? 1 : 0, req.session.userId]
  );

  await logAudit("TOPIC_CREATED", `Created topic '${title}'`, req.session.userId);
  req.flash("messages", { text: "Topic Added successfully.", type: "success" });
  res.redirect("/manage-topics");
});

// routes/manage-topics.js   (delete topic + docs + files)
router.post(
  "/manage-topics/delete/:id", ensureLogin, 
  ensurePermission("MANAGE_TOPICS"),
  async (req, res) => {

    const { id } = req.params;

    /* 1️⃣  pull topic title and its docs */
    const [[topic]] = await pool.query(
      "SELECT title FROM topics WHERE id = ?", [id]
    );

    const [docs] = await pool.query(
      "SELECT filename, filepath FROM topic_documents WHERE topic_id = ?", [id]
    );

    /* 2️⃣  delete child docs, then the topic */
    await pool.query("DELETE FROM topic_documents WHERE topic_id = ?", [id]);
    await pool.query("DELETE FROM topics WHERE id = ?", [id]);
    await pool.query(
      `UPDATE topic_proposals
         SET status='DELETED',
             moderator_id = ?,            -- who deleted
             decided_at   = NOW(),
             moderator_remarks = CONCAT(IFNULL(moderator_remarks,''),' (topic deleted)')
       WHERE topic_id = ?`,
      [req.session.userId, id]
    );

    /* 3️⃣  unlink physical files (ignore errors) */
    const fs = require("fs");
    docs.forEach(d => fs.unlink(d.filepath, () => {}));

    /* 4️⃣  build audit description */
    const fileList = docs.length
      ? " | Files removed: " + docs.map(d => d.filename).join(", ")
      : " | No files were attached";

      const desc = `Deleted topic '${topic?.title || "Unknown"}' (ID:${id})` + ` with ${docs.length} document(s)` + fileList + ` | Proposal marked DELETED`;

    /* 5️⃣  audit */
    await logAudit("TOPIC_DELETED", desc, req.session.userId);
    req.flash("messages", { text: "Topic Deleted successfully.", type: "success" });
    res.redirect("/manage-topics");
  }
);


// POST: Update topic
router.post(
  "/manage-topics/update", ensureLogin, 
  ensurePermission("MANAGE_TOPICS"),
  async (req, res) => {

    const { id, title, description, is_public } = req.body;
    const newVis = Number(is_public) === 1 ? 1 : 0;

    /* 1️⃣  fetch current row */
    const [[old]] = await pool.query("SELECT * FROM topics WHERE id = ?", [id]);
    if (!old){
       req.flash("messages", { text: "Topic not found.", type: "danger" });
       return res.redirect("/manage-topics");
    }

    /* 2️⃣  update */
    await pool.query(
      "UPDATE topics SET title=?, description=?, is_public=? WHERE id=?",
      [title, description, newVis, id]
    );

    /* 3️⃣  build diff text */
    const diffs = [];

    if (old.title !== title)
      diffs.push(`Title: "${old.title}" → "${title}"`);

    if ((old.description || "") !== (description || ""))
      diffs.push(`Description : "${old.description}" → "${description}"`);

    if (old.is_public !== newVis)
      diffs.push(
        `Visibility: ${old.is_public ? "Public" : "Private"} → ${newVis ? "Public" : "Private"}`
      );

    const desc =
      diffs.length
        ? `Updated topic #${id}: ` + diffs.join("; ")
        : `Updated topic #${id} (no field actually changed)`;

    /* 4️⃣  audit */
    await logAudit("TOPIC_UPDATED", desc, req.session.userId);
    req.flash("messages", { text: "Topic Updated Successfully", type: "success" });
    res.redirect("/manage-topics");
  }
);


module.exports = router;
