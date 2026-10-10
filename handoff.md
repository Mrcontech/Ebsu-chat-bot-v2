# Handoff — EBSU Enquiry Bot — 2026-10-10

## Goal and definition of done

A final-year Computer Science project for Ebonyi State University, Abakaliki: *Design and Implementation of a Web-Based AI-Powered Chatbot for Student Enquiry Services in Ebonyi State University, Abakaliki*.

Done means:
- A student opens the chat, sees suggested questions, and types in their own words: English, Nigerian Pidgin, typos or short forms. They get a matched answer with its official source, or a fallback naming the office to contact.
- An admin logs in, adds and edits question-and-answer pairs, and sees the list of unanswered questions.
- The repo runs with one command (`npm start`) once MySQL is started in XAMPP, and works with the network off after the first install.
- At least 50 real EBSU Q&A pairs are loaded (there are 85).
- The project documents are ready for the defense: five-chapter report, 10-slide deck, Q&A sheet and feedback form.

Two non-negotiables:
1. Every fact comes from official EBSU sources and is never invented; missing facts are listed for the student to fill.
2. The demo works offline.

What is left for "done":
- Run the app on the student's own (Windows) laptop.
- The student fills the yellow [TO FILL] parts of the report and collects real feedback forms.
- Merge the PR.

---

## Current state

### What works
- **App:** Next.js 16 with MySQL/MariaDB.
  - `npm start` installs packages (first run only), creates the `ebsu_chatbot` database and seed data if it is empty, builds when the code changed, and serves on http://localhost:3000.
  - Verified in the cloud container (Linux, Node 22, MariaDB 10.11): 28/28 end-to-end browser checks, 22/22 unit tests (`npm test`), typecheck clean.
- **Matching:**
  - 29 of 30 held-out test questions handled correctly (96.7%), precision 100%, recall 96%, no wrong answers (`npm run evaluate`, results in `docs/results/`).
  - Median 3.6 ms per request (`npm run benchmark`).
- **Student pages:**
  - Chat: suggested questions, answers with source link, "Did you mean" suggestions, and an office fallback that adds the Registrar's general contact when the office has none published.
  - "How I matched this" panel; How it works page with the live matcher; Offices and contacts.
- **Admin** (`/admin`, login `admin` / `ebsu-admin-2026`):
  - dashboard
  - knowledge base add/edit/hide/delete
  - Unanswered list (write an answer / add as a phrasing / dismiss)
  - chat logs, test bench (re-runs the 30 test questions live)
  - offices, thresholds, password change
- **Documents** in `docs/`:
  - `project-report.docx`: 103 pages. The preliminary pages follow the lecturer's "Sample Preliminary pages": title, Declaration, Certification, Approval, Acknowledgement, Dedication, Abstract, Table of Content, List of Tables, List of Figures.
  - `defense-slides.pptx`: 10 slides with speaker notes.
  - `defense-qa-sheet.docx`: 24 panel questions, each with what to show in the app and where the evidence is in the report.
  - `student-feedback-form.docx`: one page, SUS plus 4 TAM items.
  - Also: `decision-log.md`, `knowledge-gaps.md`, `results/`, `screenshots/`, `diagrams/` (with `.dot` sources).
- **Browser version:** published (private) at https://claude.ai/artifact/2bsK6xvQRYxxE8aoHWPP1e.
  - Uses the app's own chat components, matcher and seed knowledge base, running in the page.
  - Saves unanswered questions in the page's shared store (collection `unanswered`).
  - Source in `demo/browser/`; rebuild with `npm run build:browser-demo`.
- **GitHub:** PR https://github.com/Mrcontech/Ebsu-chat-bot-v2/pull/1 is a draft from `claude/lucid-ramanujan-44u71v` into `main`. It is mergeable, with no CI configured and no review comments.

### What's broken
- Nothing known.
- Not yet run on Windows with XAMPP: only tested on Linux with MariaDB 10.11.
- In the browser version, the Outfit font and React CDN load could not be checked from the cloud, because its proxy blocks them. It was tested with local copies of the same React 18 files.

### Half-done
- Running the app on the student's computer. The cloud session cannot reach it.
- Report [TO FILL] parts: name, registration number, supervisor, Head of Department, month and year, acknowledgement, dedication, interviews/questionnaire (3.3.3), problem evidence (1.2), user-feedback results (Table 4.13, section 4.9).
- Feedback forms have not been given to students yet.
- PR #1 is still a draft. GitHub's default branch is still `claude/lucid-ramanujan-44u71v`, because the repo was empty when it was first pushed. Set `main` as the default after merging.

---

## Files in play

