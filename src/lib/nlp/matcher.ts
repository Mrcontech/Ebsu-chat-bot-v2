/**
 * The EBSU Enquiry Bot matching engine (retrieval-based NLP).
 *
 * Pipeline for every message:
 *   1. clean      lower case, strip accents and punctuation          (text.ts)
 *   2. correct    fix typos against the knowledge-base vocabulary    (fuzzy.ts)
 *   3. translate  apply language rules: Pidgin, abbreviations, synonyms
 *   4. filter     drop stopwords that carry no meaning
 *   5. stem       reduce words to their root (Porter, 1980): "registering" -> "regist"
 *   6. score      TF-IDF cosine similarity + character-trigram similarity
 *                 against every stored phrasing of every question
 *   7. decide     best score >= answer threshold        -> give the answer
 *                 suggest threshold <= score < answer   -> "Did you mean...?"
 *                 below the suggest threshold           -> fallback to an office
 *
 * Everything runs locally in Node.js. No external AI service is called.
 */
import { stemmer } from "stemmer";
import { allowedEdits, diceSimilarity, editDistance, trigrams } from "./fuzzy";
import { cleanText, isStopword, tokenize } from "./text";

export type LanguageRule = {
  phrase: string; // what students type, e.g. "sch fees" or "wetin"
  canonical: string; // what it means, e.g. "schoolfee" ("" = ignore the phrase)
  kind: "pidgin" | "abbreviation" | "spelling" | "synonym";
};

export type KnowledgeEntry = {
  id: number;
  question: string;
  variants: string[];
  category: string;
  smallTalk?: boolean;
};

export type Thresholds = { answer: number; suggest: number };

export const DEFAULT_THRESHOLDS: Thresholds = { answer: 0.5, suggest: 0.32 };

/** Share of the final score taken from TF-IDF cosine; the rest is trigram similarity. */
export const COSINE_WEIGHT = 0.8;

/** Small talk must score at least this to beat a real answer that also qualifies. */
export const SMALL_TALK_EXACT = 0.9;

/** A word we had to guess (typo fix) counts for less than a word typed correctly. */
export const CORRECTION_WEIGHT = 0.75;

type Analysis = {
  cleaned: string;
  corrections: { from: string; to: string }[];
  rulesApplied: { phrase: string; canonical: string; kind: string }[];
  tokens: string[]; // meaningful words after rules and stopword removal
  stems: string[];
  guessed: Set<string>; // stems that came from a typo correction
};

type IndexedDoc = {
  entryId: number;
  phrasing: string;
  vector: Map<string, number>; // stem -> normalised TF-IDF weight
  grams: Map<string, number>;
};

export type MatcherIndex = {
  entries: Map<number, KnowledgeEntry>;
  docs: IndexedDoc[];
  idf: Map<string, number>;
  maxIdf: number;
  vocabulary: Map<string, number>; // known word -> how many phrasings use it
  rules: Map<string, LanguageRule>;
  maxRuleWords: number;
};

export type Candidate = {
  entryId: number;
  question: string;
  phrasing: string;
  cosine: number;
  trigram: number;
  score: number;
};

export type Decision = "answered" | "suggested" | "fallback" | "smalltalk" | "empty";

export type MatchResult = {
  decision: Decision;
  best: Candidate | null;
  candidates: Candidate[]; // top candidates, best first
  analysis: Analysis;
  thresholds: Thresholds;
};

const SESSION_YEAR = /^(19|20)\d\d$/; // "2026" in "2026/2027" says nothing about the topic

function stem(token: string): string {
  return /^\d+$/.test(token) ? token : stemmer(token);
}

function buildRuleMap(rules: LanguageRule[]) {
  const map = new Map<string, LanguageRule>();
  let maxWords = 1;
  for (const rule of rules) {
    const phrase = cleanText(rule.phrase);
    if (!phrase) continue;
    map.set(phrase, { ...rule, phrase, canonical: cleanText(rule.canonical) });
    maxWords = Math.max(maxWords, phrase.split(" ").length);
  }
  return { map, maxWords };
}

type Word = { text: string; guessed: boolean }; // guessed = produced by a typo correction

