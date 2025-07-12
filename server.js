require("dotenv").config();
const express  = require("express");
const session  = require("express-session");
const path     = require("path");
require("./jobs/notificationSender");   

const app = express();


/* ─── Static & view engine ───────────────────────── */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

/* ─── Session: 15-min rolling expiry ─────────────── */
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000 // 15 minutes
  },
  rolling: true // <== THIS ensures session is refreshed on each req
}));

const flash = require('connect-flash');
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});


const sessionTimer = require('./config/sessionTimer');
app.use(sessionTimer);
const activityLoader = require('./config/activityLoader');
app.use(activityLoader);



/* ─── Supply remaining seconds to all EJS views ─── */
app.use((req, res, next) => {
  if (!req.session.userId) {
    res.locals.sessionRemainingSeconds = 0;
    return next();
  }

  const remaining = Math.round(
    (req.session.cookie.expires - Date.now()) / 1000
  );
  res.locals.sessionRemainingSeconds = remaining;
  next();
});


/* ─── Tiny keep-alive (/ping) ─────────────────────────── */
app.get("/ping", (req, res) => {
  if (!req.session || !req.session.userId) return res.sendStatus(204);

  // 15 minutes in ms
  const MAX_AGE = req.session.cookie.maxAge || 15 * 60 * 1000;

  /* 1. hard-reset the cookie expiry */
  req.session.cookie.expires = new Date(Date.now() + MAX_AGE);
  req.session.cookie.maxAge  = MAX_AGE;      // keep fields consistent
  req.session.touch();                       // mark session as active

  /* 2. seconds left for the client timer */
  const remaining = Math.round(
    (req.session.cookie.expires - Date.now()) / 1000
  );

  res.json({ remainingSeconds: remaining }); // usually 900
});

app.use(async (req, res, next) => {
  res.locals.activities = req.session.activities || [];
  res.locals.username = req.session.username || null;
  next();
});

/* ─── Routes ─────────────────────────────────────── */
app.use(require("./routes/auth"));
app.use(require("./routes/member"));
app.use(require("./routes/change-permissions"));
app.use(require("./routes/change-role"));
app.use(require("./routes/forgot"));
app.use(require("./routes/audit"));
app.use(require("./routes/profile"));
app.use(require("./routes/documents"));
app.use(require("./routes/topics"));
app.use(require("./routes/topicProposals"));
app.use(require("./routes/manage-topics"));
app.use(require("./routes/notifications"));
app.use(require("./routes/categories"));
app.use(require("./routes/polls"));


  

/* ─── Catch-all → dashboard or login ─────────────── */
app.use((req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.redirect("/dashboard");
});

/* ─── Start server ───────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
