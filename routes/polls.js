// routes/polls.js  – drop-in

const express = require("express");

const { pool, ensureLogin, ensurePermission } = require("../config/db");
const { logAudit } = require("../utils/audit");

const router = express.Router();
const moment = require('moment-timezone');
const now = moment();

/* ─────────  LIST  ───────── */
router.get("/polls", ensureLogin, async (req, res) => {
  const userId = req.session.userId;

  // Fetch available roles from your roles table (modify this query based on your schema)
  const [roles] = await pool.query('SELECT * FROM roles');

  // Fetch user role and permissions to determine eligibility
  const [[user]] = await pool.query("SELECT role_id FROM users WHERE id=?", [userId]);
  const userRoleId = user.role_id;

  // Check if user has "MANAGE_POLLS" permission
  const isAdmin = req.session.activities?.some(a => a.code === "MANAGE_POLLS");

  // Fetch poll data, including start time, end time, and poll questions
  let query = `
  SELECT p.*, 
         NOW() < p.open_time AS not_yet,
         NOW() BETWEEN p.open_time AND p.close_time AS is_open,
         COUNT(DISTINCT v.user_id) AS participants,
         EXISTS (
           SELECT 1
           FROM poll_votes pv
           WHERE pv.poll_id = p.id
           AND pv.user_id = ?
         ) AS has_voted
  FROM polls p
  LEFT JOIN poll_votes v ON v.poll_id = p.id
  LEFT JOIN poll_roles pr ON pr.poll_id = p.id
  WHERE `;

// Admin check: if user is admin, fetch all polls, else fetch polls user is eligible for
if (isAdmin) {
  query += '1=1'; // Admin sees all polls
} else {
  query += '(pr.role_id = ?)';
}

query += `
  GROUP BY p.id
  ORDER BY p.open_time DESC, p.id DESC
`;

// Fetch poll data
const [polls] = await pool.query(query, isAdmin ? [userId] : [userId,userRoleId]);


  // Fetch poll questions for each poll
  for (let i = 0; i < polls.length; i++) {
    const [questions] = await pool.query('SELECT * FROM poll_questions WHERE poll_id = ?', [polls[i].id]);
    polls[i].questions = questions;
  }

  // Process poll participation percentage and format times
  polls.forEach(p => {
    p.participation = p.all_users ? Math.round(100 * p.participants / p.all_users) : 0;
    p.open_time = moment(p.open_time).format('YYYY-MM-DD HH:mm');
    p.close_time = moment(p.close_time).format('YYYY-MM-DD HH:mm');
  });

  res.render("polls", {
    polls,
    roles,  // Pass roles to the view
    canManage: isAdmin, // Check if user has manage polls rights
    messages: req.flash('messages')
  });
});


/* ─────────  CREATE  ───────── */
router.post("/polls/new", ensureLogin, ensurePermission("MANAGE_POLLS"), async (req, res) => {
  const { questions, roles, start_time, end_time, options } = req.body;
  // Check if there are at least one question
  if (!Array.isArray(questions) || questions.length < 1) {
    req.flash("messages", { text: "Poll must have at least one question.", type: "danger" });
    return res.redirect("/polls");
  }

  // Check if each question has at least 2 options
  for (let i = 0; i < questions.length; i++) {
    if (!Array.isArray(options[i]) || options[i].length < 2) {
      req.flash("messages", { text:  `Question ${i + 1} must have at least 2 options.`, type: "danger" });
      return res.redirect("/polls");
    }
  }

  // Insert poll into polls table
  const [pollResult] = await pool.query(
    `INSERT INTO polls (open_time, close_time) VALUES (?, ?)`,
    [start_time, end_time]
  );
  const pollId = pollResult.insertId;

  // Insert questions into poll_questions table
  const questionsData = questions.map(q => [pollId, q.text.trim(), q.select_type]);
  const [questionsResult] = await pool.query(
    `INSERT INTO poll_questions (poll_id, question, select_type) VALUES ?`,
    [questionsData]
  );

  // Get the generated question IDs
  const questionIds = questionsResult.insertId;

  // Insert options for each question into poll_options table
  const optionsData = [];
  questions.forEach((q, questionIndex) => {
    const questionId = questionIds + questionIndex;  // This now uses the correct question ID
    options[questionIndex].forEach(optionText => {
      if (optionText.trim()) {
        optionsData.push([pollId, questionId, optionText.trim()]);
      }
    });
  });

  await pool.query(
    `INSERT INTO poll_options (poll_id, question_id, option_text) VALUES ?`,
    [optionsData]
  );

  // Handle the roles insertion:
  let rolesData = [];
  if (roles.includes('all')) {
    // If 'all' is selected, add all available roles to the poll
    const [availableRoles] = await pool.query('SELECT id FROM roles');
    rolesData = availableRoles.map(role => [pollId, role.id]);
  } else {
    // If specific roles are selected, add them to the poll
    rolesData = roles.map(roleId => [pollId, roleId]);
  }

  await pool.query(
    `INSERT INTO poll_roles (poll_id, role_id) VALUES ?`,
    [rolesData]
  );

  await logAudit("POLL_CREATED", `poll:${pollId}`, req.session.userId);
  req.flash("messages", { text: "Poll created successfully.", type: "success" });
  res.redirect("/polls");
});