/** Replace known phrases (longest first) with their canonical meaning. */
function applyRules(
  words: Word[],
  rules: Map<string, LanguageRule>,
  maxWords: number,
  applied: Analysis["rulesApplied"],
): Word[] {
  const out: Word[] = [];
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let n = Math.min(maxWords, words.length - i); n >= 1; n--) {
      const span = words.slice(i, i + n);
      const rule = rules.get(span.map((w) => w.text).join(" "));
      if (rule) {
        const guessed = span.some((w) => w.guessed);
        if (rule.canonical) out.push(...rule.canonical.split(" ").map((text) => ({ text, guessed })));
        applied.push({ phrase: rule.phrase, canonical: rule.canonical, kind: rule.kind });
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(words[i]);
      i += 1;
    }
  }
  return out;
}

/** Find the closest known word within the allowed number of typos. */
function correctToken(token: string, vocabulary: Map<string, number>): string | null {
  const max = allowedEdits(token.length);
  if (max === 0) return null;
  let best: string | null = null;
  let bestDistance = max + 1;
  let bestFrequency = -1;
  for (const [word, frequency] of vocabulary) {
    if (Math.abs(word.length - token.length) > max) continue;
    // Typos rarely change the first letter; this avoids silly corrections.
    if (word[0] !== token[0] && !(word[0] === token[1] && word[1] === token[0])) continue;
    const distance = editDistance(token, word, max);
    if (distance < bestDistance || (distance === bestDistance && frequency > bestFrequency)) {
      best = word;
      bestDistance = distance;
      bestFrequency = frequency;
    }
  }
  return bestDistance <= max ? best : null;
}

function analyse(
  text: string,
  index: Pick<MatcherIndex, "rules" | "maxRuleWords">,
  vocabulary: Map<string, number> | null,
): Analysis {
  const cleaned = cleanText(text);
  const corrections: Analysis["corrections"] = [];
  const rulesApplied: Analysis["rulesApplied"] = [];

  let words: Word[] = tokenize(cleaned).map((text) => ({ text, guessed: false }));
  if (vocabulary) {
    words = words.map((word) => {
      const token = word.text;
      if (vocabulary.has(token) || isStopword(token) || /\d/.test(token)) return word;
      const fixed = correctToken(token, vocabulary);
      if (fixed && fixed !== token) {
        corrections.push({ from: token, to: fixed });
        return { text: fixed, guessed: true };
      }
      return word;
    });
  }

  words = applyRules(words, index.rules, index.maxRuleWords, rulesApplied);
  words = words.filter((w) => w.text.length > 0 && !isStopword(w.text) && !SESSION_YEAR.test(w.text));
  const tokens = words.map((w) => w.text);
  const stems = tokens.map(stem);
  // A root counts as guessed only if every occurrence of it came from a typo fix.
  const typed = new Set(stems.filter((_, i) => !words[i].guessed));
  const guessed = new Set(stems.filter((s, i) => words[i].guessed && !typed.has(s)));
  return { cleaned, corrections, rulesApplied, tokens, stems, guessed };
}

