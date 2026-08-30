/**
 * scripts/seed-admins.ts
 *
 * One-shot utility to seed the admins table from a JSON file.
 *
 * Usage:
 *   npx ts-node scripts/seed-admins.ts
 *   npx ts-node scripts/seed-admins.ts --file scripts/my-admins.json  (custom path)
 *   npx ts-node scripts/seed-admins.ts --dry-run                      (validate only, no DB writes)
 *
 * The JSON file must be an array of objects matching AdminSeedEntry.
 * Passwords are plain-text in the JSON and are hashed (bcrypt, 12 rounds) before insert.
 * Already-existing emails are skipped with a warning (no error).
 */

import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

import { db } from "../src/db/index";
import { admins } from "../src/db/schema";
import { eq } from "drizzle-orm";

// ── Validation schema ────────────────────────────────────────────────────────

const VALID_POSITIONS = [
  "Executive",
  "Office Bearer",
  "Joint Secretary",
  "Co-ordinator",
] as const;

const adminSeedEntrySchema = z.object({
  // admin_id is GENERATED ALWAYS AS IDENTITY — Postgres assigns it automatically
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(100, "name must be at most 100 characters"),

  email: z
    .string()
    .trim()
    .email("email must be a valid email address")
    .max(255, "email must be at most 255 characters"),

  password: z
    .string()
    .min(8, "password must be at least 8 characters"),

  position: z.enum(VALID_POSITIONS, {
    error: `position must be one of: ${VALID_POSITIONS.join(", ")}`,
  }),

  domain: z.string().trim().optional(),

  privileged: z.boolean().default(false),
});

type AdminSeedEntry = z.infer<typeof adminSeedEntrySchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

function parseArgs() {
  const args = process.argv.slice(2);
  const fileFlag = args.indexOf("--file");
  const filePath =
    fileFlag !== -1 && args[fileFlag + 1]
      ? args[fileFlag + 1]
      : path.resolve(__dirname, "admins.seed.json");

  const dryRun = args.includes("--dry-run");
  return { filePath, dryRun };
}

function loadJson(filePath: string): unknown[] {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`  File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("JSON root must be an array");
    return parsed;
  } catch (err) {
    console.error("  Failed to parse JSON:", (err as Error).message);
    process.exit(1);
  }
}

function validateEntries(raw: unknown[]): AdminSeedEntry[] {
  const valid: AdminSeedEntry[] = [];
  let hasErrors = false;

  for (let i = 0; i < raw.length; i++) {
    const result = adminSeedEntrySchema.safeParse(raw[i]);

    if (!result.success) {
      console.error(`\n  Entry [${i}] validation failed:`);
      result.error.issues.forEach((issue) => {
        console.error(`    • ${issue.path.join(".")}: ${issue.message}`);
      });
      hasErrors = true;
    } else {
      valid.push(result.data);
    }
  }

  if (hasErrors) {
    console.error("\nFix the errors above before running the seed.");
    process.exit(1);
  }

  return valid;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { filePath, dryRun } = parseArgs();

  console.log(`\n  Loading admins from: ${path.resolve(filePath)}`);
  if (dryRun) console.log("  Dry-run mode — no database writes will occur.\n");

  const raw = loadJson(filePath);
  console.log(`  Found ${raw.length} entr${raw.length === 1 ? "y" : "ies"} in JSON`);

  const entries = validateEntries(raw);
  console.log(`  All entries passed validation\n`);

  if (dryRun) {
    console.table(
      entries.map((e) => ({
        name: e.name,
        email: e.email,
        position: e.position,
        domain: e.domain ?? "-",
        privileged: e.privileged,
      })),
    );
    console.log("\n  Dry run complete. No records written.");
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Check for existing email to give a clear skip message
    const [existing] = await db
      .select({ admin_id: admins.admin_id })
      .from(admins)
      .where(eq(admins.email, entry.email))
      .limit(1);

    if (existing) {
      console.warn(`   Skipped (email already exists): ${entry.email}`);
      skipped++;
      continue;
    }

    const password_hash = await bcrypt.hash(entry.password, BCRYPT_ROUNDS);

    const [inserted_row] = await db
      .insert(admins)
      .values({
        name: entry.name,
        email: entry.email,
        password_hash,
        position: entry.position,
        domain: entry.domain ?? null,
        privileged: entry.privileged,
      })
      .returning({ admin_id: admins.admin_id });

    console.log(`  Inserted: [id=${inserted_row.admin_id}] ${entry.name} <${entry.email}>`);
    inserted++;
  }

  console.log(
    `\n  Done — ${inserted} inserted, ${skipped} skipped.\n`,
  );
}

main().catch((err) => {
  console.error("\n  Unexpected error:", err);
  process.exit(1);
});
