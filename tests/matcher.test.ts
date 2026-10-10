// Unit tests for the NLP matching engine.  Run with:  npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { evaluate } from "../src/lib/evaluate";
import { allowedEdits, diceSimilarity, editDistance, trigrams } from "../src/lib/nlp/fuzzy";
import { buildIndex, DEFAULT_THRESHOLDS, match, type LanguageRule } from "../src/lib/nlp/matcher";
import { cleanText, tokenize } from "../src/lib/nlp/text";
import { routeToOffice } from "../src/lib/routing";

const seed = (name: string) => JSON.parse(readFileSync(join(__dirname, "..", "database", "seed", name), "utf8"));
const entries: { key: string; category: string; question: string; variants: string[] }[] = seed("knowledge-base.json");
const rules: LanguageRule[] = seed("language-rules.json");
const tests: { question: string; expect: string | null; set: string }[] = seed("test-questions.json");

const idOf = new Map(entries.map((e, i) => [e.key, i + 1]));
const index = buildIndex(
  entries.map((e, i) => ({ id: i + 1, question: e.question, variants: e.variants, category: e.category, smallTalk: e.category === "chat-basics" })),
  rules,
);
const keyOf = (id: number | undefined) => (id ? entries[id - 1].key : null);
const ask = (q: string) => match(index, q, DEFAULT_THRESHOLDS);

describe("text cleaning", () => {
  it("lower-cases, strips accents and punctuation", () => {
    assert.equal(cleanText("  Wetin be D SCH-FEES??  "), "wetin be d sch fees");
    assert.equal(cleanText("Daalụ!"), "daalu");
    assert.equal(cleanText("O'level"), "olevel");
  });
  it("tokenizes on spaces", () => {
    assert.deepEqual(tokenize("post utme fee"), ["post", "utme", "fee"]);
    assert.deepEqual(tokenize(""), []);
  });
});

describe("fuzzy matching", () => {
  it("counts edits, including swapped letters", () => {
    assert.equal(editDistance("transcript", "transcript"), 0);
    assert.equal(editDistance("transcrpt", "transcript"), 1);
    assert.equal(editDistance("hostle", "hostel"), 1); // neighbouring letters swapped
    assert.equal(editDistance("kitten", "sitting"), 3);
  });
  it("tolerates more typos in longer words", () => {
    assert.equal(allowedEdits(3), 0);
    assert.equal(allowedEdits(6), 1);
    assert.equal(allowedEdits(10), 2);
  });
  it("scores similar strings higher with trigrams", () => {
    const a = trigrams("school fees");
    assert.ok(diceSimilarity(a, trigrams("school fee")) > diceSimilarity(a, trigrams("hostel")));
  });
});

