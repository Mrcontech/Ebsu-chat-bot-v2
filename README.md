# EBSU Enquiry Bot

**Design and Implementation of a Web-Based AI-Powered Chatbot for Student Enquiry Services in Ebonyi State University, Abakaliki**

A chatbot that answers student questions about Ebonyi State University (EBSU): admission, Post-UTME and cut-off marks, fees and payments, the student portal, faculties and departments, results, transcripts, postgraduate admission, the library and who to contact. Students type in their own words, in English, Nigerian Pidgin or short forms (`wetin be the putme fee`, `how do i chek my admision status`). When the bot has no answer, it says so, names the office to contact and saves the question for the admin.

- **Stack:** Next.js 16 (TypeScript) for the web app and the matching engine, MySQL/MariaDB (XAMPP) for the knowledge base, chat logs and admin accounts.
- **AI approach:** retrieval-based natural language processing. Text normalisation, Pidgin and abbreviation rules, typo correction (edit distance), Porter stemming, TF-IDF cosine similarity and character-trigram similarity, with a confidence threshold and an office fallback. No external AI service, no internet needed.
- **Knowledge base:** 85 answers about EBSU, every one taken from an official EBSU web page (ebsu.edu.ng and its portal subdomains) and linked to it, plus 6 small-talk replies. 414 extra phrasings and 307 language rules.
- **Measured accuracy:** 29 of 30 held-out test questions handled correctly (96.7%), with no wrong answers. See [`docs/results/evaluation-test.md`](docs/results/evaluation-test.md).

## Run it (one command)

You need, once:

1. **XAMPP** (any recent version) with MySQL. Open the XAMPP Control Panel and click **Start** next to **MySQL**. Apache is not needed.
2. **Node.js 20.9 or newer** (the LTS version from nodejs.org).

Then, in this folder:

```bash
npm start
```

That one command:

1. installs the Node packages the first time (this step needs internet, once),
2. creates the `ebsu_chatbot` database, its tables and the starting knowledge base if they do not exist yet,
3. builds the web app if the code changed since the last build,
4. starts the server and opens **http://localhost:3000** in your browser.

After the first run, everything works with the network switched off. To stop the server, press `Ctrl+C`.

| Page | Address |
|---|---|
| Student chat | http://localhost:3000 |
| How it works (explains the AI, live matcher, FAQ comparison) | http://localhost:3000/how-it-works |
| Offices and contacts | http://localhost:3000/contacts |
| Admin area | http://localhost:3000/admin |

**Admin login:** username `admin`, password `ebsu-admin-2026`. Change it in **Admin > Settings** after your first login.

### If your MySQL settings are different

XAMPP's defaults (user `root`, no password, port 3306) work without any setup. If you gave `root` a password or use another port, copy `.env.example` to `.env` and edit the values.

### Useful commands

| Command | What it does |
|---|---|
| `npm start` | Set up the database if needed, build, start on port 3000 |
| `npm run dev` | Development mode with live reload |
| `npm run db:reset` | Delete the database and reload the starting data (wipes chat logs and your edits) |
| `npm run db:export` | Write `database/ebsu_chatbot.sql` for importing by hand in phpMyAdmin |
| `npm test` | Unit tests for the matching engine |
| `npm run evaluate` | Accuracy test on the 30 held-out questions; writes `docs/results/` |
| `npm run typecheck` | TypeScript check |

### Setting up the database by hand (backup plan)

If `npm start` cannot create the database (for example on a locked-down lab computer), open phpMyAdmin (http://localhost/phpmyadmin), create a database called `ebsu_chatbot` with collation `utf8mb4_unicode_ci`, choose **Import**, select `database/ebsu_chatbot.sql` and click **Go**. Then run `npm start`.

## The demo in ten minutes

1. **Ask in your own words.** On the chat page type `wetin be the putme fee`. The bot answers N2,000.00 and links to the official notice. Click **How I matched this** to show every NLP step and the scores.
2. **Typos and short forms.** Try `how do i chek my admision status` and `cut off for comp sci`.
3. **When it does not know.** Ask `How much is hostel accommodation per session?`. The bot says it does not have that yet, names the office to contact, and saves the question.
4. **The admin grows the knowledge base.** Log in at `/admin`, open **Unanswered**, and either write a new answer or link the question to an existing answer as another phrasing. Ask again in the chat: it now answers.
5. **How it was tested.** Open **Admin > Test bench** to run the 30 test questions live.
6. **Why it is not just an FAQ page.** Open **How it works** for the pipeline, the live matcher and the comparison table.

## How it works

```
student message
  -> clean (lower case, remove punctuation and accents)
  -> fix typos (Damerau-Levenshtein distance against known words)
  -> translate Pidgin, abbreviations and synonyms (language_rules table)
  -> remove stopwords, reduce words to their roots (Porter stemmer)
  -> score against every stored phrasing:  0.8 x TF-IDF cosine + 0.2 x character-trigram Dice
  -> best score >= 0.50: answer   |   0.32 to 0.49: "Did you mean...?"   |   below 0.32: office fallback + log
```

The thresholds can be changed in **Admin > Settings**. The matcher rebuilds itself whenever a question, phrasing or rule changes, including changes made directly in phpMyAdmin.

Main files:

| Path | Purpose |
|---|---|
| `src/lib/nlp/` | The matching engine (`text.ts`, `fuzzy.ts`, `matcher.ts`) |
| `src/lib/chat.ts` | One message: match, reply, log, save unanswered questions |
| `src/lib/routing.ts` | Which office to suggest when there is no answer |
| `src/app/` | Pages: chat, how it works, contacts, admin area, API routes |
| `database/schema.sql` | Tables |
| `database/seed/` | Starting data: knowledge base (with source links), offices, language rules, test questions |
| `tests/` | Unit tests |
| `docs/` | Project report, defense deck, Q&A sheet, feedback form, test results, screenshots |

## Keeping the knowledge base accurate

Every answer must come from an official EBSU source. In **Admin > Knowledge base** each entry has a **source** field: fill it with the EBSU page or document the answer came from. Facts that were not available on the official website when this was built (school fee amounts, hostels, course registration steps, exam rules, the academic calendar and some office contacts) are listed in [`docs/knowledge-gaps.md`](docs/knowledge-gaps.md) so they can be added from the right office.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach MySQL at 127.0.0.1:3306" | Start MySQL in the XAMPP Control Panel. |
| "MySQL refused the user root" | You set a root password: put it in `.env` as `DB_PASSWORD=...`. |
| Port 3000 is already in use | Set `PORT=3001` in `.env`, or close the other program. |
| The first `npm start` fails at "installing packages" | Connect to the internet for that first install only. |
| The page says the knowledge base is not reachable | MySQL stopped. Start it again in XAMPP and refresh. |

## Credits

- Interface font: Outfit (SIL Open Font License, `src/app/fonts/OFL-LICENSE.txt`).
- Icons: Phosphor Icons (MIT).
- Interface guidance: the `design-taste-frontend` skill from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT), installed in `.agents/skills/`.
- University information: official Ebonyi State University web pages, cited per answer.
