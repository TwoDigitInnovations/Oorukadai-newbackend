// config/passport.js
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/User");
const passport = require("passport");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // expects: Authorization: Bearer <token>
  secretOrKey: process.env.JWT_SECRET || "secret123",
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) return done(null, user);
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;
