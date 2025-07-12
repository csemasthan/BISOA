const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});
pool.query("SET time_zone = '+05:30';");
function ensurePermission(activityCode) {          // ✔ plain function
    return async (req, res, next) => {               // ✔ inner async allowed
      if (!req.session.userId) return res.redirect("/login");
      if (req.session.roleId === 1) return next();   // Super Admin shortcut
  
      try {
        const sql = `
          SELECT 1
          FROM activities a
          JOIN activity_roles ar ON ar.activity_id = a.id
          WHERE a.code = ? AND ar.role_id = ?
          LIMIT 1`;
        const [[row]] = await pool.query(sql, [activityCode, req.session.roleId]);
  
        if (row) return next();                      // ✅ permitted
        return res.redirect("/dashboard");           // ❌ no permission
      } catch (err) {
        console.error("Permission check error:", err);
        return res.status(500).send("Server error");
      }
    };
  }

  const getUserActivities = async (roleId) => {
    const [rows] = await pool.query(
      `SELECT a.code, a.description, a.url
       FROM activities a
       JOIN activity_roles ar ON ar.activity_id = a.id
       WHERE ar.role_id = ?`,
      [roleId]
    );
    //console.log(rows);
    return rows;
  };

// db.js  (or wherever you keep helpers)
const getUserById = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, name, email, photo
       FROM users
      WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;              // ← return the first (only) row
};


  function sessionTimer(req, res, next) {
    const MAX_AGE = 15 * 60 * 1000; // 15 mins in ms
    req.session.touch(); // resets the session expiration on each request
  
    const expiresInMs = req.session.cookie.expires - Date.now();
    res.locals.sessionRemainingSeconds = Math.floor(expiresInMs / 1000);
  
    next();
  };
 
  function ensureLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
      req.flash("error", "Please log in to continue.");
      return res.redirect("/login");
    }
    next();
  }
  
  module.exports = {
    pool,
    ensurePermission,
    getUserActivities,
    ensureLogin,
    sessionTimer,
    getUserById,
  };
  
  
