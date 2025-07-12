const { pool } = require("../config/db");

async function logAudit(action_type, description, performed_by) {
  try {
    await pool.query(
      "INSERT INTO audit_logs (action_type, description, performed_by) VALUES (?, ?, ?)",
      [action_type, description, performed_by]
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

module.exports = { logAudit };