/* ─────────  DETAIL  ───────── */
router.get("/polls/:id", ensureLogin, async (req, res) => {
  const pollId = req.params.id;
  const uid = req.session.userId;

  const [[user]] = await pool.query("SELECT role_id FROM users WHERE id=?", [uid]);

  // Check if the user's role is allowed to participate in the poll
  const [[roleCheck]] = await pool.query(`
    SELECT COUNT(*) AS allowed
    FROM poll_roles pr
    WHERE pr.poll_id = ? AND pr.role_id = ?`, [pollId, user.role_id]);

  const [[poll]] = await pool.query("SELECT * FROM polls WHERE id=?", [pollId]);
  if (!poll) {
    req.flash("messages", { text: "No such poll exists.", type: "danger" });
    return res.redirect("/polls");
  }

  const [questions] = await pool.query("SELECT * FROM poll_questions WHERE poll_id=?", [pollId]);
  const [options] = await pool.query(`
    SELECT o.id, o.option_text, o.question_id, 
           COALESCE(COUNT(v.user_id), 0) AS votes  -- Correct vote count with COALESCE
    FROM poll_options o
    LEFT JOIN poll_votes v ON v.option_id = o.id
    WHERE o.poll_id = ?
    GROUP BY o.id`, [pollId]);

    
    let pollStatus = "Closed";
    
    const storedPollStartTime = moment(poll.open_time);  // The time from the DB, stored as local time
    const storedPollCloseTime = moment(poll.close_time);  // The time from the DB, stored as local time

    // Get the current time in your system's local timezone
    const currentTime = moment();  // Current system time in local timezone
    // Compare the current time with the poll start time
    if (currentTime.isBefore(storedPollStartTime)) {
      pollStatus = "Upcoming";
    } else if (currentTime.isBetween(storedPollStartTime, storedPollCloseTime, null, '[]')) {
      pollStatus = "Started";
    }
  // Check if the user has "POLL_GRAPHICS" permission in the session activities
  const hasPermission = req.session.activities && req.session.activities?.some(a => a.code === "MANAGE_POLLS");

  // Get the total number of unique votes (distinct users)
const [[totalVotes_row]] = await pool.query(`
  SELECT COUNT(DISTINCT user_id) AS total_votes
  FROM poll_votes
  WHERE poll_id = ?`, [pollId]);

const totalVotes = totalVotes_row.total_votes;

  // Fetch the role IDs associated with the poll
  const [roleIds] = await pool.query(`
    SELECT DISTINCT role_id 
    FROM poll_roles 
    WHERE poll_id = ?`, [pollId]);
  
  
  let totalAllowedToVote = 0;
  
  // If there are role IDs, proceed with the user count query
  if (roleIds.length > 0) {
    const roleIdsList = roleIds.map(role => role.role_id);  
    // Count users with the roles
    const [usersCount] = await pool.query(`
      SELECT COUNT(DISTINCT id) AS total_allowed
      FROM users
      WHERE role_id IN (?)`, [roleIdsList]);
  
    totalAllowedToVote = usersCount[0].total_allowed;
  }

  

  // Calculate participation percentage
  const participationPercentage = Math.round(100 * totalVotes / totalAllowedToVote);

  // Check if the user has already voted
  const [[userVote]] = await pool.query(`
    SELECT COUNT(*) AS hasVoted
    FROM poll_votes
    WHERE poll_id = ? AND user_id = ?`, [pollId, uid]);

  const hasVoted = userVote.hasVoted > 0;

  // Determine if the chart should be shown (poll is closed or user has permission)
  const showChart = (pollStatus === 'Closed' || hasPermission);

  res.render("poll_detail", {
    poll, questions, options,
    active: pollStatus,   // Can be "Upcoming", "Started", or "Closed"
    hasVoted: hasVoted,   // Determines if the user has voted or not
    canVote: roleCheck.allowed > 0, // Determines if the user is allowed to vote
    showChart: showChart,  // Controls if the chart should be displayed
    participationPercentage, // Participation percentage
    totalVotes            // Total number of votes
  });
});


