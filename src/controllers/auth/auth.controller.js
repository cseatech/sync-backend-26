const authService = require("../../services/auth/auth.service");
const { loginSchema } = require("../../validators/auth.validator");

async function login(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Validation failed",
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

module.exports = { login };
