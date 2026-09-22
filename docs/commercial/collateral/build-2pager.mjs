/**
 * Builds the customer-facing 2-pager from its Markdown source.
 *
 * Deliberately separate from ../build-docx.mjs. That builder stamps
 * ../assets/obvg-logo.png into a running header on every page, which is correct for the
 * agreement and wrong here: this sheet goes to a client, and clause 7.3 and Schedule 3
 * paragraph 3 of the agreement bar OBVG branding from anything a client sees. Nothing in
 * this file reads the assets directory.
 *
 *   npm install docx --prefix /tmp/docxbuild
 *   NODE_PATH=/tmp/docxbuild/node_modules node docs/commercial/collateral/build-2pager.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let D;
try {
  D = require("docx");
} catch {
  console.error(
    "Cannot resolve the 'docx' package.\n" +
      "  npm install docx --prefix /tmp/docxbuild\n" +
      "  NODE_PATH=/tmp/docxbuild/node_modules node docs/commercial/collateral/build-2pager.mjs",
  );
  process.exit(1);
}

const {
  AlignmentType, BorderStyle, Document, HeadingLevel, PageBreak, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} = D;

const SRC = join(here, "managed-partner-development-2pager.md");
const OUT = join(here, "managed-partner-development-2pager.docx");

const FONT = "Calibri";
const INK = "1A1A1A";
const MUTED = "595959";
const RULE = "C8CDD4";
const ACCENT = "094A9E";   // placeholder brand blue; swap for Automatum's
const CONTENT_WIDTH = 12240 - 1080 * 2;

// ---------------------------------------------------------------- inline runs
// **bold** is the only inline mark the copy uses.
function runs(text, opts = {}) {
  const out = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const bold = part.startsWith("**") && part.endsWith("**");
    out.push(new TextRun({ ...opts, text: bold ? part.slice(2, -2) : part, bold: bold || opts.bold }));
  }
  return out;
}

const P = (text, o = {}) =>
  new Paragraph({
    spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line ?? 252 },
    alignment: o.align,
    children: runs(text, { font: FONT, size: o.size ?? 19, color: o.color ?? INK, bold: o.bold }),
  });

// ---------------------------------------------------------------------- table
function table(rows) {
  const cols = rows[0].length;
  // First column carries the row label and gets the extra width.
  const wide = Math.round(CONTENT_WIDTH * (cols === 2 ? 0.46 : 0.28));
  const rest = Math.round((CONTENT_WIDTH - wide) / (cols - 1));
  const widths = [wide, ...Array(cols - 1).fill(rest)];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: rows.map((cells, r) =>
      new TableRow({
        tableHeader: r === 0 || undefined,
        children: cells.map((t, i) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            shading: r === 0 ? { type: ShadingType.CLEAR, fill: "F2F5F9", color: "auto" } : undefined,
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 240 },
                children: runs(t, {
                  font: FONT,
                  size: 18,
                  color: r === 0 ? ACCENT : i === 0 ? MUTED : INK,
                  bold: r === 0 || (cells.length > 2 && i === 0) || undefined,
                }),
              }),
            ],
          })),
      })),
  });
}

// ---------------------------------------------------------------------- parse
const lines = readFileSync(SRC, "utf8").split("\n");
const body = [];
let buf = [];
let tbl = null;
let pageBroken = false;

const flush = () => {
  if (buf.length) { body.push(P(buf.join(" "))); buf = []; }
};
const flushTable = () => {
  if (tbl) { body.push(table(tbl)); body.push(P("", { after: 60 })); tbl = null; }
};

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const t = l.trim();

  if (/^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(t)) continue;           // table separator

  if (t.startsWith("|")) {
    flush();
    const cells = t.slice(1, -1).split("|").map((c) => c.trim());
    (tbl ??= []).push(cells);
    continue;
  }
  flushTable();

  if (!t) { flush(); continue; }

  if (t === "---") {
    flush();
    if (!pageBroken) {                                           // first rule: page break
      body.push(new Paragraph({ children: [new PageBreak()] }));
      pageBroken = true;
    } else {                                                     // later rules: hairline
      body.push(new Paragraph({
        spacing: { before: 200, after: 0 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, space: 8, color: RULE } },
        children: [],
      }));
    }
    continue;
  }
  if (t.startsWith("# ")) {
    flush();
    body.push(new Paragraph({
      spacing: { after: 40 },
      children: runs(t.slice(2), { font: FONT, size: 40, bold: true, color: INK }),
    }));
    continue;
  }
  if (t.startsWith("## ")) {
    flush();
    body.push(new Paragraph({
      spacing: { before: 220, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, space: 4, color: ACCENT } },
      children: runs(t.slice(3), { font: FONT, size: 22, bold: true, color: ACCENT }),
    }));
    continue;
  }
  const num = t.match(/^(\d+)\.\s+(.*)$/);                       // numbered step
  if (num) {
    flush();
    // A numbered step may wrap; indented lines that follow belong to it.
    const parts = [num[2]];
    while (i + 1 < lines.length) {
      const nxt = lines[i + 1];
      if (!nxt.trim() || !/^\s{2,}\S/.test(nxt) || /^\s*\d+\.\s/.test(nxt)) break;
      parts.push(nxt.trim());
      i++;
    }
    body.push(new Paragraph({
      spacing: { after: 70, line: 252 },
      indent: { left: 300, hanging: 300 },
      children: runs(`${num[1]}.  ${parts.join(" ")}`, { font: FONT, size: 19, color: INK }),
    }));
    continue;
  }
  buf.push(t);
}
flush();
flushTable();

// The subtitle and the closing small print are the two runs that need their own treatment.
const SUBTITLE = "Build and run your AWS Marketplace reseller channel";
for (let i = 0; i < body.length; i++) {
  const p = body[i];
  const text = (p.root ?? []).flatMap((r) => (r.root ?? []).filter((x) => typeof x?.text === "string")).map((x) => x.text).join("");
  if (text === SUBTITLE) {
    body[i] = P(SUBTITLE, { size: 24, color: ACCENT, bold: true, after: 200 });
  }
}
const WHOFOR = "For software vendors with a live AWS Marketplace listing.";
for (let i = 0; i < body.length; i++) {
  const p = body[i];
  const text = (p.root ?? []).flatMap((r) => (r.root ?? []).filter((x) => typeof x?.text === "string")).map((x) => x.text).join("");
  if (text === WHOFOR) body[i] = P(WHOFOR, { size: 17, color: MUTED, after: 180 });
}

const last = body.length - 1;
if (last >= 0) {
  const t = (body[last].root ?? []).flatMap((r) => (r.root ?? []).filter((x) => typeof x?.text === "string")).map((x) => x.text).join("");
  if (t.startsWith("Partner numbers are recruitment capacity")) {
    body[last] = P(t, { size: 15, color: MUTED, line: 220, before: 160 });
  }
}

// ------------------------------------------------------------------- assemble
const doc = new Document({
  creator: "Automatum",
  title: "Managed Partner Development",
  description: "Managed Partner Development - customer-facing overview",
  styles: { default: { document: { run: { font: FONT, size: 19, color: INK } } } },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },                 // US Letter
          margin: { top: 1080, right: 1080, bottom: 900, left: 1080 },
        },
      },
      children: [
        // Automatum logo placeholder - replace with the real mark before use.
        new Paragraph({
          spacing: { after: 220 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 8, color: RULE } },
          children: runs("[ AUTOMATUM LOGO ]", { font: FONT, size: 16, bold: true, color: MUTED }),
        }),
        ...body,
      ],
    },
  ],
});

const out = await Packer.toBuffer(doc);
writeFileSync(OUT, out);
console.log(`wrote ${OUT} (${out.length.toLocaleString()} bytes, ${body.length} blocks)`);
