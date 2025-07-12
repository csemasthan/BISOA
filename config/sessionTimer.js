module.exports = function sessionTimer(req, res, next) {
    const MAX_AGE = 30 * 60 * 1000; // 15 mins in ms
    req.session.touch(); // resets the session expiration on each request
  
    const expiresInMs = req.session.cookie.expires - Date.now();
    res.locals.sessionRemainingSeconds = Math.floor(expiresInMs / 1000);
  
    next();
  };
  