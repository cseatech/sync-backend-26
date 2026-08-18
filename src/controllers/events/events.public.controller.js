const eventsPublicService = require("../../services/events/events.public.service");
const {
  eventIdParamSchema,
  participantCseaCodeParamSchema,
} = require("../../validators/events.public.validator");

/**
 * GET /api/v1/events
 * Returns a list of all events with their rounds.
 */
async function listAllEvents(req, res, next) {
  try {
    const data = await eventsPublicService.getAllEvents();

    return res.status(200).json({
      success: true,
      count: data.length,
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

/**
 * GET /api/v1/events/:event_id
 * Returns details of a single event including its rounds.
 */
async function getEventDetails(req, res, next) {
  try {
    const params = eventIdParamSchema.parse(req.params || {});
    const data = await eventsPublicService.getEventById(params.event_id);

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
 * GET /api/v1/events/participant/:csea_code
 * Returns all events a user is registered for, identified by csea_code.
 * Requires a valid user token; user_id is taken from the token.
 */
async function getParticipantEvents(req, res, next) {
  try {
    const params = participantCseaCodeParamSchema.parse(req.params || {});
    const data = await eventsPublicService.getRegisteredEventsByParticipant(
      params.csea_code,
      req.user
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

module.exports = {
  listAllEvents,
  getEventDetails,
  getParticipantEvents,
};