/* ─────────  VOTE  ───────── */
router.post("/polls/:id/vote", ensureLogin, async (req, res) => {
  const pollId = req.params.id;
  const uid = req.session.userId;

  const [[user]] = await pool.query("SELECT role_id FROM users WHERE id=?", [uid]);

  // Check if the user's role is allowed to participate in the poll
  const [[roleCheck]] = await pool.query(`
    SELECT COUNT(*) AS allowed
    FROM poll_roles pr
    WHERE pr.poll_id = ? AND pr.role_id = ?`, [pollId, user.role_id]);

  if (roleCheck.allowed === 0) {
    return res.status(403).send("You are not allowed to participate in this poll");
  }

  // Accessing selected options, ensuring it's an array
  const selected = [];
  // Loop through each question to get its selected options
  for (let key in req.body) {
    if (key.startsWith('options_')) {
      // If it's an array of options (multi-select), add them to selected
      if (Array.isArray(req.body[key])) {
        selected.push(...req.body[key]);
      } else {
        selected.push(req.body[key]); // If it's a single option, just add it
      }
    }
  }


  // Validate if options are selected
  if (selected.length === 0) {
    req.flash("messages", "You must select at least one option.");
    return res.redirect(`/polls/${pollId}`);
  }

  // Check if poll exists and if it's open
  const [[poll]] = await pool.query(`
    SELECT *, NOW() BETWEEN open_time AND close_time AS is_open
    FROM polls WHERE id=?`, [pollId]);

  if (!poll || !poll.is_open) {
    return res.status(400).send("Poll closed or doesn't exist");
  }

  // Check if the user has already voted
  const [[dup]] = await pool.query(
    "SELECT COUNT(*) AS n FROM poll_votes WHERE poll_id=? AND user_id=?",
    [pollId, uid]
  );

  if (dup.n) {
    req.flash("messages", "You have already voted.");
    return res.redirect(`/polls/${pollId}`);
  }

  // Insert the selected options into the poll_votes table
  const rows = selected.map(o => [pollId, o, uid]);
  await pool.query("INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ?", [rows]);

  await logAudit("POLL_VOTED", `poll:${pollId} user:${uid}`, uid);
  req.flash("messages", "Vote successfully cast!");
  res.redirect(`/polls/${pollId}`);
});


/* ─────────  EDIT  (before start) ───────── */
// Edit Poll
router.post("/polls/edit/:id", ensureLogin, ensurePermission("MANAGE_POLLS"), async (req, res) => {
  const pollId = req.params.id;
  const { questions, start_time, end_time, options, roles } = req.body;
  // Validate questions and options
  if (!Array.isArray(questions) || questions.length < 1) {
    req.flash("messages", "Poll must have at least one question.");
    return res.redirect(`/polls/edit/${pollId}`);
  }

  // Ensure each question has at least 2 options
  for (let i = 0; i < questions.length; i++) {
    if (!Array.isArray(options[i]) || options[i].length < 2) {
      req.flash("messages", `Question ${i + 1} must have at least 2 options.`);
      return res.redirect(`/polls/edit/${pollId}`);
    }
  }

  // Flushing old poll data and inserting new details
  try {
    // Clear existing questions, options, and roles
    await pool.query("DELETE FROM poll_options WHERE poll_id=?", [pollId]);
    await pool.query("DELETE FROM poll_questions WHERE poll_id=?", [pollId]);
    await pool.query("DELETE FROM poll_roles WHERE poll_id=?", [pollId]);

    // Update poll timing
    await pool.query("UPDATE polls SET open_time=?, close_time=? WHERE id=?", [start_time, end_time, pollId]);

// Insert new questions
const questionsData = questions.map(q => [pollId, q.text.trim(), q.select_type]);
const [questionsResult] = await pool.query("INSERT INTO poll_questions (poll_id, question, select_type) VALUES ?", [questionsData]);

// Get the generated question IDs
const questionIds = questionsResult.insertId;  // This is the first inserted question ID

// Insert new options
const optionsData = [];
questions.forEach((q, questionIndex) => {
  const questionId = questionIds + questionIndex;  // This now uses the correct question ID
  options[questionIndex].forEach(optionText => {
    if (optionText.trim()) {
      optionsData.push([pollId, questionId, optionText.trim()]);
    }
  });
});

await pool.query("INSERT INTO poll_options (poll_id, question_id, option_text) VALUES ?", [optionsData]);

let rolesData = [];
  if (roles.includes('all')) {
    // If 'all' is selected, add all available roles to the poll
    const [availableRoles] = await pool.query('SELECT id FROM roles');
    rolesData = availableRoles.map(role => [pollId, role.id]);
  } else {
    // If specific roles are selected, add them to the poll
    rolesData = roles.map(roleId => [pollId, roleId]);
  }
    await pool.query("INSERT INTO poll_roles (poll_id, role_id) VALUES ?", [rolesData]);

    req.flash("messages", { text: "Poll updated successfully.", type: "success" });
    res.redirect(`/polls`);
  } catch (err) {
    console.error(err);
    req.flash("messages", { text: "An error occurred while updating the poll.", type: "danger" });
    res.redirect(`/polls`);
  }
});


