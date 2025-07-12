// routes/documents.js
const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { pool, ensurePermission, ensureLogin } = require("../config/db");

const router = express.Router();

/* ──────────  Multer config  ────────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/docs/"),
  filename   : (_req, file, cb)  => cb(null, file.originalname)   // keep original name
});
const upload = multer({ storage });

/* ──────────  LIST  ────────── */
router.get("/documents", ensureLogin, async (req, res) => {
  const acts   = req.session.activities || [];
  const [cats] = await pool.query("SELECT * FROM categories ORDER BY name");

  const catId  = +req.query.category || 0;
  const params = [];
  let where    = "WHERE 1 ";

  if (!req.session.activities?.some(a => a.code === "VIEW_PRIVATE_DOCS")) {
    where += "AND (c.is_public = 1 AND d.is_private = 0) ";
  }
  if (catId) {
    where += "AND d.category_id = ? ";
    params.push(catId);
  }

  const [docs] = await pool.query(
    `SELECT d.*, u.name AS uploader,
            c.name AS category, c.is_public
       FROM documents d
       JOIN users      u ON u.id = d.user_id
       JOIN categories c ON c.id = d.category_id
     ${where}
     ORDER BY d.uploaded_at DESC`,
    params
  );

  res.render("documents", {
    docs,
    cats,
    currentCat : catId,
    userId     : req.session.userId,
    canUpload  : req.session.activities?.some(a => a.code ==="UPLOAD_DOC") || false,
    canDelete  : req.session.activities?.some(a => a.code ==="DELETE_DOC") || false,
    messages: req.flash('messages'), // Pass the flash message
  });
});

/* ──────────  ADD + EDIT combined  ────────── */
router.post(
  "/documents/upload",
  ensureLogin,
  ensurePermission("UPLOAD_DOC"),
  upload.single("pdf"),          // file may be absent in edit mode
  async (req, res) => {
    const {
      edit_id, title, remarks,
      category_id, doc_date
    } = req.body;
    const is_private = req.body.is_private ? 1 : 0;

    const file = req.file;

    /* Determine category public/private */
    const [[cat]] = await pool.query(
      "SELECT is_public FROM categories WHERE id=?", [category_id]);
    const effectivePrivate = is_private;

    /* ───── EDIT MODE ───── */
    if (edit_id) {
      const [[doc]] = await pool.query(
        "SELECT * FROM documents WHERE id = ?", [edit_id]);

      /* permissions: owner OR DELETE_DOC right */
      const canEdit = doc &&
        (doc.user_id === req.session.userId ||
         req.session.activities?.some(a => a.code === "DELETE_DOC"));
      if (!canEdit) {
        req.flash("messages", { text: "Not allowed.", type: "danger" });
      return res.redirect("/documents"); // Redirect back to the documents page}
      }

      /* if user selected a new PDF validate & replace */
      let filename  = doc.filename;
      let filepath  = doc.filepath;

      if (file) {
        if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
          req.flash("messages", { text: "Only PDF files allowed.", type: "danger" });
          return res.redirect("/documents"); // Redirect back to the poll list page
        }
        /* remove old file */
        fs.unlink(doc.filepath, () => {});
        filename = file.originalname;
        filepath = file.path;
      }

      await pool.query(`
        UPDATE documents
           SET title       = ?,
               remarks     = ?,
               category_id = ?,
               doc_date    = ?,
               is_private  = ?,
               filename    = ?,
               filepath    = ?
         WHERE id = ?`,
        [
          title,
          remarks,
          category_id,
          doc_date,
          effectivePrivate,
          filename,
          filepath,
          edit_id
        ]);
      req.flash("messages", { text: "Details updated successfully", type: "success" });
      return res.redirect("/documents");
    }

    /* ───── INSERT MODE ───── */
    if (!file || path.extname(file.originalname).toLowerCase() !== ".pdf") {
      req.flash("messages", { text: "Only PDF files allowed.", type: "danger" });
      return res.redirect("/documents"); // Redirect back to the poll list page
    }

    await pool.query(`
      INSERT INTO documents
        (user_id, title, remarks, filename, filepath,
         category_id, doc_date, is_private)
      VALUES (?,?,?,?,?,?,?,?)`,
      [
        req.session.userId,
        title,
        remarks,
        file.originalname,
        file.path,
        category_id,
        doc_date,
        effectivePrivate,
      ]);
      req.flash("messages", { text: "Document added successfully", type: "success" });
    res.redirect("/documents");
  }
);

/* ──────────  DELETE  ────────── */
router.post(
  "/documents/delete/:id",
  ensureLogin,
  ensurePermission("DELETE_DOC"),
  async (req, res) => {
    const [[doc]] = await pool.query("SELECT * FROM documents WHERE id=?", [req.params.id]);
    if (!doc){
      req.flash("messages", { text: "Document not found.", type: "danger" });
      return res.redirect("/documents");
    }

    fs.unlink(doc.filepath, () => {});
    await pool.query("DELETE FROM documents WHERE id=?", [req.params.id]);
    req.flash("messages", { text: "The document has successfully deleted.", type: "success" });
    return res.redirect("/documents"); // Redirect back to the poll list page
  }
);

module.exports = router;