| File | Status | Why it's in play |
|------|--------|-----------------|
| `src/lib/nlp/matcher.ts`, `fuzzy.ts`, `text.ts` | Existing | The matching engine (core of the project and of Chapter 3) |
| `src/lib/chat.ts`, `routing.ts`, `kb.ts` | Existing | One message end to end; office fallback; index cache |
| `src/app/admin/(panel)/test/page.tsx`, `logs/page.tsx`, `unanswered/page.tsx` | Modified | Scores now shown rounded down like the chat (`formatScore`) |
| `database/seed/*.json` | Existing | Knowledge base, rules, offices, test questions (source of truth for a fresh database) |
| `scripts/benchmark.mjs` | New | `npm run benchmark` writes `docs/results/response-time.md` |
| `scripts/worked-example.ts` | New | `npm run example` prints the Chapter 3 TF-IDF worked example |
| `docs/project-report.docx` | New | The report; edit it in Word from now on |
| `docs/defense-slides.pptx`, `defense-qa-sheet.docx`, `student-feedback-form.docx` | New | Defense materials |
| `docs/decision-log.md`, `docs/knowledge-gaps.md` | Modified | Decisions 1 to 33; missing and to-verify facts |
| `demo/browser/*` | New | Browser version source (`app.tsx`, `engine.ts`, `saved.ts`, `router.ts`, `shims/`, `build.mjs`) |
| `package.json` | Modified | Scripts: `benchmark`, `example`, `build:browser-demo` |
| `README.md` | Modified | Project documents table; browser version link |
| `handoff.md` | New | This file (delete before merging if not wanted in the repo) |

---

## What we tried that didn't work

- **Tried:** reading ebsu.edu.ng directly from the cloud container.
  **Failed because:** the network blocked it (403/DNS).
  **Lesson:** facts were gathered through search restricted to ebsu.edu.ng. The search budget ran out after 42 pages, so the remaining gaps are listed in `docs/knowledge-gaps.md`.
- **Tried:** `git push` while the Claude GitHub App had no access.
  **Failed because:** 403 from GitHub.
  **Lesson:** it worked after the user granted access. Never work around an access denial.
- **Tried:** `git merge -F -` (message from stdin).
  **Failed because:** git reads `-` as a file name.
  **Lesson:** write the message to a file and pass its path.
- **Tried:** `pkill -f <pattern>` in the same shell.
  **Failed because:** the pattern matched the shell's own command line and killed it (exit 144).
  **Lesson:** stop background servers by task/PID.
- **Tried:** `cd dir && rm -rf *`.
  **Failed because:** blocked by a safety check (unresolvable target).
  **Lesson:** use fresh directories with absolute paths.
- **Tried:** docx-js paragraphs with `line` spacing but no `lineRule`.
  **Failed because:** LibreOffice clipped inline images to one line.
  **Lesson:** always set `lineRule: AUTO`.
- **Tried:** a Word list of tables/figures with `\t` switch on a style whose name differed from its id.
  **Failed because:** LibreOffice rendered empty lists.
  **Lesson:** keep style name equal to style id (`TableCaption`, `FigureCaption`).
- **Tried:** loading React from cdnjs inside the cloud container.
  **Failed because:** the egress proxy denies cdnjs (organization policy).
  **Lesson:** test the browser version with local React 18 UMD files routed through Playwright. Viewers load the CDN normally.
- **Tried:** computer use to install XAMPP on the student's PC.
  **Failed because:** computer use is not available in a cloud session.
  **Lesson:** run a local session (see Known blockers).
