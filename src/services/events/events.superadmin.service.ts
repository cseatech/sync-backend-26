import { eq, and } from "drizzle-orm";

import { db } from "../../db/index";

import { admins, events, adminAccess } from "../../db/schema";

import { throwError, handleDbError } from "../../utils/serviceError";

/**
 * Verify the requesting admin is a superadmin (privileged = true).
 * Throws 403 if not.
 *
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
function assertSuperAdmin(
  adminId: number | undefined,
  privileged: boolean | undefined,
): asserts adminId is number {
  if (!adminId) throwError("Admin ID is required", 401);
  if (!privileged) throwError("Superadmin access required", 403);
}

/**
 * Return all admins assigned to a given event,
 * along with their access metadata.
 *
 * @param eventId    - Event ID from URL param
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getEventAdmins(
  eventId: number | string,
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const parsedId = Number(eventId);
  if (!parsedId) throwError("Event ID is required", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Fetch all assigned admins joined with their profile
  const rows = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
      access_granted_by: adminAccess.access_granted_by,
      access_granted_at: adminAccess.access_granted_at,
    })
    .from(adminAccess)
    .innerJoin(admins, eq(adminAccess.admin_id, admins.admin_id))
    .where(eq(adminAccess.event_id, parsedId));

  return {
    event,
    count: rows.length,
    admins: rows,
  };
}

/**
 * Assign an admin to an event.
 * Prevents duplicate assignments via the unique constraint on (admin_id, event_id).
 *
 * @param eventId       - Event ID from URL param
 * @param targetAdminId - Admin ID from request body
 * @param grantedBy     - Superadmin ID from decoded JWT
 * @param privileged    - privileged flag from decoded JWT
 */
async function assignAdmin(
  eventId: number | string,
  targetAdminId: number | string,
  grantedBy: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(grantedBy, privileged);

  const parsedEventId = Number(eventId);
  const parsedAdminId = Number(targetAdminId);

  if (!parsedEventId) throwError("Event ID is required", 400);
  if (!parsedAdminId) throwError("Admin ID must be a positive integer", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedEventId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Verify target admin exists
  const [targetAdmin] = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
    })
    .from(admins)
    .where(eq(admins.admin_id, parsedAdminId))
    .limit(1);

  if (!targetAdmin) throwError("Admin not found", 404);

  const now = new Date();

  try {
    await db.insert(adminAccess).values({
      admin_id: parsedAdminId,
      event_id: parsedEventId,
      access_granted_by: grantedBy,
      access_granted_at: now,
    });
  } catch (error) {
    handleDbError(error);
  }

  return {
    event,
    assigned_admin: targetAdmin,
    access_granted_by: grantedBy,
    access_granted_at: now,
  };
}

/**
 * Remove an admin's access from an event.
 *
 * @param eventId       - Event ID from URL param
 * @param targetAdminId - Admin ID from request body
 * @param adminId       - Superadmin ID from decoded JWT
 * @param privileged    - privileged flag from decoded JWT
 */
async function removeAdmin(
  eventId: number | string,
  targetAdminId: number | string,
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const parsedEventId = Number(eventId);
  const parsedAdminId = Number(targetAdminId);

  if (!parsedEventId) throwError("Event ID is required", 400);
  if (!parsedAdminId) throwError("Admin ID must be a positive integer", 400);

  // Verify event exists
  const [event] = await db
    .select({ event_id: events.event_id, event_name: events.event_name })
    .from(events)
    .where(eq(events.event_id, parsedEventId))
    .limit(1);

  if (!event) throwError("Event not found", 404);

  // Verify the admin is actually assigned to this event
  const [existing] = await db
    .select()
    .from(adminAccess)
    .where(
      and(
        eq(adminAccess.admin_id, parsedAdminId),
        eq(adminAccess.event_id, parsedEventId),
      ),
    )
    .limit(1);

  if (!existing) throwError("This admin is not assigned to this event", 404);

  await db
    .delete(adminAccess)
    .where(
      and(
        eq(adminAccess.admin_id, parsedAdminId),
        eq(adminAccess.event_id, parsedEventId),
      ),
    );

  return {
    event,
    removed_admin_id: parsedAdminId,
  };
}

/**
 * Return all system administrators in the database.
 * Superadmin only (privileged = true).
 *
 * @param adminId    - Admin ID from decoded JWT
 * @param privileged - privileged flag from decoded JWT
 */
async function getAllSystemAdmins(
  adminId: number | undefined,
  privileged: boolean | undefined,
) {
  assertSuperAdmin(adminId, privileged);

  const rows = await db
    .select({
      admin_id: admins.admin_id,
      name: admins.name,
      email: admins.email,
      position: admins.position,
      domain: admins.domain,
      privileged: admins.privileged,
    })
    .from(admins);

  return rows;
}

export default {
  getEventAdmins,
  getAllSystemAdmins,
  assignAdmin,
  removeAdmin,
};

