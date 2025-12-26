const passport = require("passport");


module.exports = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, function (err, user, info) {
      
        if (user) {
            req.user = user;
            req.isAuthenticated = true;
        } else {
          
            req.user = null;
            req.isAuthenticated = false;
        }
        next();
    })(req, res, next);
};
