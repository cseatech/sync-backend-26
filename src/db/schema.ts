import {
  pgTable,
  pgEnum,
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  smallint,
  text,
  time,
  timestamp,
  varchar,
  primaryKey,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";

const genderEnum = pgEnum("gender", ["Male", "Female", "Other"]);

const adminPositionEnum = pgEnum("admin_position", [
  "Executive",
  "Office Bearer",
  "Joint Secretary",
  "Co-ordinator",
]);

const eventTypeEnum = pgEnum("event_type", ["Tech", "Non-Tech"]);

const users = pgTable("users", {
  user_id: bigint("user_id", {
    mode: "number",
  }).primaryKey(),

  csea_code: varchar("csea_code", {
    length: 50,
  }),

  register_number: varchar("register_number", {
    length: 30,
  }).notNull(),

  full_name: varchar("full_name", {
    length: 150,
  }).notNull(),

  email: varchar("email", {
    length: 255,
  })
    .notNull()
    .unique(),

  phone: varchar("phone", {
    length: 15,
  }).notNull(),

  college: varchar("college", {
    length: 150,
  }).notNull(),

  department: varchar("department", {
    length: 100,
  }).notNull(),

  year: smallint("year").notNull(),

  gender: genderEnum("gender"),

  password_hash: text("password_hash").notNull(),

  created_at: timestamp("created_at", {
    withTimezone: true,
  }).notNull(),

  updated_at: timestamp("updated_at", {
    withTimezone: true,
  }),
});

const admins = pgTable("admins", {
  admin_id: bigint("admin_id", {
    mode: "number",
  }).primaryKey(),

  name: varchar("name", {
    length: 100,
  }).notNull(),

  email: varchar("email", {
    length: 255,
  })
    .notNull()
    .unique(),

  password_hash: text("password_hash").notNull(),

  position: adminPositionEnum("position").notNull(),

  domain: text("domain"),

  privileged: boolean("privileged").default(false).notNull(),
});

const events = pgTable("events", {
  event_id: bigint("event_id", {
    mode: "number",
  }).primaryKey(),

  event_name: varchar("event_name", {
    length: 150,
  }).notNull(),

  description: text("description"),

  max_team_size: integer("max_team_size").default(1),

  event_type: eventTypeEnum("event_type"),

  prize: integer("prize"),

  contact: jsonb("contact"),
});

const round = pgTable(
  "round",
  {
    event_id: bigint("event_id", {
      mode: "number",
    }).notNull(),

    round_num: integer("round_num").notNull(),

    date: date("date"),

    start_time: time("start_time"),

    end_time: time("end_time"),

    venue: varchar("venue", {
      length: 100,
    }),
  },

  (table) => ({
    pk: primaryKey({
      columns: [table.event_id, table.round_num],
    }),

    eventFk: foreignKey({
      columns: [table.event_id],

      foreignColumns: [events.event_id],

      name: "round_event_id_fkey",
    }),
  }),
);

const adminAccess = pgTable(
  "admin_access",
  {
    admin_id: bigint("admin_id", {
      mode: "number",
    }),

    event_id: bigint("event_id", {
      mode: "number",
    }),

    access_granted_by: bigint("access_granted_by", {
      mode: "number",
    }),

    access_granted_at: timestamp("access_granted_at", {
      withTimezone: true,
    }),
  },

  (table) => ({
    uniqueAdminEvent: unique("admin_access_admin_id_event_id_key").on(
      table.admin_id,
      table.event_id,
    ),

    adminFk: foreignKey({
      columns: [table.admin_id],

      foreignColumns: [admins.admin_id],

      name: "admin_access_admin_id_fkey",
    }),

    eventFk: foreignKey({
      columns: [table.event_id],

      foreignColumns: [events.event_id],

      name: "admin_access_event_id_fkey",
    }),

    grantedByFk: foreignKey({
      columns: [table.access_granted_by],

      foreignColumns: [admins.admin_id],

      name: "admin_access_access_granted_by_fkey",
    }),
  }),
);

const eventParticipation = pgTable(
  "event_participation",
  {
    event_id: bigint("event_id", {
      mode: "number",
    }).notNull(),

    user_id: bigint("user_id", {
      mode: "number",
    }).notNull(),

    team_no: integer("team_no"),

    created_by_admin_id: bigint("created_by_admin_id", {
      mode: "number",
    }).notNull(),

    created_at: timestamp("created_at", {
      withTimezone: true,
    }).notNull(),
  },

  (table) => ({
    pk: primaryKey({
      columns: [table.event_id, table.user_id],
    }),

    eventFk: foreignKey({
      columns: [table.event_id],

      foreignColumns: [events.event_id],

      name: "event_participation_event_id_fkey",
    }),

    userFk: foreignKey({
      columns: [table.user_id],

      foreignColumns: [users.user_id],

      name: "event_participation_user_id_fkey",
    }),

    createdByAdminFk: foreignKey({
      columns: [table.created_by_admin_id],

      foreignColumns: [admins.admin_id],

      name: "event_participation_created_by_admin_id_fkey",
    }),
  }),
);

const participationGarbage = pgTable("participation_garbage", {
  garbage_id: bigserial("garbage_id", {
    mode: "number",
  }).primaryKey(),

  event_id: bigint("event_id", {
    mode: "number",
  }).notNull(),

  user_id: bigint("user_id", {
    mode: "number",
  }).notNull(),

  team_no: integer("team_no"),

  deleted_by_admin_id: bigint("deleted_by_admin_id", {
    mode: "number",
  }).notNull(),

  deleted_at: timestamp("deleted_at", {
    withTimezone: true,
  }).notNull(),
});

const winners = pgTable(
  "winners",
  {
    event_id: bigint("event_id", {
      mode: "number",
    }).notNull(),

    user_id: bigint("user_id", {
      mode: "number",
    }).notNull(),

    position: smallint("position").notNull(),

    awarded_at: timestamp("awarded_at", {
      withTimezone: true,
    }),
  },

  (table) => ({
    pk: primaryKey({
      columns: [table.event_id, table.user_id],
    }),

    eventFk: foreignKey({
      columns: [table.event_id],

      foreignColumns: [events.event_id],

      name: "winners_event_id_fkey",
    }),

    userFk: foreignKey({
      columns: [table.user_id],

      foreignColumns: [users.user_id],

      name: "winners_user_id_fkey",
    }),
  }),
);

export {
  users,
  admins,
  events,
  round,
  adminAccess,
  eventParticipation,
  participationGarbage,
  winners,
};
