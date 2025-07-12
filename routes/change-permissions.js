const express = require("express");
const { logAudit } = require("../utils/audit");
const { pool, ensurePermission, getUserActivities, ensureLogin } = require("../config/db");

const router = express.Router();

/* ───────── VIEW MATRIX ───────── */
router.get("/change-permissions", ensureLogin,
  ensurePermission("CHANGE_PERMISSIONS"),
  async (req, res) => {
    const [activities] = await pool.query("SELECT * FROM activities ORDER BY code");
    const [roles]      = await pool.query("SELECT * FROM roles ORDER BY id");
    const [mappings]   = await pool.query("SELECT * FROM activity_roles");

    const map = new Map();
    mappings.forEach(({ activity_id, role_id }) => map.set(`${activity_id}_${role_id}`, true));
    res.render("change-permissions", {
       activities,
        roles,
         map,
         messages: req.flash('messages'), // Pass the flash message
         });
  }
);

/* ───────── SAVE MATRIX ───────── */
router.post("/change-permissions", ensureLogin,
  ensurePermission("CHANGE_PERMISSIONS"),
  async (req, res) => {

    const updates = req.body;                       // { "1_6": "on", ... }

    /* 1️⃣  old mapping */
    const [oldRows] = await pool.query("SELECT activity_id, role_id FROM activity_roles");
    const oldSet = new Set(oldRows.map(r => `${r.activity_id}_${r.role_id}`));

    /* 2️⃣  wipe + insert new mapping */
    await pool.query("TRUNCATE activity_roles");    // simpler than per-activity delete
    for (const key of Object.keys(updates)) {
      const [aId, rId] = key.split("_").map(Number);
      await pool.query("INSERT INTO activity_roles (activity_id, role_id) VALUES (?,?)", [aId, rId]);
    }

    /* 3️⃣  diff for audit */
    const newSet = new Set(Object.keys(updates));
    const added   = [...newSet].filter(k => !oldSet.has(k));
    const removed = [...oldSet].filter(k => !newSet.has(k));

    /* helper to fetch names once */
    const [actRows] = await pool.query("SELECT id, code FROM activities");
    const [roleRows]= await pool.query("SELECT id, name FROM roles");
    const actName = Object.fromEntries(actRows.map(r => [r.id, r.code]));
    const roleName= Object.fromEntries(roleRows.map(r => [r.id, r.name]));

    const mkDesc = (arr, verb) => arr.map(k=>{
        const [aId,rId]=k.split("_");
        return `${verb} ${actName[aId]} → ${roleName[rId]}`;
      }).join("; ");

    const desc =
      (added.length   ? mkDesc(added,   "ADDED")   : "") +
      (added.length && removed.length ? " | " : "") +
      (removed.length ? mkDesc(removed,"REMOVED")  : "") ||
      "No effective change";

    await logAudit("PERMISSION_UPDATE", desc, req.session.userId);

    /* 4️⃣  refresh current user’s session permissions */
    if (req.session.roleId) {
      const acts = await getUserActivities(req.session.roleId);
      req.session.activities = acts.map(a => a.code);   // e.g. ['UPLOAD_MOM','DELETE_MOM']
    }
    req.flash("messages", { text: "Permissions updated", type: "success" });
    res.redirect("/change-permissions");
  }
);

module.exports = router;