// Get Poll Edit Form
router.get("/polls/edit/:id", ensureLogin, ensurePermission("MANAGE_POLLS"), async (req, res) => {
  const pollId = req.params.id;

  // Fetch the poll details
  const [[poll]] = await pool.query("SELECT * FROM polls WHERE id=?", [pollId]);
  if (!poll){
    req.flash("messages", { text: "No such poll exists.", type: "danger" });
    return res.redirect("/polls");
  }
  // Fetch poll votes to determine if it's started
  const [votes] = await pool.query("SELECT * FROM poll_votes WHERE poll_id=?", [pollId]);
  poll.open_time = moment(poll.open_time);  // The time from the DB, stored as local time
  poll.close_time = moment(poll.close_time);  // The time from the DB, stored as local time

  if (votes.length > 0 || now.isAfter(poll.close_time)) {
    req.flash("messages", { text: "The poll you are attempting to edit has already received votes or has been closed. Editing is no longer permitted.", type: "danger" });
    return res.redirect("/polls"); // Redirect back to the poll list page
  }

  // Fetch questions and options for each question in the poll
  const [questions] = await pool.query("SELECT * FROM poll_questions WHERE poll_id=?", [pollId]);
  const options = [];
  for (const question of questions) {
    const [opts] = await pool.query("SELECT * FROM poll_options WHERE question_id=?", [question.id]);
    options.push(opts);
  }

  // Fetch available roles from your roles table
  const [roles] = await pool.query('SELECT * FROM roles');

  // Fetch roles assigned to the poll
  const [assignedRoles] = await pool.query("SELECT role_id FROM poll_roles WHERE poll_id=?", [pollId]);

  // Render the poll edit form with existing data
  res.render("poll_edit", {
    poll, // Poll details
    questions, // Questions for this poll
    options, // Options for each question
    roles,  // Pass roles to the view
    canManage: req.session.activities?.some(a => a.code === "MANAGE_POLLS") || false,
    assignedRoles: assignedRoles.map(role => role.role_id), // The roles selected for the poll
    messages: req.flash('messages'), // Pass the flash message
  });
});


// Delete Poll
router.post("/polls/delete/:id", ensureLogin, ensurePermission("MANAGE_POLLS"), async (req, res) => {
  const pollId = req.params.id;

  // Check if the poll exists
  const [[poll]] = await pool.query("SELECT * FROM polls WHERE id=?", [pollId]);
  if (!poll){
    req.flash("messages", { text: "No such poll exist.", type: "danger" });
    return res.redirect("/polls");
  }

  // Delete associated data
  await pool.query("DELETE FROM poll_votes WHERE poll_id=?", [pollId]); // Remove all votes for the poll
  await pool.query("DELETE FROM poll_options WHERE poll_id=?", [pollId]); // Remove all options for the poll
  await pool.query("DELETE FROM poll_questions WHERE poll_id=?", [pollId]); // Remove all questions for the poll
  await pool.query("DELETE FROM poll_roles WHERE poll_id=?", [pollId]); // Remove roles linked to the poll

  // Finally, delete the poll itself
  await pool.query("DELETE FROM polls WHERE id=?", [pollId]);

  await logAudit("POLL_DELETED", `poll:${pollId}`, req.session.userId);
  req.flash("messages", { text: "Poll deleted successfully.", type: "success" });
  res.redirect("/polls");
});

// Extend Poll
router.post("/polls/extend/:id", ensureLogin, ensurePermission("MANAGE_POLLS"), async (req, res) => {
  const pollId = req.params.id;
  const { new_end_time } = req.body;

  // Ensure the new_end_time is a valid datetime
  const newEndTime = new Date(new_end_time);
  if (isNaN(newEndTime)) {
    req.flash("messages", { text: "Invalid date format for new end time.", type: "danger" });
    return res.redirect("/polls");
  }

  // Fetch the poll from the database
  const [[poll]] = await pool.query("SELECT * FROM polls WHERE id=?", [pollId]);
  if (!poll){
    req.flash("messages", { text: "No such poll exists.", type: "danger" });
    return res.redirect("/polls");
  }

  // Update the poll's end time
  await pool.query("UPDATE polls SET close_time=? WHERE id=?", [newEndTime, pollId]);

  req.flash("messages", { text: "Poll Closing Time Adjusted successfully.", type: "success" });
  res.redirect(`/polls`);
});



module.exports = router;
