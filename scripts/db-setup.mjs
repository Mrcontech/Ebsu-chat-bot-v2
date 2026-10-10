// Creates the ebsu_chatbot database, its tables and the starting knowledge base.
// Safe to run many times: it only seeds an empty database.
//   node scripts/db-setup.mjs          create + seed if empty
//   node scripts/db-setup.mjs --reset  delete everything and start again from the seed files
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { dbSettings, ROOT } from "./lib/env.mjs";
import { loadSeed } from "./lib/seed-data.mjs";

const say = (msg) => console.log(`  ${msg}`);

function explain(error, cfg) {
  const where = `${cfg.host}:${cfg.port}`;
  switch (error?.code) {
    case "ECONNREFUSED":
    case "ETIMEDOUT":
      return `Cannot reach MySQL at ${where}.\n  Open the XAMPP Control Panel and click Start next to MySQL, then run this again.`;
    case "ER_ACCESS_DENIED_ERROR":
      return `MySQL refused the user "${cfg.user}".\n  If you gave root a password in XAMPP, create a .env file (copy .env.example) and set DB_PASSWORD.`;
    default:
      return error?.message ?? String(error);
  }
}

export async function setupDatabase({ reset = false, quiet = false } = {}) {
  const mysql = (await import("mysql2/promise")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const cfg = dbSettings();
  const log = quiet ? () => {} : say;

  let conn;
  try {
    conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, multipleStatements: true, charset: "utf8mb4" });
  } catch (error) {
    throw new Error(explain(error, cfg));
  }

  try {
    const db = `\`${cfg.database.replace(/`/g, "")}\``;
    if (reset) {
      await conn.query(`DROP DATABASE IF EXISTS ${db}`);
      log(`Removed old database ${cfg.database}`);
    }
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE ${db}`);
    await conn.query(readFileSync(join(ROOT, "database", "schema.sql"), "utf8"));

    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM qa_pairs");
    if (n > 0) {
      log(`Database ${cfg.database} is ready (${n} question-and-answer pairs).`);
      return { seeded: false, pairs: n };
    }

    const seed = loadSeed();
    await conn.beginTransaction();

    const categoryId = new Map();
    for (const [i, c] of seed.categories.entries()) {
      const [r] = await conn.query("INSERT INTO categories (slug, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)", [c.slug, c.name, c.description ?? null, c.icon ?? null, i + 1]);
      categoryId.set(c.slug, r.insertId);
    }

    const officeId = new Map();
    for (const o of seed.offices) {
      const [r] = await conn.query(
        "INSERT INTO offices (slug, name, handles, email, phone, location, website, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [o.slug, o.name, o.handles ?? null, o.email ?? null, o.phone ?? null, o.location ?? null, o.website ?? null, o.source_url ?? null],
      );
      officeId.set(o.slug, r.insertId);
    }

    const qaId = new Map();
    for (const e of seed.entries) {
      if (!categoryId.has(e.category)) throw new Error(`Unknown category "${e.category}" in entry ${e.key}`);
      if (e.office && !officeId.has(e.office)) throw new Error(`Unknown office "${e.office}" in entry ${e.key}`);
      const [r] = await conn.query(
        "INSERT INTO qa_pairs (ref_key, category_id, office_id, question, answer, source_url, source_note, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [e.key, categoryId.get(e.category), e.office ? officeId.get(e.office) : null, e.question, e.answer, e.source_url ?? null, e.source_note ?? null, e.featured ? 1 : 0],
      );
      qaId.set(e.key, r.insertId);
      for (const v of e.variants ?? []) await conn.query("INSERT INTO qa_variants (qa_id, phrasing) VALUES (?, ?)", [r.insertId, v]);
    }

    for (const rule of seed.rules) {
      await conn.query("INSERT INTO language_rules (phrase, canonical, kind) VALUES (?, ?, ?)", [rule.phrase, rule.canonical, rule.kind]);
    }

    for (const t of seed.tests) {
      if (t.expect && !qaId.has(t.expect)) throw new Error(`Test question "${t.question}" expects unknown entry ${t.expect}`);
      await conn.query("INSERT INTO test_questions (question, expected_outcome, expected_qa_id, style, set_name) VALUES (?, ?, ?, ?, ?)", [
        t.question,
        t.expect ? "answer" : "fallback",
        t.expect ? qaId.get(t.expect) : null,
        t.style ?? null,
        t.set ?? "test",
      ]);
    }

    await conn.query("INSERT INTO settings (name, value) VALUES ('answer_threshold', ?), ('suggest_threshold', ?) ON DUPLICATE KEY UPDATE value = value", [
      String(seed.thresholds.answer),
      String(seed.thresholds.suggest),
    ]);

    const [[{ admins }]] = await conn.query("SELECT COUNT(*) AS admins FROM admins");
    if (admins === 0) {
      const password = process.env.ADMIN_DEFAULT_PASSWORD || "ebsu-admin-2026";
      await conn.query("INSERT INTO admins (username, full_name, password_hash) VALUES ('admin', 'Knowledge Base Admin', ?)", [await bcrypt.hash(password, 10)]);
      log(`Created admin login: username "admin", password "${password}" (change it in Admin > Settings).`);
    }

    await conn.commit();
    log(`Loaded ${seed.entries.length} question-and-answer pairs, ${seed.rules.length} language rules and ${seed.tests.length} test questions.`);
    return { seeded: true, pairs: seed.entries.length };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    await conn.end();
  }
}

// Run directly: node scripts/db-setup.mjs [--reset]
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log("\nEBSU Enquiry Bot: database setup");
  setupDatabase({ reset: process.argv.includes("--reset") })
    .then(() => console.log("  Done.\n"))
    .catch((error) => {
      console.error(`\n  ${error.message}\n`);
      process.exit(1);
    });
}
