// routes/categories.js
const express = require("express");
const fs      = require("fs");
const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();

/* ──────────  LIST  ────────── */
router.get(
  "/categories",
  ensureLogin,
  ensurePermission("MANAGE_CAT"),
  async (req, res) => {
    const [cats] = await pool.query("SELECT * FROM categories ORDER BY name");
    res.render("categories", {
       cats,
       messages: req.flash('messages'), 
      });
  }
);

/* ──────────  ADD  ────────── */
router.post(
  "/categories/add",
  ensureLogin,
  ensurePermission("MANAGE_CAT"),
  async (req, res) => {
    const { name, is_public } = req.body;
    await pool.query(
      "INSERT INTO categories (name, is_public) VALUES (?,?)",
      [name, is_public ? 1 : 0]
    );
    await logAudit(
      "CATEGORY_ADDED",
      `Added category '${name}', public=${!!is_public}`,
      req.session.userId
    );
    req.flash("messages", { text: "Category Added", type: "success" });
    res.redirect("/categories");
  }
);

/* ──────────  INLINE JSON EDIT  ────────── */
router.post(
  "/categories/edit/:id",
  ensureLogin,
  ensurePermission("MANAGE_CAT"),
  express.json(),
  async (req, res) => {
    const id = req.params.id;
    const { name, is_public } = req.body;

    await pool.query(
      "UPDATE categories SET name=?, is_public=? WHERE id=?",
      [name, is_public ? 1 : 0, id]
    );


    await logAudit(
      "CATEGORY_EDITED",
      `Cat ${id} → name='${name}', public=${!!is_public}`,
      req.session.userId
    );
    req.flash("messages", { text: "Category Edited Successfully", type: "success" });
    res.redirect("/categories");
  }
);

/* ──────────  DELETE (cascade docs)  ────────── */
router.post(
  "/categories/delete/:id",
  ensureLogin,
  ensurePermission("MANAGE_CAT"),
  async (req, res) => {
    const id = req.params.id;

    /* Remove files linked to docs in this category */
    const [docs] = await pool.query(
      "SELECT filepath FROM documents WHERE category_id=?",
      [id]
    );
    docs.forEach(d => fs.unlink(d.filepath, () => {}));

    await pool.query("DELETE FROM documents WHERE category_id=?", [id]);
    await pool.query("DELETE FROM categories WHERE id=?", [id]);

    await logAudit(
      "CATEGORY_DELETED",
      `Deleted category ${id} and ${docs.length} linked docs`,
      req.session.userId
    );
    req.flash("messages", { text: "Category Deleted Successfully", type: "success" });
    res.redirect("/categories");
  }
);

module.exports = router;
