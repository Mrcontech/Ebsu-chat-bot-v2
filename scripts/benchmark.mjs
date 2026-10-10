// Measures how fast the running chatbot replies, for Chapter Four of the report.
//   1. start the app (npm start), then in a second window:
//   2. npm run benchmark
// It sends each of the 30 held-out test questions 10 times to /api/explain, which runs
// exactly the same matching as the chat (including the database check for changes)
// but does not write to the chat logs, so the admin's lists stay clean.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { join } from "node:path";
import { ROOT, loadEnv } from "./lib/env.mjs";

loadEnv();
const base = `http://localhost:${process.env.PORT || 3000}`;
const ROUNDS = 10;

const questions = JSON.parse(readFileSync(join(ROOT, "database", "seed", "test-questions.json"), "utf8"))
  .filter((t) => t.set === "test")
  .map((t) => t.question);

async function ask(message) {
  const start = performance.now();
  const res = await fetch(`${base}/api/explain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return performance.now() - start;
}

try {
  await ask("warm up"); // the first request after start-up builds the index
} catch {
  console.error(`Could not reach ${base}. Start the app with "npm start" first, then run this again.`);
  process.exit(1);
}

const times = [];
for (let round = 0; round < ROUNDS; round++) {
  for (const q of questions) times.push(await ask(q));
}
times.sort((a, b) => a - b);
const at = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
const mean = times.reduce((a, b) => a + b, 0) / times.length;
const ms = (n) => `${n.toFixed(1)} ms`;

const machine = `${cpus()[0]?.model.trim() ?? "unknown CPU"}, ${cpus().length} cores, ${Math.round(totalmem() / 1024 ** 3)} GB RAM, Node.js ${process.version}`;
const report = [
  "# Response time",
  "",
  `Measured with \`npm run benchmark\` on ${new Date().toISOString().slice(0, 10)}: the 30 held-out test questions, ${ROUNDS} rounds (${times.length} requests), sent one at a time to the running app.`,
  "Each time covers the whole request: HTTP, the database check for knowledge-base changes, reading the thresholds, and matching.",
  "",
  `Machine: ${machine}.`,
  "",
  "| Measure | Time |",
  "|---|---|",
  `| Median | ${ms(at(0.5))} |`,
  `| Mean | ${ms(mean)} |`,
  `| 95th percentile | ${ms(at(0.95))} |`,
  `| Slowest | ${ms(times[times.length - 1])} |`,
  "",
].join("\n");

mkdirSync(join(ROOT, "docs", "results"), { recursive: true });
writeFileSync(join(ROOT, "docs", "results", "response-time.md"), report);
console.log(report);
