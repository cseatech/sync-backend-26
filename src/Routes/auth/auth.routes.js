const express = require("express");
const { login, getProfile, changePassword, forgetPassword } = require("../../controllers/auth/auth.controller");
const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/auth/login", login);
router.post("/auth/changePassword", protect, authorize("user"), changePassword);
router.post("/auth/forgetPassword", forgetPassword);
router.get("/auth/profile/:csea_code", protect, authorize("user", "admin"), getProfile);
router.get("/auth/me", protect, authorize("user"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
