// One command to run the whole project:  npm start
//   1. installs the Node packages the first time (needs internet once)
//   2. creates and fills the MySQL database if it is empty
//   3. builds the web app if the code changed since the last build
//   4. starts the server on http://localhost:3000 and opens the browser
// After the first run everything works with the network switched off.
//
// Options: --dev (development mode with live reload), --no-open (do not open the browser)
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, ROOT } from "./lib/env.mjs";

const args = new Set(process.argv.slice(2));
const dev = args.has("--dev");
const isWindows = process.platform === "win32";

loadEnv();
const port = Number(process.env.PORT || 3000);

const step = (n, text) => console.log(`\n[${n}/4] ${text}`);
const fail = (text) => {
  console.error(`\n  ${text}\n`);
  process.exit(1);
};

console.log("\nEBSU Enquiry Bot");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) fail(`Node.js 20.9 or newer is needed (you have ${process.versions.node}). Install the LTS version from nodejs.org.`);

// 1. Packages
step(1, "Checking packages");
if (!existsSync(join(ROOT, "node_modules", "next", "package.json"))) {
  console.log("  First run: installing packages (this needs internet once)...");
  const npm = spawnSync(isWindows ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: ROOT, stdio: "inherit", shell: isWindows });
  if (npm.status !== 0) fail("npm install failed. Connect to the internet for this first install, then run npm start again.");
} else {
  console.log("  Packages already installed.");
}

// 2. Database
step(2, "Preparing the MySQL database");
const { setupDatabase } = await import("./db-setup.mjs");
try {
  await setupDatabase();
} catch (error) {
  fail(error.message);
}

const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");

// 3. Build (only when something changed)
function fingerprint() {
  const hash = createHash("sha256");
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const info = statSync(path);
      if (info.isDirectory()) walk(path);
      else hash.update(`${path}:${info.size}:${info.mtimeMs}`);
    }
  };
  for (const dir of ["src", "public"]) if (existsSync(join(ROOT, dir))) walk(join(ROOT, dir));
  for (const file of ["next.config.ts", "package.json", "postcss.config.mjs", "tsconfig.json"]) {
    if (existsSync(join(ROOT, file))) hash.update(readFileSync(join(ROOT, file)));
  }
  return hash.digest("hex");
}

if (dev) {
  step(3, "Development mode: skipping the production build");
} else {
  step(3, "Building the web app");
  const stampFile = join(ROOT, ".next", "ebsu-build-stamp");
  const current = fingerprint();
  const built = existsSync(join(ROOT, ".next", "BUILD_ID")) && existsSync(stampFile) && readFileSync(stampFile, "utf8") === current;
  if (built) {
    console.log("  No changes since the last build.");
  } else {
    console.log("  This takes about a minute the first time...");
    const build = spawnSync(process.execPath, [nextBin, "build"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
    if (build.status !== 0) fail("The build failed. Read the error above.");
    writeFileSync(stampFile, current);
  }
}

// 4. Start
step(4, "Starting the server");
const server = spawn(process.execPath, [nextBin, dev ? "dev" : "start", "-p", String(port)], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));

const url = `http://localhost:${port}`;
async function waitAndOpen() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`\n  Student chat:  ${url}\n  Admin:         ${url}/admin\n  Press Ctrl+C to stop.\n`);
  if (args.has("--no-open") || process.env.CI) return;
  const opener = isWindows ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {}
}
waitAndOpen();
