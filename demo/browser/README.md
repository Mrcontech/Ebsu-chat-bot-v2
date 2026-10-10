# Browser version

A one-page version of the EBSU Enquiry Bot that runs entirely in the browser. It uses the app's own chat interface (`src/components`), the same matching engine (`src/lib/nlp`) and the knowledge base in `database/seed/`. It needs no server, MySQL or installation, so anyone with the link can try the chat on a phone.

Published at https://claude.ai/artifact/2bsK6xvQRYxxE8aoHWPP1e. It is private until you share it from the page's **Share** menu.

**What it has:** the chat (answers with their official source, "Did you mean", the office fallback, "How I matched this"), the How it works page with the live matcher, offices and contacts, and a list of the questions it could not answer. That list is kept in the published page's shared store. Only people with Contributor access or above can add to it; Viewers can still use the chat.

**What it leaves out:** the staff area (login, editing answers, chat logs, the test bench and settings). Those are in the full app.

## Rebuild after changing the knowledge base

```bash
npm run build:browser-demo
```

This writes `demo/browser/dist/ebsu-enquiry-bot.html`, ready to publish again at the same link. React 18 and the Outfit font load from cdnjs and Google Fonts when the page opens, so the browser version needs internet; the full app does not.

| File | Purpose |
|---|---|
| `app.tsx` | The page: the app's layout and chat, the How it works, contacts and unanswered views, and the in-page answers to the chat's API calls |
| `engine.ts` | `handleMessage()` from `src/lib/chat.ts` without MySQL, using the seed data |
| `saved.ts` | Saving and listing unanswered questions in the page's shared store |
| `router.ts`, `shims/` | Stand-ins for Next.js links and React's JSX runtime |
| `build.mjs`, `styles.css` | Bundling with esbuild and Tailwind into one HTML file |