describe("matching student questions", () => {
  it("answers plain English questions", () => {
    const r = ask("How much is the post UTME form?");
    assert.equal(r.decision, "answered");
    assert.equal(keyOf(r.best?.entryId), "postutme-fee");
  });

  it("understands Nigerian Pidgin", () => {
    const r = ask("abeg wetin be the cut off mark for law");
    assert.equal(r.decision, "answered");
    assert.equal(keyOf(r.best?.entryId), "cutoff-law");
    assert.ok(r.analysis.rulesApplied.some((x) => x.kind === "pidgin"));
  });

  it("understands abbreviations", () => {
    const r = ask("putme fee");
    assert.equal(keyOf(r.best?.entryId), "postutme-fee");
    assert.ok(r.analysis.tokens.includes("postutme"));
  });

  it("corrects typos", () => {
    const r = ask("how do i aply for my transcrip");
    assert.equal(keyOf(r.best?.entryId), "transcript-apply");
  });

  it("falls back on questions outside the knowledge base", () => {
    for (const q of ["Is there a swimming pool on campus?", "who won the football match yesterday", "what is the weather today"]) {
      const r = ask(q);
      assert.ok(r.decision === "fallback" || r.decision === "suggested", `${q} -> ${r.decision}`);
      assert.notEqual(r.decision, "answered");
    }
  });

  it("never answers outright when the only shared word is a typo guess", () => {
    const r = ask("are there sports facilities");
    assert.notEqual(r.decision, "answered");
  });

  it("does not let small talk crowd out real suggestions", () => {
    // With a very strict answer threshold the greeting match is "unsure", so it must give way to real questions.
    const r = match(index, "good morning, where is the library", { answer: 0.99, suggest: 0.2 });
    assert.ok(r.candidates.length > 0);
    assert.ok(r.candidates.every((c) => !["hello", "thanks", "bye", "who-are-you", "what-can-you-do", "how-do-you-work"].includes(keyOf(c.entryId) ?? "")));
    assert.equal(keyOf(r.best?.entryId), "library");
  });

  it("maps Pidgin time words straight to a date question", () => {
    const r = ask("wen dem go close post utme");
    assert.equal(keyOf(r.best?.entryId), "postutme-dates");
  });

  it("answers the real question when small talk words are mixed in", () => {
    assert.equal(keyOf(ask("where i fit get help with my payment").best?.entryId), "fees-how-to-pay");
    assert.equal(keyOf(ask("hello, how much is the post utme form").best?.entryId), "postutme-fee");
    assert.equal(ask("help").decision, "smalltalk");
  });

  it("understands Pidgin words that carry meaning", () => {
    assert.equal(keyOf(ask("who be the oga of the school").best?.entryId), "vc");
    assert.equal(keyOf(ask("wetin i go carry go admission unit").best?.entryId), "clearance-documents");
  });

  it("handles greetings as small talk", () => {
    assert.equal(ask("how far").decision, "smalltalk");
    assert.equal(ask("Good morning").decision, "smalltalk");
  });

  it("returns empty when nothing meaningful is left", () => {
    assert.equal(ask("??? !!!").decision, "empty");
    assert.equal(ask("what is it").decision, "empty");
  });

  it("ignores session years so the same question matches any year", () => {
    const a = ask("cut off mark for nursing");
    const b = ask("cut off mark for nursing 2026/2027");
    assert.equal(keyOf(a.best?.entryId), keyOf(b.best?.entryId));
  });
});

describe("language rules data", () => {
  it("never maps a phrase onto another rule's phrase (rules are applied in one pass)", () => {
    const phrases = new Map(rules.map((r) => [cleanText(r.phrase), cleanText(r.canonical)]));
    for (const r of rules) {
      for (const word of cleanText(r.canonical).split(" ").filter(Boolean)) {
        const next = phrases.get(word);
        assert.ok(next === undefined || next === word, `"${r.phrase}" becomes "${word}", which is itself rewritten to "${next}"`);
      }
    }
  });
  it("has no duplicate phrases", () => {
    const seen = new Set<string>();
    for (const r of rules) {
      const p = cleanText(r.phrase);
      assert.ok(!seen.has(p), `duplicate phrase ${p}`);
      seen.add(p);
    }
  });
});

describe("fallback routing", () => {
  it("sends each topic to the right office", () => {
    assert.equal(routeToOffice(["hostel"]), "student-affairs");
    assert.equal(routeToOffice(["cost", "hostel"]), "student-affairs"); // hostel fees: the more specific topic wins a tie
    assert.equal(routeToOffice(["schoolfee", "cost"]), "bursary");
    assert.equal(routeToOffice(["transcript"]), "records");
    assert.equal(routeToOffice(["postgraduate", "admission", "requirement"]), "postgraduate");
    assert.equal(routeToOffice(["swimming", "pool"]), "registry");
  });
});

describe("accuracy on the development set", () => {
  it("stays at or above 90%", () => {
    const cases = tests
      .filter((t) => t.set === "dev")
      .map((t) => ({ question: t.question, expectId: t.expect ? idOf.get(t.expect)! : null }));
    const { summary } = evaluate(index, cases, DEFAULT_THRESHOLDS, (id) => entries[id - 1].question);
    assert.ok(summary.accuracy >= 0.9, `dev accuracy ${summary.accuracy}`);
    assert.equal(summary.counts["false answer"], 0, "no out-of-scope question should get an answer");
  });
});
