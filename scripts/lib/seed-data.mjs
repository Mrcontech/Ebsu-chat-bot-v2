// Loads the starting data from database/seed/*.json (the knowledge base lives there,
// one entry per question with its official source link).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./env.mjs";

const read = (name) => JSON.parse(readFileSync(join(ROOT, "database", "seed", name), "utf8"));

export function loadSeed() {
  const settings = read("settings.json");
  return {
    categories: read("categories.json"),
    offices: read("offices.json"),
    entries: read("knowledge-base.json"),
    rules: read("language-rules.json"),
    tests: read("test-questions.json"),
    thresholds: { answer: settings.answer_threshold, suggest: settings.suggest_threshold },
  };
}
