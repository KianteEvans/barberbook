// Builds the signature-ready .docx from the Markdown source of truth.
//
//   npm install docx        (not an app dependency - install globally or in a scratch dir)
//   node docs/commercial/build-docx.mjs
//
// Resolves `docx` from NODE_PATH or node_modules. Never edit the .docx by hand: this
// script overwrites it.

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
      "Install it and re-run, e.g.\n" +
      "  npm install docx --prefix /tmp/docxbuild\n" +
      "  NODE_PATH=/tmp/docxbuild/node_modules node docs/commercial/build-docx.mjs",
  );
  process.exit(1);
}

const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageBreak,
  PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} = D;

const SRC = join(here, "automatum-obp-white-label-agreement.md");
const LOGO = join(here, "assets", "obvg-logo.png");
const OUT = join(here, "automatum-obp-white-label-agreement.docx");

// US Letter, 1 inch margins, in DXA (1440 = 1 inch).
const CONTENT_WIDTH = 12240 - 1440 * 2;
const FONT = "Calibri";

// ---------------------------------------------------------------- inline runs

function runs(text, base = {}) {
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    out.push(new TextRun({ ...base, text: m[1], bold: true }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
  return out.length ? out : [new TextRun({ ...base, text: "" })];
}

// ---------------------------------------------------------------------- table

function buildTable(rows) {
  const cells = rows.map((r) =>
    r.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()),
  );
  const cols = Math.max(...cells.map((r) => r.length));
  const grid = cells.map((r) => {
    const copy = r.slice(0, cols);
    while (copy.length < cols) copy.push("");
    return copy;
  });

  // Proportional widths from the longest cell per column, with a floor.
  const weights = [];
  for (let c = 0; c < cols; c++) {
    let w = 1;
    for (const r of grid) w = Math.max(w, r[c].replace(/\*\*/g, "").length);
    weights.push(Math.max(w, 6));
  }
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.round((w / total) * CONTENT_WIDTH));
  widths[cols - 1] += CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0);

  const header = grid[0];
  const body = grid.slice(1);
  const blankHeader = header.every((h) => h === "");

  const mkRow = (cellsIn, isHeader) =>
    new TableRow({
      tableHeader: isHeader,
      children: cellsIn.map(
        (t, i) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.DXA },
            shading: isHeader
              ? { type: ShadingType.CLEAR, fill: "EDEDED", color: "auto" }
              : undefined,
            margins: { top: 60, bottom: 60, left: 108, right: 108 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 240 },
                children: runs(t, { size: 19, font: FONT, bold: isHeader || undefined }),
              }),
            ],
          }),
      ),
    });

  // A table written with an empty header row (e.g. the signature blocks) has no header
  // to render, so omit it rather than emitting a blank shaded strip.
  const tableRows = [];
  if (!blankHeader) tableRows.push(mkRow(header, true));
  for (const r of body) tableRows.push(mkRow(r, false));

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: tableRows,
  });
}

// ---------------------------------------------------------------- block parse

const md = readFileSync(SRC, "utf8").split("\n");
const children = [];
let table = [];
let buf = [];           // lines of the current text block
let bufKind = "para";   // "para" | "bullet" | "letter"
let seenFirstHeading = false;

const para_ = (opts) => new Paragraph(opts);

function flushBuf() {
  if (!buf.length) return;
  const text = buf.join(" ").replace(/\s+/g, " ").trim();
  const kind = bufKind;
  buf = [];
  bufKind = "para";
  if (!text) return;

  if (kind === "bullet") {
    children.push(
      para_({
        bullet: { level: 0 },
        spacing: { before: 40, after: 80, line: 276 },
        children: runs(text, { size: 22, font: FONT }),
      }),
    );
    return;
  }

  if (kind === "letter") {
    const m = /^([a-z])\.\s+(.*)$/.exec(text);
    if (m) {
      children.push(
        para_({
          indent: { left: 780, hanging: 360 },
          spacing: { before: 60, after: 80, line: 276 },
          children: runs(`${m[1]}.\t${m[2]}`, { size: 22, font: FONT }),
        }),
      );
      return;
    }
  }

  children.push(
    para_({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 160, line: 276 },
      children: runs(text, { size: 22, font: FONT }),
    }),
  );
}

