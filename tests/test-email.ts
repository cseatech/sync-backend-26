import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

async function testEmail() {
  console.log("=== BREVO SMTP DIAGNOSTIC ===\n");

  const login = process.env.BREVO_LOGIN_EMAIL;
  const key = process.env.BREVO_SMTP_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;

  console.log(`Login:  ${login}`);
  console.log(`Key:    ${key?.substring(0, 20)}...`);
  console.log(`Sender: ${sender}\n`);

  if (!login || !key || !sender) {
    console.error("❌ Missing BREVO env vars!");
    process.exit(1);
  }

  // Create transporter with DEBUG logging enabled
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: login,
      pass: key,
    },
    debug: true,   // Enable SMTP debug output
    logger: true,  // Log SMTP conversation to console
  });

  // 1. Verify the SMTP connection first
  console.log("── Step 1: Verifying SMTP connection ──\n");
  try {
    const verified = await transporter.verify();
    console.log(`✅ SMTP connection verified: ${verified}\n`);
  } catch (err: any) {
    console.error(`❌ SMTP connection FAILED: ${err.message}\n`);
    console.error(err);
    process.exit(1);
  }

  // 2. Send a single test email
  console.log("── Step 2: Sending test email ──\n");
  const testRecipient = "arshadnr1608@gmail.com";

  try {
    const info = await transporter.sendMail({
      from: `"CSEA Test" <${sender}>`,
      to: testRecipient,
      subject: "🔬 SMTP Diagnostic Test — " + new Date().toISOString(),
      html: `<h2>SMTP Test</h2><p>If you see this, Brevo SMTP is working correctly.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });

    console.log("\n✅ sendMail() returned successfully!");
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response:   ${info.response}`);
    console.log(`   Accepted:   ${JSON.stringify(info.accepted)}`);
    console.log(`   Rejected:   ${JSON.stringify(info.rejected)}`);
    console.log(`   Pending:    ${JSON.stringify(info.pending)}`);
    console.log(`   Envelope:   ${JSON.stringify(info.envelope)}`);
  } catch (err: any) {
    console.error(`\n❌ sendMail() FAILED!`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Code:  ${err.code}`);
    console.error(`   Response: ${err.response}`);
    console.error(err);
  }

  transporter.close();
  console.log("\n=== DONE ===");
}

testEmail();
