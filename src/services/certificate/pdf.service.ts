import path from "path";
import fs from "fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Response } from "express";

import { VerifiedWinnerData } from "./certificate.public.service";

// ── Template path ──────────────────────────────────────────────────────────────
// The blank template PDF lives in Certificate_temp on the project root.
function resolveTemplatePath(): string {
  const possiblePaths = [
    path.resolve(__dirname, "..", "..", "..", "Certificate_temp", "Sync Winners Certificate without content.pdf"),
    path.resolve(process.cwd(), "Certificate_temp", "Sync Winners Certificate without content.pdf"),
  ];

  for (const candidate of possiblePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), "Certificate_temp", "Sync Winners Certificate without content.pdf");
}

const TEMPLATE_PATH = resolveTemplatePath();


// ── Exact blank underline positions ────────────────────────────────────────────
// Sourced from the decompressed page content stream (rectangle operators):
//   382.4023 286.29825 347.97156 0.75 re  → line 1 blank (after "Mr./Ms.")
//   150.15617 258.07346 326.57208 1.125 re → line 2 blank (after "of ")
//   593.2929 256.50415 40.265476 1.125 re  → line 2 blank (between "has secured" and "in the event")
//   123.93278 224.24571 301.54382 2.182 re → line 3 blank (before "as part of Sync'25")
//
// Y baselines confirmed via pdfjs text extraction of both template PDFs:
//   line 1 y = 288.82  ("This is to certify that Mr./Ms.")
//   line 2 y = 258.80  ("of _ has secured _ in the event")
//   line 3 y = 228.79  ("_ as part of Sync'25 organized by CSEA,")
const BLANK_NAME = { x: 382.40, right: 730.37, y: 288.82 }; // after "Mr./Ms."
const BLANK_DEPT = { x: 150.16, right: 476.73, y: 258.80 }; // "of __ has secured" (dept + year)
const BLANK_POS = { x: 593.29, right: 633.56, y: 258.80 }; // "has secured __ in the event"
const BLANK_EVT = { x: 123.93, right: 425.47, y: 228.79 }; // before "as part of Sync'25"

/**
 * Generate a certificate PDF entirely in RAM and stream it to the Express response.
 *
 * Strategy
 * ────────
 * The blank template is embedded as a full-bleed XObject background on a fresh
 * PDFDocument page. This avoids inheriting any graphics-state (opacity/blend-mode)
 * operators from the template that could make overlaid text invisible.
 *
 * Dynamic text is then placed exactly inside the template's blank underline areas,
 * whose coordinates are measured from the decompressed page content stream. Every
 * text block is centered within its blank and auto-scales below 18.44 pt when the
 * string is wider than the available space.
 *
 * @param res  - Express Response object to pipe into
 * @param data - Verified winner data extracted from the database
 */
async function streamCertificate(res: Response, data: VerifiedWinnerData): Promise<void> {
  const { full_name, department, year, event_name, position } = data;

  // 1. Read blank template bytes
  const templateBytes = await fs.promises.readFile(TEMPLATE_PATH);

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

  // 4. Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const NAVY = rgb(11 / 255, 37 / 255, 69 / 255); // #0B2545 — matches template accent

  // Template body text size (measured from pdfjs extraction)
  const TEMPLATE_SIZE = 18.44;

  /**
   * Draw text centered within a blank underline region.
   * Auto-scales font size down when text is wider than the blank.
   */
  const drawInBlank = (
    text: string,
    blank: { x: number; right: number; y: number },
  ) => {
    const blankW = blank.right - blank.x;
    let size = TEMPLATE_SIZE;
    let w = boldFont.widthOfTextAtSize(text, size);
    while (w > blankW && size > 8) {
      size -= 0.5;
      w = boldFont.widthOfTextAtSize(text, size);
    }
    const x = blank.x + (blankW - w) / 2;
    newPage.drawText(text, { x, y: blank.y, size, font: boldFont, color: NAVY });
  };

  // 5. Fill the four blank underlines with dynamic user data
  drawInBlank(full_name, BLANK_NAME);              // "This is to certify that Mr./Ms. [NAME]"
  drawInBlank(deptYearLabel(department, year), BLANK_DEPT); // "of [CSE - 3rd YEAR] has secured"
  drawInBlank(ordinalSuffix(position), BLANK_POS); // "has secured [1st] in the event"
  drawInBlank(event_name, BLANK_EVT);              // "[EVENT NAME] as part of Sync'25..."

  // 6. Save & stream response
  const pdfBytes = await pdfDoc.save();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="Certificate.pdf"',
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

  let abbr = department; // default: use as-is
  for (const [pattern, short] of ABBR) {
    if (pattern.test(upper)) {
      abbr = short;
      break;
    }
  }

  return `${abbr} - ${ordinalSuffix(year)} YEAR`;
}

export { streamCertificate };
