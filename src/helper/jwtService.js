'use strict';
const jwt = require('jsonwebtoken');

module.exports = class jwtService {
  constructor() {}

  createJwtToken(user) {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        tokenVersion: new Date().toISOString(),
      },
      process.env.JWT_SECRET,
      {
        algorithm: process.env.JWT_ALGORITHM,
        expiresIn: process.env.JWT_EXPIRATION,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      }
    );
  }
};