function flushTable() {
  if (!table.length) return;
  // Drop only true separator rows (every cell is dashes), never a row of empty cells.
  const rows = table.filter((r) => !/^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(r));
  table = [];
  if (rows.length) {
    children.push(buildTable(rows));
    children.push(para_({ spacing: { after: 160 }, children: [new TextRun("")] }));
  }
}

function flush() {
  flushBuf();
  flushTable();
}

for (const raw of md) {
  const line = raw.replace(/\s+$/, "");

  // Table rows accumulate until a non-table line arrives.
  if (/^\s*\|.*\|\s*$/.test(line)) {
    flushBuf();
    table.push(line.trim());
    continue;
  }
  flushTable();

  if (!line.trim() || line.trim() === "---") {
    flushBuf();
    continue;
  }

  if (line.trim() === "<br>") {
    flushBuf();
    children.push(para_({ spacing: { after: 120 }, children: [new TextRun("")] }));
    continue;
  }

  const h = /^(#{1,3})\s+(.*)$/.exec(line);
  if (h) {
    flush();
    const level = h[1].length;
    const text = h[2].trim();

    if (level === 1) {
      const first = !seenFirstHeading;
      seenFirstHeading = true;
      children.push(
        para_({
          heading: HeadingLevel.HEADING_1,
          alignment: first ? AlignmentType.CENTER : AlignmentType.LEFT,
          pageBreakBefore: !first,
          spacing: { before: first ? 0 : 240, after: 200 },
          children: runs(text, { size: first ? 32 : 28, bold: true, font: FONT }),
        }),
      );
    } else if (level === 2) {
      children.push(
        para_({
          heading: HeadingLevel.HEADING_2,
          keepNext: true,
          spacing: { before: 300, after: 140 },
          children: runs(text, { size: 24, bold: true, font: FONT }),
        }),
      );
    } else {
      children.push(
        para_({
          heading: HeadingLevel.HEADING_3,
          keepNext: true,
          spacing: { before: 220, after: 120 },
          children: runs(text, { size: 22, bold: true, font: FONT }),
        }),
      );
    }
    continue;
  }

  // A lettered sub-paragraph, e.g. "  a. the failure was ..."
  if (/^\s{2,}[a-z]\.\s/.test(line)) {
    flushBuf();
    bufKind = "letter";
    buf.push(line.trim());
    continue;
  }

  // A bullet item at column 0.
  const bullet = /^-\s+(.*)$/.exec(line);
  if (bullet) {
    flushBuf();
    bufKind = "bullet";
    buf.push(bullet[1].trim());
    continue;
  }

  // Any indented line continues the block above it (markdown hard wrapping).
  if (/^\s{2,}\S/.test(line)) {
    buf.push(line.trim());
    continue;
  }

  // Plain text at column 0. A bullet or lettered block ends here.
  if (bufKind !== "para") flushBuf();
  buf.push(line.trim());
}
flush();

// ------------------------------------------------------------------ document

const doc = new Document({
  creator: "Automatum",
  title: "White Label Delivery Agreement - Managed Partner Development",
  description: "Automatum x Only Best Venture Group white label delivery agreement",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 276 } } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1700, right: 1440, bottom: 1440, left: 1440, header: 620 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 80 },
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 4, space: 6, color: "CCCCCC" },
              },
              children: [
                new ImageRun({
                  type: "png",
                  data: readFileSync(LOGO),
                  transformation: { width: 62, height: 42 },
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: {
                top: { style: BorderStyle.SINGLE, size: 4, space: 8, color: "CCCCCC" },
              },
              children: [
                new TextRun({ text: "Page ", size: 16, font: FONT }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT }),
                new TextRun({ text: " of ", size: 16, font: FONT }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const out = await Packer.toBuffer(doc);
writeFileSync(OUT, out);
console.log(`wrote ${OUT} (${out.length.toLocaleString()} bytes, ${children.length} blocks)`);
