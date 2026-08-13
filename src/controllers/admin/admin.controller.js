const adminService = require("../../services/admin/admin.service");
const { adminLoginSchema } = require("../../validators/auth.validator");

async function adminLogin(req, res, next) {
  try {
    const body = req.body || {};
    const parsed = adminLoginSchema.parse(body);
    const result = await adminService.adminLogin(parsed);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const message = error.issues?.[0]?.message || "Validation failed";
      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

module.exports = { adminLogin };
