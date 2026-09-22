/**
 * Renders the designed 2-pager to a self-contained PDF.
 *
 * The page is the source; its @media print rules already re-scale the sheet to two US Letter
 * pages. This script fetches the Google faces the page links and inlines them as data URIs
 * before rendering, so the PDF embeds the real type instead of falling back to whatever the
 * rendering machine happens to have. Without network it still renders, on the fallback stacks.
 *
 *   node docs/commercial/collateral/build-2pager-pdf.mjs
 */
import { execFileSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "managed-partner-development-2pager.html");
const OUT = join(here, "managed-partner-development-2pager.pdf");

// ------------------------------------------------------------------ browser
const runnable = (p) => {
  try { accessSync(p, constants.X_OK); return true; } catch { return false; }
};

function findChrome() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const candidates = [
    process.env.CHROME_PATH,
    join(root, "chromium"),
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
  ].filter(Boolean);
  // the pinned Playwright builds land in a versioned directory; prefer the newest
  try {
    for (const d of readdirSync(root).sort().reverse()) {
      candidates.push(join(root, d, "chrome-linux", "chrome"));
    }
  } catch { /* no browser directory on this machine */ }

  for (const p of candidates) if (runnable(p)) return p;
  throw new Error("No Chromium found. Set CHROME_PATH to a Chrome or Chromium binary.");
}

// -------------------------------------------------------------------- fonts
// Google serves a different stylesheet per UA; ask as a browser so we get woff2.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function inlineFonts(html) {
  const link = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]*)">/);
  if (!link) return html;
  let css;
  try {
    const r = await fetch(link[1].replace(/&amp;/g, "&"), { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    css = await r.text();
  } catch (e) {
    console.warn(`  ! could not fetch the webfonts (${e.message}); rendering on the fallback stacks`);
    return html.replace(/<link rel="(preconnect|stylesheet)"[^>]*>\s*/g, "");
  }

  // Only the latin subset is used; the rest would bloat the file for nothing.
  const faces = [...css.matchAll(/\/\* ([^*]+) \*\/\s*(@font-face \{[\s\S]*?\})/g)]
    .filter((m) => m[1].trim() === "latin")
    .map((m) => m[2]);

  const seen = new Map();
  const inlined = [];
  for (const face of faces) {
    const url = face.match(/url\((https:\/\/[^)]+)\)/)[1];
    if (!seen.has(url)) {
      const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
      if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error(`not a woff2: ${url}`);
      seen.set(url, buf.toString("base64"));
    }
    inlined.push(face.replace(url, `data:font/woff2;base64,${seen.get(url)}`));
  }
  console.log(`  embedded ${inlined.length} faces (${seen.size} files)`);
  return html
    .replace(/<link rel="preconnect"[^>]*>\s*/g, "")
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^"]*">/, `<style>\n${inlined.join("\n")}\n</style>`);
}

// --------------------------------------------------------------------- main
const page = await inlineFonts(readFileSync(SRC, "utf8"));

// Match the wrapper the artifact platform puts around a published page, so the PDF is the
// page as a reader sees it rather than a bare fragment.
const doc = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}</style>
</head><body>
${page}
</body></html>`;

const work = mkdtempSync(join(tmpdir(), "2pager-"));
try {
  const html = join(work, "page.html");
  writeFileSync(html, doc);
  execFileSync(findChrome(), [
    "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
    "--virtual-time-budget=8000", `--print-to-pdf=${OUT}`, `file://${html}`,
  ], { stdio: ["ignore", "ignore", "pipe"] });
} finally {
  rmSync(work, { recursive: true, force: true });
}

const pdf = readFileSync(OUT);
const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`wrote ${OUT} (${pdf.length.toLocaleString()} bytes, ${pages} pages)`);
if (pages !== 2) {
  console.error(`  ! expected 2 pages, got ${pages}`);
  process.exit(1);
}
