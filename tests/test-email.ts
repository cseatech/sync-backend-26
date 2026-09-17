import * as dotenv from "dotenv";
dotenv.config();

import { sendMail } from "../src/utils/email";

async function testEmail() {
  console.log("=== ZEPTOMAIL DIAGNOSTIC ===\n");

  const url = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
  const token = process.env.ZEPTOMAIL_TOKEN;
  const senderAddress = process.env.ZEPTOMAIL_SENDER_ADDRESS || "noreply@cseaceg.org.in";
  const senderName = process.env.ZEPTOMAIL_SENDER_NAME || "noreply";

  console.log(`URL:    ${url}`);
  console.log(`Token:  ${token?.substring(0, 25)}...`);
  console.log(`Sender: ${senderName} <${senderAddress}>\n`);

  if (!token) {
    console.error("❌ Missing ZEPTOMAIL_TOKEN env var!");
    process.exit(1);
  }

  const testRecipient = "cegcseatech@gmail.com";

  console.log(`── Step: Sending test email to ${testRecipient} ──\n`);

  try {
    await sendMail(
      testRecipient,
      "🔬 ZeptoMail Diagnostic Test — " + new Date().toISOString(),
      `<h2>ZeptoMail Test</h2><p>If you see this, ZeptoMail API is working correctly.</p><p>Sent at: ${new Date().toISOString()}</p>`
    );

    console.log("\n✅ sendMail() returned successfully!");
  } catch (err: any) {
    console.error(`\n❌ sendMail() FAILED!`);
    console.error(`   Error: ${err.message}`);
    console.error(err);
  }

  console.log("\n=== DONE ===");
}

testEmail();
