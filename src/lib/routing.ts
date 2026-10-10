/**
 * Fallback routing: when the bot has no confident answer, it still points the
 * student to the office most likely to help, based on the topic words in the
 * message. Keywords are the canonical forms produced by the language rules.
 */
const OFFICE_KEYWORDS: { office: string; words: string[] }[] = [
  { office: "postgraduate", words: ["postgraduate"] },
  { office: "international", words: ["international", "foreign", "visa", "exchange", "abroad"] },
  {
    office: "admissions",
    words: ["admission", "postutme", "jamb", "directentry", "cutoff", "acceptance", "olevel", "alevel", "screening", "caps", "merit", "jupeb", "predegree", "fresher", "requirement", "aggregate", "list", "clearance", "documentation", "document", "documents"],
  },
  { office: "student-affairs", words: ["hostel", "idcard", "union", "club", "welfare", "discipline", "sport", "sports", "cult", "dress"] },
  { office: "bursary", words: ["cost", "schoolfee", "pay", "invoice", "receipt", "refund", "remita", "bank", "bursary", "bursar", "debit", "card"] },
  {
    office: "records",
    words: ["exam", "result", "transcript", "certificate", "cgpa", "carryover", "convocation", "statement", "graduation", "verification", "timetable"],
  },
  { office: "ict", words: ["portal", "password", "login", "email", "website", "wifi", "internet", "online", "username"] },
  { office: "library", words: ["library", "book", "books", "journal", "journals", "elibrary", "borrow"] },
  { office: "health", words: ["health", "sick", "clinic", "hospital", "doctor", "security", "police", "emergency", "counselling", "medical"] },
];

export const DEFAULT_OFFICE = "registry";

/** Offices that win outright when their words appear ("PG admission" goes to the PG School). */
const PRIORITY = new Set(["postgraduate", "international"]);

/** Pick the office whose topic words appear most often in the message (ties go to the earlier, more specific office). */
export function routeToOffice(tokens: string[]): string {
  for (const { office, words } of OFFICE_KEYWORDS) {
    if (PRIORITY.has(office) && tokens.some((t) => words.includes(t))) return office;
  }
  let best = DEFAULT_OFFICE;
  let bestHits = 0;
  for (const { office, words } of OFFICE_KEYWORDS) {
    const hits = tokens.filter((t) => words.includes(t)).length;
    if (hits > bestHits) {
      best = office;
      bestHits = hits;
    }
  }
  return best;
}
