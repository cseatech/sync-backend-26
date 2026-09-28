import path from "path";
import fs from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Response } from "express";

import { CertificateData } from "./certificate.public.service";

// ── Template path resolution ──────────────────────────────────────────────────
// Only uses Cert-new folder templates (no fallback to obsolete folders)
function resolveTemplatePath(type: "winner" | "participation" = "winner"): string {
  const filenames =
    type === "winner"
      ? ["SYNC_Certificates_2026-app.pdf", "SYNC_Certificates_2026_app.pdf"]
      : ["SYNC_Certificates_2026-part.pdf", "SYNC_Certificates_2026_part.pdf"];

  const candidateDirs = [
    path.resolve(__dirname, "..", "..", "..", "Cert-new"),
    path.resolve(process.cwd(), "Cert-new"),
  ];

  for (const dir of candidateDirs) {
    for (const filename of filenames) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  // Default to expected primary in Cert-new
  return path.resolve(process.cwd(), "Cert-new", filenames[0]);
}

// ── Exact Blank Underline Coordinates for SYNC'26 Templates ──────────────────
// Measured directly from the template's embedded Oswald font glyph metrics and
// page content stream baselines.
//
// 1. APPRECIATION TEMPLATE (SYNC_Certificates_2026-app.pdf)
//   Line 1: "This is to certify that Mr. / Ms. [NAME]"
//           Baseline y = 235.38; text baseline placed at y = 238.0
//   Line 2: "of [DEPT/YEAR] has secured [POSITION] in the event"
//           Baseline y = 203.87; text baseline placed at y = 206.5
//   Line 3: "[EVENT NAME] as part of SYNC’26 organised by CSEA..."
//           Baseline y = 172.36; text baseline placed at y = 175.0
const APP_BLANK_NAME = { x: 353.0, right: 793.0, y: 238.0 }; // after "Mr. / Ms."
const APP_BLANK_DEPT = { x: 93.0,  right: 416.0, y: 206.5 }; // "of [___] has secured"
const APP_BLANK_POS  = { x: 528.0, right: 693.0, y: 206.5 }; // "has secured [___] in the event"
const APP_BLANK_EVT  = { x: 68.5,  right: 447.0, y: 175.0 }; // before "as part of SYNC’26"

// 2. PARTICIPATION TEMPLATE (SYNC_Certificates_2026-part.pdf)
//   Line 1: "This is to certify that Mr. / Ms. [NAME] of"
//           Baseline y = 242.25; text baseline placed at y = 245.0
//   Line 2: "[DEPT/YEAR] has participated in the event [EVENT NAME]"
//           Baseline y = 210.74; text baseline placed at y = 213.5
//   Line 3: "as part of SYNC’26 organised by CSEA, College of Engineering Guindy..." (no blanks)
const PART_BLANK_NAME = { x: 338.5, right: 772.0, y: 245.0 }; // after "Mr. / Ms." before "of"
const PART_BLANK_DEPT = { x: 54.0,  right: 205.0, y: 213.5 }; // before "has participated in the event"
const PART_BLANK_EVT  = { x: 471.0, right: 835.5, y: 213.5 }; // after "in the event"

/**
 * Generate a certificate PDF entirely in RAM and stream it to the Express response.
 *
 * @param res  - Express Response object to pipe into
 * @param data - Verified winner or participant data extracted from the database
 * @param type - "winner" (Appreciation) or "participation" (Participation)
 */
async function streamCertificate(
  res: Response,
  data: CertificateData,
  type: "winner" | "participation" = "winner",
): Promise<void> {
  const { full_name, department, year, event_name, position } = data;
  const templatePath = resolveTemplatePath(type);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Certificate template not found at ${templatePath}`);
  }

  // 1. Read blank template bytes
  const templateBytes = await fs.promises.readFile(templatePath);

  // 2. Load template, embed its first page into a fresh document
  //    (avoids inheriting template graphics-state that makes text invisible)
  const templateDoc = await PDFDocument.load(templateBytes);
  const pdfDoc = await PDFDocument.create();
  const [embeddedTemplatePage] = await pdfDoc.embedPages([
    templateDoc.getPages()[0]!,
  ]);

  const PAGE_W = 842.25;
  const PAGE_H = 595.5;
  const newPage = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // 3. Draw template as full-bleed background
  newPage.drawPage(embeddedTemplatePage, {
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
  });

  // 4. Embed fonts & text styling
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  // Elegant deep slate/navy matching the SYNC 2026 certificate theme (#0F172A)
  const TEXT_COLOR = rgb(15 / 255, 23 / 255, 42 / 255);

  // Base font size for certificate dynamic text (17.5 pt matches template typography)
  const BASE_FONT_SIZE = 17.5;

  /**
   * Draw text centered within a blank underline region.
   * Auto-scales font size down when text is wider than the blank.
   */
  const drawInBlank = (
    text: string,
    blank: { x: number; right: number; y: number },
  ) => {
    const blankW = blank.right - blank.x;
    let size = BASE_FONT_SIZE;
    let w = boldFont.widthOfTextAtSize(text, size);
    while (w > blankW && size > 8) {
      size -= 0.5;
      w = boldFont.widthOfTextAtSize(text, size);
    }
    const x = blank.x + (blankW - w) / 2;
    newPage.drawText(text, { x, y: blank.y, size, font: boldFont, color: TEXT_COLOR });
  };

  // 5. Fill blank underlines according to certificate type
  if (type === "participation") {
    // Participation certificate: 3 blanks (Name, Dept/Year, Event)
    drawInBlank(full_name, PART_BLANK_NAME);
    drawInBlank(deptYearLabel(department, year), PART_BLANK_DEPT);
    drawInBlank(event_name, PART_BLANK_EVT);
  } else {
    // Winner / Appreciation certificate: 4 blanks (Name, Dept/Year, Position, Event)
    drawInBlank(full_name, APP_BLANK_NAME);
    drawInBlank(deptYearLabel(department, year), APP_BLANK_DEPT);
    drawInBlank(ordinalSuffix(position ?? 1), APP_BLANK_POS);
    drawInBlank(event_name, APP_BLANK_EVT);
  }

  // 6. Save & stream response
  const pdfBytes = await pdfDoc.save();

  const certLabel = type === "participation" ? "Participation" : "Appreciation";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Certificate_${certLabel}.pdf"`,
  );
  res.setHeader("Content-Length", pdfBytes.length.toString());
  res.end(Buffer.from(pdfBytes));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns "1st", "2nd", "3rd", "4th" … for a given integer position. */
function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/**
 * Formats the department + year into the certificate label.
 * e.g. department="Computer Science and Engineering", year=3 → "CSE - 3rd YEAR"
 *
 * Abbreviates common engineering dept names to their 2-4 letter acronym.
 * Falls back to the raw department string if no abbreviation matches.
 */
function deptYearLabel(department: string, year: number): string {
  const upper = department.toUpperCase();

  const ABBR: [RegExp, string][] = [
    [/COMPUTER SCIENCE/, "CSE"],
    [/INFORMATION TECHNOLOGY/, "IT"],
    [/ELECTRONICS.*COMMUNICATION/, "ECE"],
    [/ELECTRICAL.*ELECTRONICS/, "EEE"],
    [/MECHANICAL/, "MECH"],
    [/CIVIL/, "CIVIL"],
    [/CHEMICAL/, "CHEM"],
    [/BIOTECHNOLOGY/, "BT"],
    [/BIOMEDICAL/, "BME"],
    [/INSTRUMENTATION/, "ICE"],
    [/PRODUCTION/, "PROD"],
    [/AERONAUTICAL/, "AERO"],
    [/AUTOMOBILE/, "AUTO"],
    [/MINING/, "MINING"],
    [/TEXTILE/, "TEXTILE"],
    [/ARTIFICIAL INTELLIGENCE/, "AI&DS"],
  ];

  let abbr = department;
  for (const [pattern, short] of ABBR) {
    if (pattern.test(upper)) {
      abbr = short;
      break;
    }
  }

  return `${abbr} - ${ordinalSuffix(year)} YEAR`;
}

export { streamCertificate };

