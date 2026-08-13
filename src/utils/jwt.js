const jwt = require("jsonwebtoken");
const config = require("../config/env");

const JWT_SECRET = process.env.JWT_SECRET || "change_me_in_production";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
};
