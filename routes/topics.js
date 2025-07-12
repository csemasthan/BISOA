const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool, ensurePermission, ensureLogin } = require("../config/db");
const { logAudit } = require("../utils/audit");


const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/topic-docs/"),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

/* List all topics + documents */
router.get("/topics", ensureLogin, async (req, res) => {
  const [topics] = await pool.query("SELECT * FROM topics ORDER BY created_at DESC");

  const [docs] = await pool.query(`
    SELECT d.*, t.title AS topic_title, t.is_public as topic_is_public, t.user_id as topic_creator, u.name AS uploader
    FROM topic_documents d
    JOIN topics t ON t.id = d.topic_id
    JOIN users u ON u.id = d.user_id
    ORDER BY d.uploaded_at DESC
  `);
  const acts = req.session.activities || [];
  res.render("topics", {
    topics,
    docs,
    userId: req.session.userId,
    canUpload : req.session.activities?.some(a => a.code === "UPLOAD_TOPIC_DOC") || false,
    canDelete : req.session.activities?.some(a => a.code ==="DELETE_TOPIC_DOC") || false,
    canViewAll : req.session.activities?.some(a => a.code ==="VIEW_ALL_TOPICS") || false,
    messages: req.flash('messages'), // Pass the flash message
  });
});

/* Upload doc to topic */
router.post("/topics/upload", ensureLogin, ensurePermission("UPLOAD_TOPIC_DOC"), upload.single("pdf"), async (req, res) => {
  const { topic_id, title, remarks } = req.body;
  const file = req.file;

  if (!file || path.extname(file.originalname).toLowerCase() !== ".pdf") {
    req.flash("messages", { text: "Only PDF files allowed.", type: "danger" });
    return res.redirect("/topics");
  }

  await pool.query(
    `INSERT INTO topic_documents (topic_id, user_id, title, remarks, filename, filepath)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [topic_id, req.session.userId, title, remarks, file.originalname, file.path]
  );
  await logAudit("TOPIC_DOC_UPLOAD", `Uploaded '${title}' (topic_id: ${topic_id})`, req.session.userId);
  req.flash("messages", { text: "Document uploaded successfully!", type: "success" });
  res.redirect("/topics");
});

/* Delete doc (owner only) */
router.post("/topics/delete/:id", ensureLogin, ensurePermission("DELETE_TOPIC_DOC"), async (req, res) => {
  const docId = req.params.id;
  const [[doc]] = await pool.query("SELECT * FROM topic_documents WHERE id = ?", [docId]);

  if (!doc || doc.user_id !== req.session.userId) {
    return res.status(403).send("Not allowed.");
  }

  fs.unlink(doc.filepath, () => {});
  await pool.query("DELETE FROM topic_documents WHERE id = ?", [docId]);
  
  const topicName = req.body.topic_name || "(unknown)";
  await logAudit("TOPIC_DOC_DELETE", `Deleted '${doc.title}' from topic '${topicName}' (id: ${doc.id})`, req.session.userId);
 req.flash("messages", { text: "Document deleted successfully!", type: "success" });
  res.redirect("/topics");
});
module.exports = router;
