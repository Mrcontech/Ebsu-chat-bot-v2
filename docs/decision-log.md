# Decision log

Decisions taken while building the EBSU Enquiry Bot, why they were taken, and how to change them. Only irreversible or ambiguous choices would have been put to you; everything below was decided during the build.

## Sources and facts

| # | Decision | Why | To change it |
|---|---|---|---|
| 1 | Built the knowledge base from the official EBSU website only (ebsu.edu.ng and the subdomains portal, iportal, spgs, services, mail and orphanproject). | You gave no sources and chose "scrape ebsu.edu.ng and list what you couldn't find". Your rule: every fact from the official site, never invented. | Add facts from office documents in **Admin > Knowledge base**, with the document as the source. |
| 2 | Read the pages through a search engine restricted to ebsu.edu.ng (9 and 10 October 2026). | The site could not be opened directly from the build machine (the network blocked it). Facts seen only in a search summary are marked "check" in `knowledge-gaps.md`. | Open each "check" page yourself before the defense. |
| 3 | Stopped at 42 pages and 85 answers (the brief asked for at least 50). | The session's search budget ran out. Missing topics are listed instead of guessed. | Ask in a follow-up message to search for more, or add answers from the offices. |
| 4 | Where the site had no figure (school fee amounts, hostels and others), the bot says so and names the office. | Your non-negotiable: never invent a fact. A "not published yet" answer is more useful than a guess. | Replace those answers when an office supplies the facts. |

## How the AI works

| # | Decision | Why | To change it |
|---|---|---|---|
| 5 | Retrieval-based NLP: cleaning, Damerau-Levenshtein typo correction, a rule table for Pidgin and short forms, stopwords, Porter stemming, TF-IDF cosine plus character-trigram similarity. | Matches the brief (keyword plus fuzzy, TF-IDF), runs offline, needs no training data, and every decision can be shown to the panel step by step. | `src/lib/nlp/matcher.ts`. |
| 6 | Score = 0.8 × cosine + 0.2 × trigram; answer at 0.50, suggest from 0.32. | Chosen on the 30 development questions (all thresholds from 0.30 to 0.60 were safe; 0.50 sits in the middle). | **Admin > Settings** (thresholds); `COSINE_WEIGHT` in the matcher. |
| 7 | A message is only answered outright if it shares at least one word the student actually typed (not a typo guess) with the matched question; guessed words count 0.75. | Without it "sports facilities" was confidently answered as "faculties". | `CORRECTION_WEIGHT` and the `confirmed` check in the matcher. |
| 8 | Greetings and thanks are stored as hidden "small talk" entries that never crowd out a real answer. | "Good morning, where is the library?" must get the library answer. | Category `chat-basics` in the knowledge base. |
| 9 | Unanswered questions are grouped by their sorted word roots, so repeats are counted together. | The admin sees one line per question with a count, not a pile of duplicates. | `normKey` in `src/lib/chat.ts`. |
| 10 | Fallback office is chosen from topic words; if that office has no published contact, the Registrar's general contact is shown too. | Several offices (Bursary, Student Affairs, health centre) have no published email or phone. | Add contacts in **Admin > Offices**; keywords in `src/lib/routing.ts`. |
| 11 | 60 test questions written by the developer, split into a development set (tuning) and a held-out test set (reporting only). The one test miss was left unfixed. | Fixing it after seeing the test set would make the reported 96.7% unreliable. | Add real student questions from the chat logs as a new test set. |
| 12 | Scores are shown rounded down on every screen (0.319 shows as 0.31). | A rounded-up 0.32 would look as if it reached the suggestion threshold it missed. | `src/lib/format.ts`. |

## Stack and running

| # | Decision | Why | To change it |
|---|---|---|---|
| 13 | Next.js 16 with TypeScript for pages, API and matcher; MySQL through `mysql2`; schema works on XAMPP's MariaDB 10.4 and on MySQL 8. | Your stack. One language means the tested matcher is the code that answers students. | — |
| 14 | `npm start` does everything: installs packages the first time, creates the database and data if missing, builds when the code changed, starts and opens the browser. | "Runs with one command after XAMPP is started." Only the first install needs internet. | `scripts/start.mjs`. |
| 15 | XAMPP defaults (root, no password, 127.0.0.1:3306) work with no setup; `.env` overrides them. | Most lab computers use the defaults. | Copy `.env.example` to `.env`. |
| 16 | Default admin login `admin` / `ebsu-admin-2026`, documented in the README. | A predictable password keeps the demo simple. Change it in **Admin > Settings** before any real use. | `ADMIN_DEFAULT_PASSWORD` in `.env` before the first start. |
| 17 | Login lockout (5 wrong passwords, 5 minutes) is kept in memory. | Enough for one server; no extra table. It resets when the server restarts. | `src/app/admin/actions.ts`. |
| 18 | Nothing is loaded from the internet at run time: the font and icons are bundled. | "The demo works with the network off." Checked by the end-to-end test (no outside requests). | — |

