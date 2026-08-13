require("dotenv").config();

const pool = require("./db");

async function testQuery() {
  try {
    const result = await pool.query("SELECT * from users");

    console.log("Database connected!");
    console.log(result.length);
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await pool.end();
  }
}

testQuery();
