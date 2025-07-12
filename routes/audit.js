const express = require("express");
const { logAudit }= require("../utils/audit");
const { pool, ensurePermission, ensureLogin } = require("../config/db");

const router = express.Router();

router.get("/audit-logs", ensureLogin, ensurePermission("VIEW_AUDIT"), async (req, res) => {
  const [logs] = await pool.query(`
    SELECT a.*, u.name AS performed_by_name
    FROM audit_logs a
    JOIN users u ON a.performed_by = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `);

  res.render("audit-logs", { logs });
});

module.exports = router;
