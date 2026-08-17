const authService = require("../../services/auth/auth.service");
const {
  loginSchema,
  profileByCseaCodeSchema,
  changePasswordSchema,
  forgetPasswordSchema,
} = require("../../validators/auth.validator");

async function login(req, res, next) {
  try {
    const body = req.body || {};
    const parsed = loginSchema.parse(body);
    const result = await authService.login(parsed);
    console.log(result);
    
    res.status(200).json({
      success: true,
      message: "Login successful",
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

async function getProfile(req, res, next) {
  try {
    const params = profileByCseaCodeSchema.parse(req.params || {});
    const profile = await authService.getProfileByCseaCode(params.csea_code, req.user);

    res.status(200).json({
      success: true,
      data: profile,
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

async function changePassword(req, res, next) {
  try {
    const body = req.body || {};
    const parsed = changePasswordSchema.parse(body);
    const result = await authService.changePassword(req.user?.user_id, parsed);

    res.status(200).json({
      success: true,
      message: result.message,
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

async function forgetPassword(req, res, next) {
  try {
    const body = req.body || {};
    const parsed = forgetPasswordSchema.parse(body);
    const result = await authService.forgetPassword(parsed);

    res.status(200).json({
      success: true,
      message: result.message,
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

module.exports = { login, getProfile, changePassword, forgetPassword };