- **Tried (matching):** mapping "when" to "date" as a synonym.
  **Failed because:** it adds noise to "who do I call when the portal is not loading" (test #24, which got suggestions instead of an answer).
  **Lesson:** left unfixed on purpose, because tuning on the test set would invalidate the 96.7%. A fix would map "when" only at the start of a question; test it on the dev set.

---

## Known blockers

| Blocker | Owner | What unblocks it |
|---------|-------|-----------------|
| App not yet running on the student's laptop | Student | Open a session on that computer: the Claude desktop app (with Computer use on, Settings → This computer → Computer use) or `claude remote-control` in the project folder. Or follow the README steps by hand. |
| Real user-feedback results for Chapter 4 | Student | Print `docs/student-feedback-form.docx` for 20 to 30 students, score SUS, fill Table 4.13 and section 4.9 |
| Facts EBSU does not publish (school fees, hostels, course registration, exam rules, current calendar, some office contacts) | Student / EBSU offices | Get them from the offices; add in Admin > Knowledge base with the document as source |
| PR #1 merge | Student (repo owner) | Mark ready for review, merge, then set `main` as the default branch |

---

## Decisions

- **Decision:** retrieval-based NLP. The pipeline: cleaning, Damerau-Levenshtein typo correction, 307 language rules (61 Pidgin, 137 abbreviations, 36 spellings, 73 synonyms), stopwords, Porter stemming, then score = 0.8 × TF-IDF cosine + 0.2 × character-trigram Dice.
  **Reason:** the brief (keyword plus fuzzy, TF-IDF, no external AI); works offline; explainable to a defense panel.
- **Decision:** answer at ≥ 0.50, suggest from 0.32, both editable in Admin > Settings.
  **Reason:** chosen on the 30 development questions only (0.30 to 0.60 all safe; 0.50 in the middle; 0.32 sits above the highest dev score that should fall back, 0.24).
- **Decision:** answer outright only when the message shares a word the student actually typed; typo-guessed words weigh 0.75; small talk never crowds out a real answer.
  **Reason:** without this, "sports facilities" was confidently answered as "faculties"; "good morning, where is the library" must get the library answer.
- **Decision:** the knowledge base comes only from official EBSU pages (85 answers, 42 pages, each linked). Missing facts are listed, never guessed.
  **Reason:** the user's non-negotiable.
- **Decision:** 60 test questions, 30 development and 30 held-out test; the test set is never used for tuning; miss #24 left unfixed.
  **Reason:** honest evaluation.
- **Decision:** scores display rounded down everywhere (`src/lib/format.ts`).
  **Reason:** 0.319 must not look as if it reached 0.32.
- **Decision:** light theme only: warm off-white (#f4efe8), orange accent (#c44a1f for buttons, #e8613c decorative), Outfit font, Phosphor icons, layout after the MindMerge reference; the taste skill was used for the student UI.
  **Reason:** the user's design brief.
- **Decision:** one command (`npm start`); XAMPP defaults (root, no password, 127.0.0.1:3306) with `.env` override; default admin `admin` / `ebsu-admin-2026` (change in Settings).
  **Reason:** the "one command after XAMPP" requirement and a predictable demo.
- **Decision:** documents are `.docx`/`.pptx` files in `docs/`, not hosted docs.
  **Reason:** offline, editable in the department's template, printable.
- **Decision:** the report's preliminary pages follow the lecturer's sample exactly: order, wording, the Approval page, the headings "ACKNOWLEDGEMENT" and "TABLE OF CONTENT", bold TNR 12 pt. The body is double-spaced; paper stays A4 (the sample's US Letter is just Word's default); the list of abbreviations moved to Table 1.1.
  **Reason:** the sample the user's lecturer gave on 2026-10-10.
- **Decision:** `main` was created as an empty initial commit and merged into the branch, so PR #1 shows the whole project without rewriting history.
  **Reason:** the repo was empty; a PR needs a base branch with shared history.
- **Decision:** the browser version reuses the app's components and matcher, loads React 18 from cdnjs, and keeps unanswered questions in the artifact's shared store with no counters. It says "saved" only after a confirmed write.
  **Reason:** lets the student try the chat without installing; artifact pages may only load libraries from approved CDNs and React 19 has no build there; the store has no safe counters.

---

## Open questions

- [ ] Does the department want double line spacing throughout, and A4? → supervisor
- [ ] Should the browser version be shared with classmates? Contributor access lets their unanswered questions be saved; Viewers can only chat. → student
- [ ] Keep `handoff.md` and `demo/` in the repo when merging? → student
- [ ] The facts marked "check" in `docs/knowledge-gaps.md` (acceptance fee, DVC Admin, Registrar, health/security phone numbers, PG email, founding year, two search-summary facts) → confirm with the offices before the defense

---

## Context that won't survive this session

- **Document generators are gone.** The scripts that generated the report, deck, Q&A sheet and form (docx-js and pptxgenjs) lived in the cloud session's temporary scratchpad and are NOT in the repo. From now on, edit `docs/*.docx` and `docs/*.pptx` directly in Word or PowerPoint.
- **Report numbers are fixed in the document.** They came from `docs/results/` (evaluation, threshold sweep, response time) at build time. If the knowledge base or matcher changes, re-run `npm run evaluate` and `npm run benchmark` and update Chapter 4 by hand.
- **Word fields.** Word asks to "update fields" when the report opens: click Yes. That fills the Table of Content and the lists of tables and figures.
- **The database is created from `database/seed/` only when `qa_pairs` is empty.** `npm run db:reset` deletes the database and reloads the seed (wipes admin edits and chat logs). Edits made in the admin area live only in MySQL, not in the seed files.
- **The matcher index rebuilds itself.** It happens whenever `qa_pairs`, `qa_variants` or `language_rules` change (a signature check in `src/lib/kb.ts`), so edits made directly in phpMyAdmin are picked up without a restart.
- **Language rules.** They are applied in one pass, longest phrase first. A rule's canonical form must never be another rule's phrase; a unit test enforces this. There is no admin page for rules; edit the `language_rules` table in phpMyAdmin.
- **Test sets.** `database/seed/test-questions.json` has `set: "test"` (held out, reporting only) and `set: "dev"` (for tuning). Never tune against the test set.
- **Score display.** Rounded down (`formatScore`) on every screen, so a score of 0.319 reads 0.31 and correctly sits below the 0.32 threshold.
- **Fallback offices.** The Bursary, Student Affairs and Health offices have no published contacts. For those, the fallback card adds the Office of the Registrar's general contact.
- **Suspect phone numbers.** The Health and Safety page lists the same phone numbers as the ICT support lines (possibly placeholders); this is flagged in `knowledge-gaps.md`.
- **MariaDB versions.** XAMPP ships MariaDB 10.4. The schema avoids newer features, but it has only been run on MariaDB 10.11 so far.
- **First `npm start` needs internet.** It runs `npm install`. After that, everything works offline. Port clash: set `PORT=3001` in `.env`.
- **How the browser version works.** `demo/browser/app.tsx` answers the chat's `fetch('/api/chat' | '/api/explain' | '/api/feedback')` in the page. `next/link` and `next/navigation` are shimmed by the build (`demo/browser/shims/`), and React 18 comes from cdnjs as a global.
- **Browser version: rebuild and republish.** Rebuild with `npm run build:browser-demo` (output in `demo/browser/dist/`, gitignored). To update the published page, ask Claude to republish that file to https://claude.ai/artifact/2bsK6xvQRYxxE8aoHWPP1e.
- **Browser version: needs internet.** It loads React and the font from CDNs; the full app does not.
- **Browser version: saving questions.** The page's shared store is only written by people with Contributor access or above; Viewers can chat but their questions are not saved. The chat only says "I have saved your question" when the save succeeded.
- **GitHub default branch.** It is `claude/lucid-ramanujan-44u71v`, not `main`. Change it in the repo settings after merging PR #1.
- **Leftover check-in.** A safety-net check-in on PR #1 was scheduled from the cloud session (trigger `trig_01VrNUBvJMUMhweedtfYekSR`, around 09:30 UTC on 2026-10-10). It wakes the cloud session, not a local one.
- **Defense prep.** Run `npm run db:reset` before the defense to clear rehearsal logs and edits, and rehearse with Wi-Fi off. The demo script is in `docs/defense-qa-sheet.docx`.

---

## Environment snapshot

**Stack:**
- Next.js 16.3.8 (App Router), React 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3
- mysql2 3.24.4, stemmer 2.0.1 (Porter), bcryptjs 3.0.3, @phosphor-icons/react 2.1.10
- MySQL/MariaDB from XAMPP, Node.js ≥ 20.9
- Tests run with `tsx --test`.

**Dev command:** `npm start` (set up DB, build, serve) or `npm run dev` (live reload)
**Running on:** http://localhost:3000 (admin at http://localhost:3000/admin)

**Env vars needed:** all optional; copy `.env.example` to `.env` only if the defaults don't fit.
```
DB_HOST=127.0.0.1              # XAMPP MySQL host
DB_PORT=3306                   # XAMPP MySQL port
DB_USER=root                   # XAMPP default user
DB_PASSWORD=                   # empty for XAMPP's default root; set it if root has a password
DB_NAME=ebsu_chatbot           # created automatically by npm start
PORT=3000                      # web server port
ADMIN_DEFAULT_PASSWORD=ebsu-admin-2026   # used only when the first admin is created
```

**Migrations pending:** none (`database/schema.sql` runs on `npm start` / `npm run db:setup`; `npm run db:export` writes `database/ebsu_chatbot.sql` for phpMyAdmin)
**Branch:** `claude/lucid-ramanujan-44u71v` (PR #1 into `main`)

---

## Next step

> Run the app on the student's Windows laptop: install Node.js LTS and XAMPP, start MySQL in the XAMPP Control Panel, run `npm start` in the project folder, and walk through the README's ten-minute demo.

---

## Vibe check

**Status:** CLEAN

Everything asked for is built, tested and pushed. That covers the app, the 85-answer knowledge base, the evaluation, the report rebuilt to the lecturer's preliminary-page sample, the deck, the Q&A sheet, the feedback form and a browser version. The one real unknown is the student's own Windows machine: the app has only run on Linux with MariaDB 10.11, so the first run on XAMPP may turn up a path or port issue. The rest of the remaining work is the student's own: personal details and real feedback in the report, facts from the EBSU offices, and merging the PR.
