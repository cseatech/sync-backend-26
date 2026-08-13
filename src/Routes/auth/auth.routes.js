const express = require("express");
const { login } = require("../../controllers/auth/auth.controller");
const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/auth/login", login);
router.get("/auth/me", protect, authorize("user"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
