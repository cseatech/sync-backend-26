const express = require("express");
const { adminLogin, changePassword } = require("../../controllers/admin/admin.controller");
const { protect, authorize } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/admin/changePassword", protect, authorize("admin"), changePassword);
router.get("/admin/me", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
