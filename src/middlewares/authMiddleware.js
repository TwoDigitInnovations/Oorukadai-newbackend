const passport = require("passport");

module.exports = function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
      console.log('fffdfsdbsfsbf', user, allowedRoles)
      if (err || !user) return res.status(401).json({ message: "Unauthorized" });

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      req.user = user;
      next();
    })(req, res, next);
  };
};
