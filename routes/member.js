const express  = require("express");
const bcrypt   = require("bcrypt");
const { pool, ensurePermission, ensureLogin } = require("../config/db");
const { sendPasswordMail } = require("../utils/mailer");
const { logAudit }= require("../utils/audit");
const multer   = require("multer");
const xlsx     = require("exceljs");

const router  = express.Router();
const upload  = multer({ dest: "uploads/" });
const MEMBER_ROLE_ID = 9; // default role for new members

/* ─────────── helpers ─────────── */
function createRandomPassword(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ─────────── list + form page ─────────── */
router.get("/member", ensureLogin, ensurePermission("MANAGE_USER"), async (req, res) => {
  
  let membersQuery = "SELECT id, name, email FROM users";
  let params       = [];

  if (req.session.roleId !== 1) {              // NOT Super Admin
    membersQuery += " WHERE role_id >";
    params.push(req.session.roleId);               // show only Members
  }

  const [members] = await pool.query(membersQuery, params);

  res.render("member-manage", { members, error: null, success: null });
});

/* ─────────── add single member ─────────── */
router.post("/add-member", ensureLogin, ensurePermission("MANAGE_USER"), async (req, res) => {
  const { id, name, email } = req.body;
  if (!id || !email || !name) {
    const [members] = await pool.query("SELECT id,name,email FROM users WHERE role_id = ?", [MEMBER_ROLE_ID]);
    return res.render("member-manage", { members, error: "ID, Name & Email are required.", success: null });
  }

  try {
    const [[exists]] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists) {
      const [members] = await pool.query("SELECT id,name,email FROM users WHERE role_id = ?", [MEMBER_ROLE_ID]);
      return res.render("member-manage", { members, error: "User already exists.", success: null });
    }

    const pwd        = createRandomPassword();
    const hash       = await bcrypt.hash(pwd, 10);

    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, must_change_password, role_id) VALUES (?,?,?,?,1,?)",
      [id, name, email, hash, MEMBER_ROLE_ID]
    );

    await sendPasswordMail(email, pwd);
    await logAudit(
      "USER_CREATED",
      `Created user ${name} (${email})`,
      req.session.userId
    );
    
    let membersQuery = "SELECT id,name,email FROM users";
     let params       = [];
   
     if (req.session.roleId !== 1) {              // NOT Super Admin
       membersQuery += " WHERE role_id > ?";
       params.push(req.session.roleId);               // show only Members
     }
     membersQuery += " ORDER BY name";
  // all users & all roles
     const [members] = await pool.query(membersQuery, params);
    res.render("member-manage", { members, error: null, success: "Member added & password sent." });
  } catch (err) {
    console.error(err);
    const [members] = await pool.query("SELECT id,name,email FROM users WHERE role_id = ?", [MEMBER_ROLE_ID]);
    res.render("member-manage", { members, error: "DB error.", success: null });
  }
});

/* ─────────── bulk Excel upload ─────────── */
router.post("/upload-members", ensureLogin, ensurePermission("MANAGE_USER"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const workbook = new xlsx.Workbook();
  await workbook.xlsx.readFile(req.file.path);
  const sheet    = workbook.worksheets[0];

  const results  = { added: 0, skipped: 0, invalid: 0 };
  const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 2; i <= sheet.rowCount; i++) { // row-1 is header
    const id    = sheet.getCell(i, 1).text?.trim();
    const name  = sheet.getCell(i, 2).text?.trim();
    const email = sheet.getCell(i, 3).text?.trim();

    if (!emailRe.test(email)) { results.invalid++; continue; }
    const [[dup]] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (dup) { results.skipped++; continue; }

    const pwd  = createRandomPassword();
    const hash = await bcrypt.hash(pwd, 10);

    await pool.query(
      "INSERT INTO users (id,name,email,password_hash,must_change_password,role_id) VALUES (?,?,?,?,1,?)",
      [id, name || email, email, hash, MEMBER_ROLE_ID]
    );
    await sendPasswordMail(email, pwd);
    await logAudit(
      "USER_CREATED",
      `Bulk: Created user ${name} (${email}) from Excel`,
      req.session.userId
    );
    
    results.added++;
  }

  res.json(results);
});
/* ─────────── delete OR update based on action ─────────── */
router.post("/update-members", ensureLogin, ensurePermission("MANAGE_USER"), async (req, res) => {
  const changes = [];
  let updated = 0;

  let deletedIDs      = req.body.deleted || [];
  let deletedIDArr   = Array.isArray(deletedIDs) ? deletedIDs : [deletedIDs];

  let editedIDs = req.body.edited || [];
  let editedIDArr = Array.isArray(editedIDs) ? editedIDs : [editedIDs];

  editedIDArr = editedIDArr.map(String);
  deletedIDArr = deletedIDArr.map(String);
  editedIDArr= editedIDArr.filter(id => !deletedIDArr.includes(id)); // remove deleted IDs from edited IDs

  /* -------------- DELETE -------------- */
  if (deletedIDArr.length > 0) {       
      try {
        await pool.query("DELETE FROM users WHERE id IN (?)", [deletedIDArr]);
        await logAudit("USER_DELETED", `Deleted ${deletedIDArr.length} users: ${deletedIDArr.join(", ")}`, req.session.userId);
      } catch (err) {
        console.error("Delete failed:", err);
        return res.status(500).send("Delete error.");
      }
  }

  /* -------------- UPDATE -------------- */
  if (editedIDArr.length > 0) {
    const { userIds = [], ids = [], names = [], emails = [] } = req.body;
    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      const newName = names[i];
      const newEmail = emails[i];
      
      // edited row marked by its checkbox
      const isEdited = editedIDArr.includes(uid);
      if (!isEdited) continue;


      // simple validation
      if ( !newName || !newEmail) continue;

      // duplicate-email check (skip if same record)
      const [[dup]] = await pool.query(
        "SELECT id FROM users WHERE email = ? AND id <> ?",
        [newEmail, uid]
      );
      if (dup) continue; // skip duplicates silently; you could collect error msg

      try {
        const [[orig]] = await pool.query("SELECT id, name, email FROM users WHERE id = ?", [uid]);
          const diffs = [];      
          if (String(orig.name) !== String(newName)) 
            diffs.push(`Name: ${orig.name} → ${newName}`);
          
          if (String(orig.email) !== String(newEmail)) 
            diffs.push(`Email: ${orig.email} → ${newEmail}`);
          if (diffs.length > 0) {
            changes.push(`(${uid}: ${diffs.join(", ")})`);
          }
          
        await pool.query(
          "UPDATE users SET name = ?, email = ? WHERE id = ?",
          [newName, newEmail, uid]
        );
        updated++;
      } catch (err) {
        console.error(`Update failed for ${uid}:`, err);
      }
    }
    console.log(changes);

  const changeSummary = changes.join("; ");
  if(changeSummary)
    await logAudit("USER_UPDATED", `Updated ${updated} user(s): ${changeSummary}`, req.session.userId);
  }
  /* --- Reload member list --- */
  let membersQuery = "SELECT id,name,email FROM users";
  const params     = [];

  if (req.session.roleId !== 1) {      // NOT Super Admin
    membersQuery += " WHERE role_id > ?";
    params.push(req.session.roleId);
  }
  membersQuery += " ORDER BY name";

  const [members] = await pool.query(membersQuery, params);

  res.render("member-manage", {
    members,
    error: null,
    success: "Changes saved."
  });
});

module.exports = router;