/** Build the searchable index from the knowledge base. Run again whenever the data changes. */
export function buildIndex(entries: KnowledgeEntry[], rules: LanguageRule[]): MatcherIndex {
  const { map, maxWords } = buildRuleMap(rules);
  const ruleIndex = { rules: map, maxRuleWords: maxWords };

  const analysed: { entryId: number; phrasing: string; analysis: Analysis }[] = [];
  for (const entry of entries) {
    for (const phrasing of [entry.question, ...entry.variants]) {
      if (!phrasing.trim()) continue;
      analysed.push({ entryId: entry.id, phrasing, analysis: analyse(phrasing, ruleIndex, null) });
    }
  }

  // Words the typo corrector may correct towards: knowledge-base words and rule phrases.
  const vocabulary = new Map<string, number>();
  for (const { analysis } of analysed) {
    for (const t of new Set(analysis.tokens)) vocabulary.set(t, (vocabulary.get(t) ?? 0) + 1);
  }
  for (const [phrase, rule] of map) {
    for (const word of `${phrase} ${rule.canonical}`.split(" ")) {
      if (word && !vocabulary.has(word) && !isStopword(word)) vocabulary.set(word, 0);
    }
  }

  // Inverse document frequency: rare words are more informative than common ones.
  const N = analysed.length;
  const df = new Map<string, number>();
  for (const { analysis } of analysed) {
    for (const s of new Set(analysis.stems)) df.set(s, (df.get(s) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [s, n] of df) idf.set(s, Math.log((1 + N) / (1 + n)) + 1);
  const maxIdf = Math.log(1 + N) + 1; // weight for a word no stored question uses

  const docs: IndexedDoc[] = analysed.map(({ entryId, phrasing, analysis }) => ({
    entryId,
    phrasing,
    vector: weigh(analysis.stems, idf, maxIdf),
    grams: trigrams(analysis.tokens.join(" ")),
  }));

  return {
    entries: new Map(entries.map((e) => [e.id, e])),
    docs,
    idf,
    maxIdf,
    vocabulary,
    rules: map,
    maxRuleWords: maxWords,
  };
}

/** Term frequency x inverse document frequency, scaled to unit length. */
function weigh(stems: string[], idf: Map<string, number>, maxIdf: number, guessed?: Set<string>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const s of stems) tf.set(s, (tf.get(s) ?? 0) + 1);
  const vector = new Map<string, number>();
  let norm = 0;
  for (const [s, n] of tf) {
    const w = n * (idf.get(s) ?? maxIdf) * (guessed?.has(s) ? CORRECTION_WEIGHT : 1);
    vector.set(s, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) for (const [s, w] of vector) vector.set(s, w / norm);
  return vector;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [s, w] of small) {
    const v = large.get(s);
    if (v) dot += w * v;
  }
  return dot;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Compare a student's message with every stored question and decide how to reply. */
export function match(
  index: MatcherIndex,
  message: string,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  limit = 3,
): MatchResult {
  const analysis = analyse(message, index, index.vocabulary);
  if (analysis.stems.length === 0) {
    return { decision: "empty", best: null, candidates: [], analysis, thresholds };
  }

  const queryVector = weigh(analysis.stems, index.idf, index.maxIdf, analysis.guessed);
  const queryGrams = trigrams(analysis.tokens.join(" "));

  // Keep the best-scoring phrasing for each knowledge-base entry.
  const bestPerEntry = new Map<number, Candidate>();
  const bestDoc = new Map<number, IndexedDoc>();
  for (const doc of index.docs) {
    const cos = cosine(queryVector, doc.vector);
    const tri = diceSimilarity(queryGrams, doc.grams);
    const score = COSINE_WEIGHT * cos + (1 - COSINE_WEIGHT) * tri;
    const current = bestPerEntry.get(doc.entryId);
    if (!current || score > current.score) {
      bestDoc.set(doc.entryId, doc);
      bestPerEntry.set(doc.entryId, {
        entryId: doc.entryId,
        question: index.entries.get(doc.entryId)?.question ?? doc.phrasing,
        phrasing: doc.phrasing,
        cosine: round(cos),
        trigram: round(tri),
        score: round(score),
      });
    }
  }

  let ranked = [...bestPerEntry.values()].sort((a, b) => b.score - a.score);
  // Small talk ("hello", "help", "see you") wins only when it is a near-exact match
  // or nothing else qualifies. "where i fit get help with my payment" is a payment
  // question, not a request for the help menu.
  const isTalk = (c: Candidate) => Boolean(index.entries.get(c.entryId)?.smallTalk);
  const top = ranked[0];
  if (top && isTalk(top)) {
    const realAnswer = ranked.some((c) => !isTalk(c) && c.score >= thresholds.answer);
    if (top.score < thresholds.answer || (top.score < SMALL_TALK_EXACT && realAnswer)) ranked = ranked.filter((c) => !isTalk(c));
  }
  const candidates = ranked.slice(0, Math.max(limit, 1));
  const best = candidates[0] ?? null;

  let decision: Decision = "fallback";
  if (best && best.score >= thresholds.answer) {
    decision = index.entries.get(best.entryId)?.smallTalk ? "smalltalk" : "answered";
    // Never answer outright when the only words in common are typo guesses:
    // "sports facilities" must not become a confident answer about "faculties".
    const doc = bestDoc.get(best.entryId);
    const confirmed = doc ? [...queryVector.keys()].some((s) => !analysis.guessed.has(s) && doc.vector.has(s)) : false;
    if (!confirmed) decision = "suggested";
  } else if (best && best.score >= thresholds.suggest) {
    decision = "suggested";
  }

  return { decision, best, candidates, analysis, thresholds };
}
