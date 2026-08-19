const { eq } = require("drizzle-orm");
const { db } = require("../../db/index");
const { users, admins, events, adminAccess } = require("../../db/schema");
const { throwError } = require("../../utils/serviceError");

/**
 * Fetch a participant's full profile by csea_code.
 * Admin-only. Excludes sensitive fields (password_hash).
 * @param {string} cseaCode
 */
async function getParticipantByCseaCode(cseaCode) {
  const normalizedCode = String(cseaCode || "").trim();

  if (!normalizedCode) throwError("CSEA code is required", 400);

  const [participant] = await db
    .select({
      csea_code: users.csea_code,
      register_number: users.register_number,
      full_name: users.full_name,
      email: users.email,
      phone: users.phone,
      college: users.college,
      department: users.department,
      year: users.year,
      gender: users.gender,
    })
    .from(users)
    .where(eq(users.csea_code, normalizedCode))
    .limit(1);

  if (!participant) throwError("No participant found with the given CSEA code", 404);

  return participant;
}

/**
 * Fetch all events assigned to the currently authenticated admin.
 * Resolves assignments via the admin_access table.
 * @param {number} adminId - from decoded token (req.user.admin_id)
 */
async function getAssignedEvents(adminId) {
  if (!adminId) throwError("Admin ID is required", 401);

  const [admin] = await db
    .select({ admin_id: admins.admin_id, name: admins.name })
    .from(admins)
    .where(eq(admins.admin_id, Number(adminId)))
    .limit(1);

  if (!admin) throwError("Admin not found", 404);

  const accessRows = await db
    .select()
    .from(adminAccess)
    .where(eq(adminAccess.admin_id, Number(adminId)));

  if (!accessRows || accessRows.length === 0) {
    return {
      admin: { admin_id: admin.admin_id, name: admin.name },
      assigned_events: [],
    };
  }

  const assignedEventIds = accessRows.map((row) => row.event_id);

  // Fetch all events and filter only the ones this admin is assigned to
  // ? change this to a where clause ?
  const allEvents = await db.select().from(events);
  const assignedEvents = allEvents.filter((e) =>
    assignedEventIds.includes(e.event_id)
  );

  // Attach grant metadata to each event
  // ? is access_granted_by field required ?
  const enriched = assignedEvents.map((event) => {
    const access = accessRows.find((row) => row.event_id === event.event_id);
    return {
      ...event,
      access_granted_at: access?.access_granted_at ?? null,
    };
  });

  return {
    admin: { admin_id: admin.admin_id, name: admin.name },
    assigned_events: enriched,
  };
}

module.exports = {
  getParticipantByCseaCode,
  getAssignedEvents,
};