## Design

| # | Decision | Why | To change it |
|---|---|---|---|
| 19 | Installed `design-taste-frontend` (Leonxlnx/taste-skill) and followed it for the student pages; the admin pages use the same tokens and components. | Your instruction. | `.agents/skills/design-taste-frontend`. |
| 20 | Light mode only, warm off-white base (#f4efe8), orange accent, layout after the reference screen (sidebar, chat, side panel). | You asked for the reference "in light mode, warm off-white base". | Colour tokens in `src/app/globals.css`. |
| 21 | Buttons use the deeper orange #c44a1f; the brighter #e8613c is decorative only. | White text on #e8613c fails contrast; on #c44a1f it passes (4.8:1). | Same file. |
| 22 | Outfit font (Open Font License) and Phosphor icons (MIT), one icon set throughout; one SVG illustration drawn in code. | Consistent style that works offline. | `src/app/layout.tsx`. |
| 23 | No images from ChatGPT, no EBSU crest, no campus photos. | This cloud session had no access to your browser or ChatGPT, and the crest should come from the university. Listed in `knowledge-gaps.md`. | Add a crest or photo to the report's title page and the first slide. |

## Documents

| # | Decision | Why | To change it |
|---|---|---|---|
| 24 | Report, Q&A sheet and feedback form are Word files and the deck is a PowerPoint file, all in `docs/`, rather than online documents. | They must open and present with the network off, be editable in your department's template, and be printed and bound. | A hosted copy can be made on request. |
| 25 | The report follows the usual Nigerian five-chapter structure with APA 7 references (28 entries, checked during research). Three undergraduate projects appear only in the related-works table. | The common format for B.Sc. Computer Science projects. Some supervisors discourage citing undergraduate projects; they are easy to remove. | Edit in Word. |
| 25a | The preliminary pages follow your lecturer's sample (Sample Preliminary pages): title page, Declaration, Certification, Approval, Acknowledgement, Dedication, Abstract, Table of Content, List of Tables, List of Figures, in that order, with the sample's wording, bold centred Times New Roman 12 pt headings and double line spacing. | The department's required format. The List of Abbreviations is not in the sample, so it moved to Chapter One (Table 1.1). Double spacing is used for the body text too, to match the sample. The sample file is US Letter only because that is Word's default; the report stays on A4, the paper used in Nigeria. | In Word: Layout > Size for paper; Home > Line spacing (select all) for 1.5 spacing. |
| 26 | Everything only you can supply is marked **[TO FILL]** and highlighted in yellow: your name, supervisor, dedication, acknowledgements, interviews, user-feedback results. | Personal details and real student results cannot be produced here. | Search the report for "TO FILL". |
| 27 | Results in the report come from `docs/results/` (written by `npm run evaluate` and `npm run benchmark`). | The report and the system cannot disagree. | Re-run the commands after changing the knowledge base. |
| 28 | Contents, list of tables and list of figures are Word fields. | They update themselves. Word asks to update fields when the file opens: click **Yes**. | References > Update Table. |
| 29 | User feedback is measured with the 10 SUS items plus 4 Technology Acceptance Model items on one printed page. | Standard, quick to score, and the report already explains the scoring. | `docs/student-feedback-form.docx`. |
| 30 | Ten slides with speaker notes, Calibri, the app's palette; the architecture slide is drawn with shapes so it is readable on a projector. | Calibri ships with every PowerPoint; the dense diagram stays in the report (Figure 3.2). | `docs/defense-slides.pptx`. |

## Not done (deliberately out of scope)

- An admin page for the language rules (they are edited in phpMyAdmin; the matcher picks up changes automatically).
- Igbo, voice input, conversation memory, links to students' personal portal records.
- A load test and hosting on a university server.
- Real student testing (the form is ready; the results table in Chapter 4 is waiting for it).
