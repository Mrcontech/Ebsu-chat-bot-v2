// A small, hand-checkable TF-IDF example for the project report (Chapter 3).
// It uses the real matching code on a four-question knowledge base.
//   npm run example
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, COSINE_WEIGHT, match, type LanguageRule } from "../src/lib/nlp/matcher";

const rules: LanguageRule[] = JSON.parse(readFileSync(join(__dirname, "..", "database", "seed", "language-rules.json"), "utf8"));
const kb = [
  { id: 1, question: "How much is the EBSU Post-UTME form?", variants: [], category: "post-utme" },
  { id: 2, question: "How much is the EBSU acceptance fee?", variants: [], category: "fees" },
  { id: 3, question: "When does the EBSU Post-UTME application open and close?", variants: [], category: "post-utme" },
  { id: 4, question: "What is the cut-off mark for Computer Science?", variants: [], category: "post-utme" },
];
const query = process.argv[2] ?? "wetin be the putme fee";

const index = buildIndex(kb, rules);
const N = index.docs.length;
console.log(`Knowledge base: ${N} stored questions\n`);
index.docs.forEach((d, i) => console.log(`D${i + 1}: "${d.phrasing}"\n    roots: ${[...d.vector.keys()].join(", ")}`));

console.log(`\nidf(t) = ln((1 + N) / (1 + df(t))) + 1,  N = ${N}`);
for (const [term, idf] of [...index.idf.entries()].sort((a, b) => b[1] - a[1])) {
  const df = index.docs.filter((d) => d.vector.has(term)).length;
  console.log(`  ${term.padEnd(12)} df = ${df}   idf = ${idf.toFixed(4)}`);
}

const r = match(index, query, { answer: 0.5, suggest: 0.32 }, 4);
console.log(`\nQuery: "${query}"`);
console.log(`  cleaned: ${r.analysis.cleaned}`);
console.log(`  rules:   ${r.analysis.rulesApplied.map((x) => `${x.phrase} -> ${x.canonical || "(dropped)"}`).join(", ") || "none"}`);
console.log(`  roots:   ${r.analysis.stems.join(", ")}`);
console.log(`\nscore = ${COSINE_WEIGHT} x cosine + ${(1 - COSINE_WEIGHT).toFixed(1)} x trigram`);
for (const c of r.candidates) {
  console.log(`  D${c.entryId}  cosine = ${c.cosine.toFixed(3)}  trigram = ${c.trigram.toFixed(3)}  score = ${c.score.toFixed(3)}   ${c.question}`);
}
console.log(`\nDecision: ${r.decision} (answer threshold 0.50, suggestion threshold 0.32)`);
