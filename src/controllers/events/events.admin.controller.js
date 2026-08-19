const eventsAdminService = require("../../services/events/events.admin.service");
const {
  participantCseaCodeParamSchema,
} = require("../../validators/events.validator");

/**
 * GET /api/v1/admin/participant/:csea_code
 * Returns full participant profile for the given csea_code.
 * Admin only.
 */
async function getParticipant(req, res, next) {
  try {
    const params = participantCseaCodeParamSchema.parse(req.params || {});
    const data = await eventsAdminService.getParticipantByCseaCode(
      params.csea_code
    );

    return res.status(200).json({
      success: true,
      data,
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

/**
 * GET /api/v1/admin/events
 * Returns all events assigned to the currently authenticated admin.
 */
async function getAdminAssignedEvents(req, res, next) {
  try {
    const data = await eventsAdminService.getAssignedEvents(
      req.user?.admin_id
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

module.exports = {
  getParticipant,
  getAdminAssignedEvents,
};
