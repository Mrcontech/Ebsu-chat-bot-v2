// Builds the browser version of the EBSU Enquiry Bot as one HTML file: the app's chat
// interface, the matching engine and the knowledge base, with its CSS, script and data inline.
// React 18 and the Outfit font load from cdnjs and Google Fonts when the page opens.
//   npm run build:browser-demo                 writes demo/browser/dist/ebsu-enquiry-bot.html
//   npm run build:browser-demo -- other.html   writes somewhere else
import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const out = resolve(process.argv[2] ?? join(here, "dist", "ebsu-enquiry-bot.html"));

const REACT = "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js";
const REACT_DOM = "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js";
const FONT = "https://fonts.googleapis.com/css2?family=Outfit:wght@300..800&display=swap";

// next/link and next/navigation become view switches; React comes from the page's globals.
const pagePlugin = {
  name: "browser-page",
  setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: join(here, "shims", "next-link.tsx") }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(here, "shims", "next-navigation.ts") }));
    b.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: join(here, "shims", "jsx-runtime.js") }));
    b.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, (args) => ({ path: args.path, namespace: "react-global" }));
    b.onLoad({ filter: /.*/, namespace: "react-global" }, (args) => ({
      contents: `module.exports = window.${args.path.startsWith("react-dom") ? "ReactDOM" : "React"};`,
      loader: "js",
    }));
  },
};

const bundle = await build({
  entryPoints: [join(here, "app.tsx")],
  absWorkingDir: root,
  tsconfig: join(root, "tsconfig.json"),
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [pagePlugin],
  logLevel: "warning",
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const cssPath = join(here, "styles.css");
const { css } = await postcss([tailwind({ base: here, optimize: { minify: true } })]).process(readFileSync(cssPath, "utf8"), { from: cssPath });

const html = `<title>EBSU Enquiry Bot</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<style>
/* Design: the app's own tokens (src/app/globals.css): warm off-white canvas, one burnt-orange
   accent, Outfit. Light only, as the project brief asks. */
:root{--font-outfit:"Outfit";color-scheme:light}
html,body{background:#f4efe8;color:#24201c}
${css}
body{font:inherit}
</style>
<div id="root"><p style="font:15px/1.5 system-ui,sans-serif;color:#5c544c;padding:24px">Loading the EBSU Enquiry Bot...</p></div>
<script src="${REACT}"></script>
<script src="${REACT_DOM}"></script>
<script>${js}</script>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
