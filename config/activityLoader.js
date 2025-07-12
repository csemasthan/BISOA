const { getUserActivities, getUserById, pool } = require('./db');

module.exports = async function activityLoader(req, res, next) {
  if (!req.session.userId || !req.session.roleId) {
    return next();
  }

  const now = Date.now();
  const lastFetched = req.session.activitiesFetchedAt || 0;

  // Refresh activities every 2 minutes
  if (!req.session.activities || now - lastFetched > 2 * 60 * 1000) {
    req.session.activities = await getUserActivities(req.session.roleId);
    req.session.activitiesFetchedAt = now;
  }

  // ✅ Fetch full user object if not already present
  if (!req.session.user) {
    req.session.user = await getUserById(req.session.userId);
  }

  // ✅ Now set user in res.locals
  res.locals.user = req.session.user;
  res.locals.activities = req.session.activities;

  next();
};
