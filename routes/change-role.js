const express = require("express");
const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");


const router = express.Router();
const MEMBER_ROLE_ID = 2; // default role for new members

/* ───────────────── GET: show role-changer ───────────────── */
router.get("/change-role", ensureLogin, ensurePermission("CHANGE_ROLE"), async (req, res) => {
    let membersQuery = "SELECT u.id, u.name, u.email, r.id AS role_id, r.name AS role_name \
     FROM users u JOIN roles r ON r.id = u.role_id";
      let params       = [];
    
      if (req.session.roleId !== 1) {              // NOT Super Admin
        membersQuery += " WHERE role_id > ?";
        params.push(req.session.roleId);               // show only Members
      }
      membersQuery += " ORDER BY u.name";
   // all users & all roles
      const [users] = await pool.query(membersQuery, params);

      let rolesQuery = "SELECT id, name FROM roles";
      params       = [];
      if (req.session.roleId !== 1) {              // NOT Super Admin
          rolesQuery += " WHERE id > ?";  
          params.push(req.session.roleId);           // show only Members
       }
       rolesQuery += " ORDER BY id";
      const [roles] = await pool.query(rolesQuery, params);

  res.render("change-roles", {
     users,
      roles,
       success: null,
        error: null,
        messages: req.flash('messages'), // Pass the flash message
      });
});

/* ───────────────── POST: update role ───────────────── */
router.post("/change-role", ensureLogin, ensurePermission("CHANGE_ROLE"), async (req, res) => {
  const { userId, oldRoleId, newRoleId } = req.body;

  if (!userId || !newRoleId) {
    req.flash("messages", { text: "Invalid Role Selected", type: "danger" });
    return res.redirect("/change-role");
  }

  try {
    // Update
    await pool.query("UPDATE users SET role_id = ? WHERE id = ?", [newRoleId, userId]);
 
    // audit log
    const [[userInfo]] = await pool.query("SELECT name FROM users WHERE id = ?", [userId]);
    const [[oldRole]] = await pool.query("SELECT name FROM roles WHERE id = ?", [oldRoleId]);
    const [[newRole]] = await pool.query("SELECT name FROM roles WHERE id = ?", [newRoleId]);
    
    await logAudit(
      "CHANGE_ROLE",
      `Changed role of ${userInfo.name} from ${oldRole.name} to ${newRole.name}`,
      req.session.userId
    );

 
    // Reload Lists
    let membersQuery = "SELECT u.id, u.name, u.email, r.id AS role_id, r.name AS role_name \
    FROM users u JOIN roles r ON r.id = u.role_id";
    let params       = [];
   
     if (req.session.roleId !== 1) {              // NOT Super Admin
       membersQuery += " WHERE role_id > ?";
       params.push(req.session.roleId);               // show only Members
     }
     membersQuery += " ORDER BY u.name";

    const [users] = await pool.query(membersQuery, params);
   

    let rolesQuery = "SELECT id, name FROM roles";
     params       = [];
    if (req.session.roleId !== 1) {              // NOT Super Admin
        rolesQuery += " WHERE id > ?";  
        params.push(req.session.roleId);           // show only Members
     }
     rolesQuery += " ORDER BY id";
    const [roles] = await pool.query(rolesQuery, params);
    req.flash("messages", { text: "Role Updated Successfully", type: "success" });
    res.redirect("/change-role");
  } catch (err) {
    console.error("Change-role error:", err);
    req.flash("messages", { text: "Some error occured.", type: "danger" });
    res.redirect("/change-role");
  }
});

module.exports = router;
