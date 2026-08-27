const pptxgen = require("pptxgenjs");

const P = {
  deep: "05060F", bg: "10143A", bg2: "141A4F", card: "19205C", card2: "1E2668",
  indigo: "3B4CC0", indigoD: "2C39A0", indigoL: "5566D8",
  teal: "0E93AE", tealBr: "19C6E6", amber: "F5A623",
  white: "FFFFFF", t1: "C4CBEC", t2: "B7C0E0", t3: "AAB2D0",
  muted: "8E96C8", dim: "5B6486", rule: "3D4569", light: "EEF1FB",
};
const F = "Calibri";
const M = 0.62;                 // left/right margin
const CW = 13.333 - M * 2;      // content width = 12.093

const pres = new pptxgen();
pres.defineLayout({ name: "A169", width: 13.333, height: 7.5 });
pres.layout = "A169";
pres.author = "Only Best Practices";
pres.company = "Only Best Practices · AWS Alliance Advisory";
pres.title = "Putting Archera to work for Automatum";

let N = 0;
function sl(bgColor) {
  const s = pres.addSlide();
  s.background = { color: bgColor || P.bg };
  N += 1;
  return s;
}
function eyebrow(s, text, color) {
  s.addText(text, {
    x: M, y: 0.40, w: CW, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, bold: true, charSpacing: 2.6,
    color: color || P.tealBr, valign: "middle",
  });
}
function h1(s, text, opts) {
  const o = opts || {};
  s.addText(text, {
    x: M, y: o.y === undefined ? 0.72 : o.y, w: o.w || CW, h: o.h || 0.72,
    isTextBox: true, margin: 0, fontFace: F, fontSize: o.size || 31, bold: true,
    color: P.white, valign: "top", lineSpacing: o.ls || 34,
  });
}
function sub(s, text, o) {
  o = o || {};
  s.addText(text, {
    x: o.x === undefined ? M : o.x, y: o.y, w: o.w || CW, h: o.h || 0.6,
    isTextBox: true, margin: 0, fontFace: F, fontSize: o.size || 13.5,
    color: o.color || P.t2, valign: "top", lineSpacing: o.ls || 19,
  });
}
function card(s, x, y, w, h, o) {
  o = o || {};
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.07,
    fill: { color: o.fill || P.card },
    line: { color: o.line || P.rule, width: o.lw === undefined ? 0.75 : o.lw },
  });
}
function foot(s, n) {
  s.addText("Archera  ×  Automatum", {
    x: M, y: 6.94, w: 5, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9, color: P.dim, charSpacing: 1, valign: "middle",
  });
  s.addText(String(n).padStart(2, "0"), {
    x: 13.333 - M - 1.2, y: 6.94, w: 1.2, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9, color: P.dim, align: "right", valign: "middle",
  });
}
function caption(s, text, y) {
  s.addText(text, {
    x: M, y: y === undefined ? 6.62 : y, w: CW, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 8.5, color: P.dim, italic: true, valign: "top", lineSpacing: 11,
  });
}
// Small uppercase label
function label(s, text, x, y, w, color, size) {
  s.addText(text, {
    x, y, w, h: 0.22, isTextBox: true, margin: 0, fontFace: F,
    fontSize: size || 9, bold: true, charSpacing: 2, color: color || P.muted, valign: "middle",
  });
}
// Numbered chip
function chip(s, text, x, y, w, h, o) {
  o = o || {};
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: o.fill || P.indigoD }, line: { color: o.line || P.indigo, width: 0.75 },
  });
  s.addText(text, {
    x, y, w, h, isTextBox: true, margin: 0, fontFace: F, fontSize: o.size || 10.5,
    bold: true, color: o.color || P.white, align: "center", valign: "middle", charSpacing: o.cs || 0.6,
  });
}

/* ═══════════════ 01 · COVER ═══════════════ */
{
  const s = sl(P.deep);
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: P.indigo } });
  s.addText("AWS ALLIANCE ADVISORY BRIEF", {
    x: M, y: 0.72, w: 7.4, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10.5, bold: true, charSpacing: 3, color: P.tealBr, valign: "middle",
  });
  s.addText([
    { text: "Putting Archera to work\n", options: { color: P.white } },
    { text: "for Automatum", options: { color: P.indigoL } },
  ], {
    x: M, y: 1.40, w: 7.9, h: 1.7, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 40, bold: true, lineSpacing: 46, valign: "top",
  });
  sub(s, "Commitment savings attached to the 80+ ISVs Automatum already serves — on a platform that is free to introduce, installs with minimal privileges, and bills its premium through the AWS Marketplace channel Automatum already runs.",
    { y: 3.24, w: 7.5, size: 14, ls: 21, color: P.t2 });

  const chips = ["The mechanic", "80+ ISVs on AWS", "Self-funding", "Rev-share via CPPO"];
  let cx = M;
  chips.forEach((c) => {
    const w = 0.30 + c.length * 0.098;
    chip(s, c, cx, 4.72, w, 0.42, { fill: P.bg2, line: P.rule, color: P.t1, size: 11 });
    cx += w + 0.16;
  });

  const tiles = [
    ["Up to 43%", "below on-demand"],
    ["95–100%", "commitment coverage"],
    ["30-day", "commitment terms"],
    ["Zero", "platform cost"],
  ];
  tiles.forEach((t, i) => {
    const x = 8.55, y = 1.42 + i * 1.10;
    card(s, x, y, 4.16, 0.92, { fill: P.bg2, line: P.rule });
    s.addText(t[0], { x: x + 0.28, y: y + 0.14, w: 2.0, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 22, bold: true, color: P.indigoL, valign: "middle" });
    s.addText(t[1], { x: x + 0.28, y: y + 0.52, w: 3.6, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t3, valign: "middle" });
  });

  s.addText("Prepared by Only Best Practices  ·  AWS Alliance Advisory", {
    x: M, y: 6.72, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, color: P.dim, charSpacing: 0.8, valign: "middle",
  });
  s.addNotes("Positioning brief: how Automatum — a cloud-marketplace management platform serving 80+ ISVs on AWS, Azure, GCP and Red Hat — can put Archera to work. The lead motion is attach: Archera is free, it installs in minutes, and it produces savings on an AWS bill every one of Automatum's customers already pays. Secondary motions are a self-funding subscription, FTR acceleration, cover for unforecastable AI spend, and rev-share on premiums through CPPO. Prepared as an alliance-advisory artifact.");
}

/* ═══════════════ 02 · THE BIND ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART ONE  ·  THE MECHANIC");
  h1(s, "Cloud pricing is a binary.");
  sub(s, "A workload is either on demand, or committed to for at least a year. There is nothing in between — AWS does not sell it.", { y: 1.46, w: 9.6 });

  const boxes = [
    { t: "ON DEMAND", pct: "0%", d: "list price", fill: P.card, accent: P.t3,
      lines: ["Switch a machine off at 3am and you owe nothing more.", "No contract. No commitment. No planning required.", "This is where most of an ISV's bill sits today."] },
    { t: "COMMIT FOR 1 OR 3 YEARS", pct: "up to 57%", d: "off list price", fill: P.card2, accent: P.indigoL,
      lines: ["You pay for the promise whether you use it or not.", "There is no cancel button, and most cannot be resold.", "AWS sells no term shorter than one year."] },
  ];
  boxes.forEach((b, i) => {
    const x = M + i * (CW / 2 + 0.12), w = CW / 2 - 0.12;
    card(s, x, 2.24, w, 2.86, { fill: b.fill, line: P.rule });
    label(s, b.t, x + 0.34, 2.50, w - 0.6, b.accent, 9.5);
    s.addText(b.pct, { x: x + 0.34, y: 2.78, w: w - 0.6, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 34, bold: true, color: b.accent, valign: "middle" });
    s.addText(b.d, { x: x + 0.34, y: 3.40, w: w - 0.6, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t3, valign: "middle" });
    s.addText(b.lines.map((l, j) => ({ text: l, options: { breakLine: j < b.lines.length - 1 } })), {
      x: x + 0.34, y: 3.84, w: w - 0.68, h: 1.1, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12, color: P.t2, valign: "top", lineSpacing: 19,
    });
  });

  card(s, M, 5.32, CW, 1.10, { fill: P.bg2, line: P.rule });
  s.addText([
    { text: "It is the annual-plan problem.  ", options: { bold: true, color: P.white } },
    { text: "You want the discount. You cannot make the promise. So you pay month to month at full price and leave the saving on the table — every year, on the part of the bill nobody can honestly commit.", options: { color: P.t2 } },
  ], {
    x: M + 0.34, y: 5.50, w: CW - 0.68, h: 0.76, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, valign: "middle", lineSpacing: 19,
  });
  foot(s, N);
  s.addNotes("Frame the whole category in one slide. The binary is the problem: there is no product between on-demand and a one-year lock. Everything Archera does exists to fill that gap. The annual-plan analogy lands with non-technical audiences — you want the annual price, you cannot promise the year.");
}

/* ═══════════════ 03 · THE FIX ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART ONE  ·  THE MECHANIC");
  h1(s, "A Guaranteed Commitment is an RI or Savings Plan\nwith a downside hedge on top.", { size: 28, ls: 34, h: 0.9 });
  sub(s, "Archera buys the three-year commitment into the customer's own AWS account. The customer is locked in only for the term they choose — 30 days, or one year. The fee is a share of savings actually created: no savings, no fee.", { y: 1.74, w: 11.4, size: 13 });

  // liability bar
  label(s, "THE UNDERLYING THREE-YEAR COMMITMENT", M, 2.78, 6, P.muted, 9);
  const barY = 3.06, barH = 0.80, barW = CW;
  s.addShape(pres.ShapeType.roundRect, { x: M, y: barY, w: barW, h: barH, rectRadius: 0.09, fill: { color: P.card2 }, line: { color: P.rule, width: 0.75 } });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: barY, w: 2.30, h: barH, rectRadius: 0.09, fill: { color: P.indigo }, line: { color: P.indigoL, width: 0.75 } });
  s.addText([{ text: "30", options: { fontSize: 20, bold: true, breakLine: true } }, { text: "days", options: { fontSize: 11 } }], {
    x: M, y: barY, w: 2.30, h: barH, isTextBox: true, margin: 0, fontFace: F, color: P.white, align: "center", valign: "middle", lineSpacing: 20,
  });
  s.addText([
    { text: "Not the customer's liability", options: { fontSize: 15, bold: true, color: P.white, breakLine: true } },
    { text: "Release / rebate window unlocks — Archera carries the rest of the term", options: { fontSize: 11.5, color: P.t2 } },
  ], { x: M + 2.62, y: barY, w: barW - 3.0, h: barH, isTextBox: true, margin: 0, fontFace: F, valign: "middle", lineSpacing: 17 });

  label(s, "CUSTOMER'S LIABILITY", M, barY + barH + 0.08, 2.4, P.indigoL, 8.5);
  s.addText("ARCHERA'S LIABILITY", { x: M + 2.62, y: barY + barH + 0.08, w: barW - 3.0, h: 0.22, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 2, color: P.muted, valign: "middle" });
  ["DAY 0", "DAY 30", "YR 1", "YR 2", "YR 3"].forEach((t, i) => {
    const xs = [M, M + 2.30, M + 2.30 + (barW - 2.30) / 3, M + 2.30 + 2 * (barW - 2.30) / 3, M + barW];
    s.addText(t, { x: xs[i] - (i === 0 ? 0 : i === 4 ? 0.8 : 0.4), y: barY + barH + 0.34, w: 0.8, h: 0.2, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, color: i === 1 ? P.indigoL : P.dim, bold: i === 1, align: i === 0 ? "left" : i === 4 ? "right" : "center", valign: "middle" });
  });

  const steps = [
    ["1", "Archera purchases", "A long-term commitment is bought into the customer's own AWS account — in their name, not Archera's."],
    ["2", "Locked, briefly", "Only for the term they chose: 30 days or one year. AWS still bills them directly, as it always did."],
    ["3", "The customer releases", "They request it, and Archera takes on the remaining term — or rebates the spend that went unused."],
  ];
  steps.forEach((st, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 4.58;
    card(s, x, y, w, 1.72, { fill: P.card, line: P.rule });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.30, y: y + 0.24, w: 0.36, h: 0.36, fill: { color: P.indigo }, line: { color: P.indigoL, width: 0.75 } });
    s.addText(st[0], { x: x + 0.30, y: y + 0.24, w: 0.36, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, align: "center", valign: "middle" });
    s.addText(st[1], { x: x + 0.78, y: y + 0.24, w: w - 1.08, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "middle" });
    s.addText(st[2], { x: x + 0.30, y: y + 0.74, w: w - 0.60, h: 0.84, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 16 });
  });
  foot(s, N);
  s.addNotes("The key ownership point: the commitment sits in the customer's account, not Archera's. If Archera disappeared, the customer would still hold the discount. The liability bar is the whole product — the customer owns 30 days of a 36-month obligation, and Archera owns the other 35.");
}

/* ═══════════════ 04 · WHERE EACH OPTION LANDS ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART ONE  ·  THE MECHANIC");
  h1(s, "Where each option actually lands.");
  sub(s, "Percentages are savings off on-demand pricing. Both Archera terms sit on a three-year commitment underneath — which is why a 30-day term can exist at all.", { y: 1.46, w: 8.1, size: 12.5 });

  const rows = [
    ["Pay as you go", 0, "0%", "—", "—", P.dim],
    ["Archera 30-day", 28.5, "28.5%", "30 days", "Yes", P.teal],
    ["Native 1-year", 36, "36%", "1 year", "No", P.dim],
    ["Archera 1-year", 42.75, "42.75%", "1 year", "Yes", P.indigoL],
    ["Native 3-year", 57, "57%", "3 years", "No", P.muted],
  ];
  const tx = M, tw = 7.6;
  label(s, "YOUR DISCOUNT", tx, 2.40, 3.2, P.muted, 8.5);
  label(s, "LOCKED FOR", tx + 5.45, 2.40, 1.3, P.muted, 8.5);
  label(s, "EXIT?", tx + 6.78, 2.40, 1.0, P.muted, 8.5);
  s.addShape(pres.ShapeType.rect, { x: tx, y: 2.66, w: tw, h: 0.012, fill: { color: P.rule } });

  rows.forEach((r, i) => {
    const y = 2.82 + i * 0.70;
    s.addText(r[0], { x: tx, y, w: 1.85, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, bold: r[0].startsWith("Archera"), color: r[0].startsWith("Archera") ? P.white : P.t2, valign: "middle" });
    s.addShape(pres.ShapeType.rect, { x: tx + 1.95, y: y + 0.15, w: 2.15, h: 0.15, fill: { color: P.card2 }, line: { color: P.card2, width: 0.25 } });
    if (r[1] > 0) s.addShape(pres.ShapeType.rect, { x: tx + 1.95, y: y + 0.15, w: 2.15 * (r[1] / 57), h: 0.15, fill: { color: r[5] }, line: { color: r[5], width: 0.25 } });
    s.addText(r[2], { x: tx + 4.24, y, w: 1.06, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: r[5] === P.dim ? P.t2 : r[5], align: "right", valign: "middle" });
    s.addText(r[3], { x: tx + 5.45, y, w: 1.25, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t3, valign: "middle" });
    s.addText(r[4], { x: tx + 6.78, y, w: 1.05, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, bold: r[4] === "Yes", color: r[4] === "Yes" ? P.tealBr : P.t3, valign: "middle" });
  });
  s.addText("Archera keeps 50% of the saving on a 30-day term, 25% on a one-year term. No savings, no fee.", {
    x: tx, y: 6.18, w: tw, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t3, italic: true, valign: "middle",
  });

  const px = 8.60, pw = 13.333 - M - 8.60;
  label(s, "TWO PROTECTIONS, NOT ONE", px, 2.40, pw, P.muted, 8.5);
  const prot = [
    ["RELEASE GUARANTEE", "The customer leaves.", "Term as short as 30 days. Releases them from the rest of the commitment; Archera buys it back. Applies to select AWS commitments."],
    ["REBATE GUARANTEE", "They stay, and get paid back.", "Sits on a native 1- or 3-year. Reimburses net losses from what went unused — cash by ACH, not cloud credits. Broader coverage."],
  ];
  prot.forEach((p, i) => {
    const y = 2.76 + i * 1.90;
    card(s, px, y, pw, 1.72, { fill: P.card, line: P.rule });
    label(s, p[0], px + 0.28, y + 0.22, pw - 0.56, P.tealBr, 9);
    s.addText(p[1], { x: px + 0.28, y: y + 0.48, w: pw - 0.56, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "middle" });
    s.addText(p[2], { x: px + 0.28, y: y + 0.80, w: pw - 0.56, h: 0.82, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });
  caption(s, "AWS sells no commitment shorter than one year, at any price. So 28.5% sits below a native one-year's 36% — but on spend a customer genuinely cannot commit for a year, the comparison is not 36%. It is 0%.", 6.54);
  foot(s, N);
  s.addNotes("The ladder is the single most useful slide for a technical buyer. Two honest points to make out loud: Archera 1-year beats native 1-year at identical lock-in (42.75 vs 36) and adds money back on what goes unused; and the 30-day rate is only 'worse' than native 1-year if the customer could actually have signed a year — which, for the spend this is aimed at, they cannot.");
}

/* ═══════════════ 05 · THE CONSEQUENCE ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART ONE  ·  THE MECHANIC");
  h1(s, "Most of the bill never gets the discount — and the\nsmaller the company, the less of it they have captured.", { size: 27, ls: 33, h: 0.9 });

  const stats = [
    ["29%", "of cloud infrastructure spend is wasted", "Up from 27% — the first increase in five years. AI workloads made forecasting harder, not easier."],
    ["36%", "have no working commitments at all", "Zero commitments, or commitments sized so badly they return nothing."],
    ["55%", "median AWS commitment coverage", "Read from billing data across roughly $3bn of AWS compute — not from a survey."],
  ];
  stats.forEach((st, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 1.94;
    card(s, x, y, w, 2.08, { fill: P.card, line: P.rule });
    s.addText(st[0], { x: x + 0.30, y: y + 0.20, w: w - 0.60, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 36, bold: true, color: P.indigoL, valign: "middle" });
    s.addText(st[1], { x: x + 0.30, y: y + 0.82, w: w - 0.60, h: 0.46, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, bold: true, color: P.white, valign: "top", lineSpacing: 16 });
    s.addText(st[2], { x: x + 0.30, y: y + 1.30, w: w - 0.60, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t3, valign: "top", lineSpacing: 14 });
  });

  label(s, "MEDIAN SAVING CAPTURED, BY ANNUAL AWS COMPUTE SPEND", M, 4.22, 8, P.muted, 9);
  const bands = [
    ["UNDER $500K A YEAR", "0%", "Nothing. The median company here is simply paying list price.", P.amber],
    ["$500K TO $10M", "23%", "Some progress — and still less than half of what is on the table.", P.teal],
    ["OVER $10M", "38%", "A dedicated FinOps team, and it shows.", P.indigoL],
  ];
  bands.forEach((b, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 4.50;
    card(s, x, y, w, 1.24, { fill: P.bg2, line: P.rule });
    label(s, b[0], x + 0.28, y + 0.18, w - 0.56, b[3], 8.5);
    s.addText(b[1], { x: x + 0.28, y: y + 0.40, w: 1.3, h: 0.40, isTextBox: true, margin: 0, fontFace: F, fontSize: 22, bold: true, color: P.white, valign: "middle" });
    s.addText(b[2], { x: x + 1.58, y: y + 0.40, w: w - 1.86, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "middle", lineSpacing: 14 });
  });

  s.addText([
    { text: "Automatum's base sits in the bottom two bands.  ", options: { bold: true, color: P.white } },
    { text: "The median ISV under $500K of annual compute has captured nothing at all.", options: { color: P.t2 } },
  ], { x: M, y: 5.90, w: CW, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "middle" });
  caption(s, "Waste and top-challenge figures: Flexera 2026 State of the Cloud Report, 750+ cloud decision-makers. Commitment coverage and median Effective Savings Rate: ProsperOps, measured across roughly $3bn of AWS compute. Bands are compute usage, not the whole bill.", 6.30);
  foot(s, N);
  s.addNotes("This slide does the qualification work. Automatum's customers are startups, scaleups and some public companies — the bottom two bands. The median company under $500K of annual compute has captured zero. That is not a niche of the base; for a marketplace-first ISV portfolio it is most of it.");
}

/* ═══════════════ 06 · EXECUTIVE SUMMARY ═══════════════ */
{
  const s = sl(P.bg2);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "One free platform, four ways to win.");
  sub(s, "Archera is a 100%-free, multicloud commitment-management and FinOps platform. For Automatum it attaches to a base that already exists: 80+ ISVs, every one running on AWS, most carrying reservable spend that has never taken a commitment — and the premium bills through the AWS Marketplace channel Automatum already operates.",
    { y: 1.46, w: 11.6, ls: 20 });

  const wins = [
    ["01", "Attach to the base you already have", "Savings on every ISV's own AWS bill, at no tooling cost and with no re-architecting. Connecting billing is the whole project."],
    ["02", "Make the subscription self-funding", "The customer's AWS saving can cover what they pay Automatum — turning a cost line into one that argues for itself."],
    ["03", "Clear the FTR gate faster", "Automated Well-Architected Reviews, Lenses and the Foundational Technical Review, written back to the AWS Well-Architected Tool."],
    ["04", "Open a recurring revenue line", "Revenue share on insured-commitment premiums, billed through the AWS Marketplace CPPO channel Automatum already runs."],
  ];
  wins.forEach((w, i) => {
    const cwid = (CW - 0.54) / 4, x = M + i * (cwid + 0.18), y = 2.66;
    card(s, x, y, cwid, 2.98, { fill: P.card, line: i === 0 ? P.indigo : P.rule, lw: i === 0 ? 1.25 : 0.75 });
    s.addText(w[0], { x: x + 0.28, y: y + 0.24, w: 1.0, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: i === 0 ? P.indigoL : P.muted, valign: "middle", charSpacing: 1 });
    s.addText(w[1], { x: x + 0.28, y: y + 0.68, w: cwid - 0.56, h: 0.98, isTextBox: true, margin: 0, fontFace: F, fontSize: 14, bold: true, color: P.white, valign: "top", lineSpacing: 18 });
    s.addText(w[2], { x: x + 0.28, y: y + 1.72, w: cwid - 0.56, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });
  s.addText([
    { text: "The first one is the point.  ", options: { bold: true, color: P.white } },
    { text: "The other three compound on top of it — but the attach motion works on day one, on customers Automatum already bills.", options: { color: P.t2 } },
  ], { x: M, y: 5.84, w: CW, h: 0.40, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "middle" });
  foot(s, N);
  s.addNotes("Lead with attach and stay there. Everything else is upside. The reason attach is credible here and not for a typical partner: Automatum already has the billing relationship and already installs things into customer cloud accounts as part of its listing work.");
}

/* ═══════════════ 07 · WHAT ARCHERA IS ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "What Archera is.");
  sub(s, "A free procurement and commitment-management layer that helps AWS teams forecast, optimise and insure their commitments — then keep the savings.", { y: 1.46, w: 8.4 });

  const caps = [
    ["Commitment & FinOps management", "Automate RI and Savings Plan purchasing, and maximise private-pricing coverage."],
    ["Guaranteed & Insured Commitments", "Flexible, insurance-backed alternatives — commit without over-commitment risk."],
    ["Automated assessments", "WAFR / WAR, industry and technology Lenses, and the Foundational Technical Review."],
    ["Visibility & custom BI", "Blend business and cloud-cost data into drill-down dashboards and forecasts."],
  ];
  caps.forEach((c, i) => {
    const w = (8.3 - 0.18) / 2, x = M + (i % 2) * (w + 0.18), y = 2.28 + Math.floor(i / 2) * 1.62;
    card(s, x, y, w, 1.44, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.28, y: y + 0.20, w: w - 0.56, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "top", lineSpacing: 17 });
    s.addText(c[1], { x: x + 0.28, y: y + 0.78, w: w - 0.56, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15 });
  });

  const px = 9.20, pw = 13.333 - M - 9.20;
  label(s, "GUARANTEED COMMITMENTS COVER", px, 2.28, pw, P.muted, 8.5);
  const svcs = [
    ["Compute", "EC2, Lambda & Fargate"],
    ["Amazon RDS", "Managed MySQL, Postgres & SQL Server"],
    ["Amazon OpenSearch", "Search & analytics node capacity"],
    ["Amazon ElastiCache", "Managed Redis & Memcached nodes"],
    ["Amazon Redshift", "Data warehouse capacity & compute"],
    ["Amazon DynamoDB", "Reserved capacity for NoSQL at scale"],
    ["And more", "Any AWS commitment-eligible service"],
  ];
  svcs.forEach((v, i) => {
    const y = 2.58 + i * 0.475;
    card(s, px, y, pw, 0.41, { fill: i === 6 ? P.card2 : P.card, line: P.rule });
    s.addText(v[0], { x: px + 0.20, y, w: 1.45, h: 0.41, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, bold: true, color: i === 6 ? P.indigoL : P.white, valign: "middle" });
    s.addText(v[1], { x: px + 1.68, y, w: pw - 1.86, h: 0.41, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, color: P.t3, valign: "middle" });
  });

  const facts = ["The platform itself is 100% free", "Customers keep full ownership of their AWS billing", "Minimal-privilege install from AWS Marketplace", "Works across AWS, Azure and Google Cloud"];
  facts.forEach((f, i) => {
    const w = (8.3 - 0.36) / 2, x = M + (i % 2) * (w + 0.18), y = 5.62 + Math.floor(i / 2) * 0.56;
    s.addShape(pres.ShapeType.ellipse, { x, y: y + 0.15, w: 0.16, h: 0.16, fill: { color: P.tealBr }, line: { color: P.tealBr, width: 0.25 } });
    s.addText(f, { x: x + 0.30, y, w: w - 0.30, h: 0.46, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "middle" });
  });
  foot(s, N);
  s.addNotes("Two facts that de-risk the conversation for Automatum's customers: the platform is free, and the customer keeps full ownership and control of their AWS billing. Neither the account nor the commitment moves. The service list matters for ISVs — RDS, OpenSearch, ElastiCache and Redshift often carry as much reservable spend as EC2 in a SaaS estate.");
}

/* ═══════════════ 08 · WHY IT FITS AUTOMATUM ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "Why it fits Automatum.");

  const bar = [["80+", "ISVs live"], ["$120M+", "marketplace revenue"], ["2021", "operating since"], ["4", "marketplaces"], ["~14 days", "to first listing"], ["CPPO", "channel in place"]];
  bar.forEach((b, i) => {
    const w = (CW - 0.5) / 6, x = M + i * (w + 0.10), y = 1.50;
    card(s, x, y, w, 0.98, { fill: P.card2, line: P.rule });
    s.addText(b[0], { x: x + 0.16, y: y + 0.12, w: w - 0.32, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 19, bold: true, color: P.indigoL, align: "center", valign: "middle" });
    s.addText(b[1], { x: x + 0.10, y: y + 0.54, w: w - 0.20, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t3, align: "center", valign: "middle" });
  });

  const fits = [
    ["You already hold the relationship", "No new logo and no new contract vehicle. This is an offer to customers Automatum already bills every month, through a conversation that is already scheduled.", P.indigo],
    ["You already run the plumbing", "Archera's premium bills through AWS Marketplace and draws down the customer's EDP or MACC commit. Private offers, metering and CPPO resale are Automatum's core competency, not a new build.", P.teal],
    ["Your customers are the under-covered band", "Startups and scaleups sit exactly where measured commitment coverage is lowest — and where the median saving captured runs between 0% and 23%.", P.amber],
  ];
  fits.forEach((f, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 2.72;
    card(s, x, y, w, 2.80, { fill: P.card, line: P.rule });
    s.addShape(pres.ShapeType.rect, { x: x + 0.30, y: y + 0.30, w: 0.42, h: 0.05, fill: { color: f[2] } });
    s.addText(f[0], { x: x + 0.30, y: y + 0.52, w: w - 0.60, h: 0.86, isTextBox: true, margin: 0, fontFace: F, fontSize: 16, bold: true, color: P.white, valign: "top", lineSpacing: 21 });
    s.addText(f[1], { x: x + 0.30, y: y + 1.44, w: w - 0.60, h: 1.20, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  s.addText([
    { text: "The multicloud shape matches too.  ", options: { bold: true, color: P.white } },
    { text: "Automatum manages AWS, Azure, Google Cloud and Red Hat. Archera's Insured Commitments cover AWS, Azure and Google Cloud from one control plane — so the attach is not an AWS-only story once the motion is proven.", options: { color: P.t2 } },
  ], { x: M, y: 5.64, w: CW, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "top", lineSpacing: 18 });
  caption(s, "Automatum figures per the company's published positioning (automatum.io) — please confirm before this deck is circulated. Commitment-coverage figures: ProsperOps rate-optimisation benchmarks.", 6.32);
  foot(s, N);
  s.addNotes("This is the slide that separates Automatum from a generic partner pitch. The rev-share plumbing that most partners have to build from scratch is the product Automatum already sells. Do not skip the multicloud line — it sets up the expansion beyond AWS without over-promising.");
}

/* ═══════════════ 09 · THE OPPORTUNITY, SIZED ═══════════════ */
{
  const s = sl(P.bg2);
  eyebrow(s, "PART THREE  ·  THE OPPORTUNITY", P.amber);
  h1(s, "The opportunity in your base, sized.");
  sub(s, "Every assumption is on the slide. Change any one of them and the arithmetic follows — the shape of the answer does not.", { y: 1.42, w: 9.0, size: 12.5 });

  const colX = [M, 5.35, 7.75, 10.15];
  const colW = [4.55, 2.30, 2.30, 2.55];
  // highlight panel is drawn FIRST so nothing below it is obscured
  s.addShape(pres.ShapeType.roundRect, { x: colX[2] - 0.20, y: 1.96, w: colW[2] + 0.24, h: 4.18, rectRadius: 0.07, fill: { color: P.card }, line: { color: P.rule, width: 0.75 } });
  const heads = ["", "CONSERVATIVE", "BASE CASE", "OPTIMISTIC"];
  heads.forEach((h, i) => {
    if (!h) return;
    s.addText(h, { x: colX[i], y: 2.06, w: colW[i], h: 0.26, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 2, color: i === 2 ? P.indigoL : P.muted, align: "right", valign: "middle" });
  });
  s.addShape(pres.ShapeType.rect, { x: M, y: 2.36, w: CW, h: 0.012, fill: { color: P.rule } });

  const model = [
    ["ISVs running on AWS", "80", "80", "80", false],
    ["Average AWS spend per ISV", "$10K / mo", "$25K / mo", "$50K / mo", false],
    ["Aggregate annual AWS spend", "$9.6M", "$24.0M", "$48.0M", false],
    ["×  60% reservable  (compute, RDS, OpenSearch, ElastiCache, Redshift, DynamoDB)", "$5.8M", "$14.4M", "$28.8M", false],
    ["×  45% not yet covered by any commitment", "$2.6M", "$6.5M", "$13.0M", true],
    ["Net savings to the ISVs  ·  35% blended Archera rate", "$0.91M", "$2.27M", "$4.54M", true],
    ["Archera premium pool  ·  22% of addressable spend", "$0.57M", "$1.43M", "$2.85M", false],
    ["Recurring revenue to Automatum  ·  10–20% rev-share", "$57–114K", "$143–285K", "$285–570K", true],
  ];
  model.forEach((r, i) => {
    const y = 2.48 + i * 0.45;
    if (i === 4 || i === 7) s.addShape(pres.ShapeType.rect, { x: M, y: y - 0.05, w: CW, h: 0.012, fill: { color: P.rule } });
    s.addText(r[0], { x: colX[0], y, w: colW[0], h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: r[0].length > 46 ? 9.5 : 11, color: r[4] ? P.white : P.t2, bold: r[4], valign: "middle", lineSpacing: 13 });
    [1, 2, 3].forEach((c) => {
      s.addText(r[c], {
        x: colX[c], y, w: colW[c], h: 0.42, isTextBox: true, margin: 0, fontFace: F,
        fontSize: i === 7 ? 12 : 12.5, bold: c === 2 || r[4],
        color: i === 7 ? (c === 2 ? P.amber : P.t1) : (c === 2 ? P.white : P.t2),
        align: "right", valign: "middle",
      });
    });
  });
  caption(s, "Illustrative. Reservable share and the blended Archera rate are assumptions; the 45% coverage gap follows the measured 55% median AWS commitment coverage (ProsperOps). The 22% premium is the gap between the 57% a three-year creates and the 35% blended net the customer keeps. The 10–20% rev-share band is a placeholder pending terms with Archera.", 6.30);
  foot(s, N);
  s.addNotes("Do not defend the inputs — invite the audience to replace them. The point of the slide is that even the conservative column, at $10K a month of average AWS spend, produces a seven-figure savings pool for the base and a five-figure revenue line for Automatum. If Automatum can pull actual spend data for even ten accounts, the base case tightens immediately.");
}

/* ═══════════════ 10 · ONE CUSTOMER, WORKED ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART THREE  ·  THE OPPORTUNITY", P.amber);
  h1(s, "One customer, worked.");
  sub(s, "A single ISV at the base-case spend. No re-architecting and no workload migration — connecting billing is the whole project.", { y: 1.46, w: 9.4 });

  const flow = [
    ["$300K", "a year on AWS", "$25K a month — the base-case ISV.", P.t1],
    ["$180K", "reservable", "60% of the bill: compute, RDS, OpenSearch, ElastiCache, Redshift, DynamoDB.", P.t1],
    ["$81K", "not yet covered", "45% of the reservable base, at the measured median coverage. This is what Archera is for.", P.amber],
  ];
  flow.forEach((f, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 2.22;
    card(s, x, y, w, 1.50, { fill: i === 2 ? P.card2 : P.card, line: i === 2 ? P.amber : P.rule, lw: i === 2 ? 1.1 : 0.75 });
    s.addText(f[0], { x: x + 0.28, y: y + 0.18, w: w - 0.56, h: 0.50, isTextBox: true, margin: 0, fontFace: F, fontSize: 28, bold: true, color: f[3], valign: "middle" });
    s.addText(f[1], { x: x + 0.28, y: y + 0.66, w: w - 0.56, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, valign: "middle" });
    s.addText(f[2], { x: x + 0.28, y: y + 0.94, w: w - 0.56, h: 0.46, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t3, valign: "top", lineSpacing: 14 });
  });

  label(s, "WHAT COMES BACK ON THAT $81K, BY TERM", M, 3.96, 8, P.muted, 9);
  const outs = [
    ["All 30-day", "28.5%", "$23.1K", "a year", "Exit any time after 30 days.", P.teal],
    ["Blended", "35%", "$28.4K", "a year", "The realistic mix across an estate.", P.indigoL],
    ["All 1-year", "42.75%", "$34.6K", "a year", "Same lock-in as a native one-year, 6.75 points better.", P.tealBr],
  ];
  outs.forEach((o, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 4.26;
    card(s, x, y, w, 1.34, { fill: P.card, line: i === 1 ? P.indigo : P.rule, lw: i === 1 ? 1.1 : 0.75 });
    s.addText(o[0] + "  ·  " + o[1], { x: x + 0.28, y: y + 0.16, w: w - 0.56, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, bold: true, charSpacing: 0.8, color: o[5], valign: "middle" });
    s.addText([{ text: o[2], options: { fontSize: 25, bold: true, color: P.white } }, { text: "  " + o[3], options: { fontSize: 11, color: P.t3 } }], { x: x + 0.28, y: y + 0.44, w: w - 0.56, h: 0.44, isTextBox: true, margin: 0, fontFace: F, valign: "middle" });
    s.addText(o[4], { x: x + 0.28, y: y + 0.90, w: w - 0.56, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 14 });
  });

  card(s, M, 5.76, CW, 0.72, { fill: P.bg2, line: P.indigo, lw: 1.1 });
  s.addText([
    { text: "$28.4K a year back, on one mid-sized customer.  ", options: { bold: true, color: P.white } },
    { text: "Whatever that ISV pays Automatum, this is the number that now sits next to it on the renewal.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.76, w: CW - 0.68, h: 0.72, isTextBox: true, margin: 0, fontFace: F, fontSize: 13.5, valign: "middle" });
  caption(s, "Illustrative, at the base-case assumptions from the previous slide. Net of Archera's premium. Drop Automatum's own list price into the final box to close the argument in front of a customer.", 6.62);
  foot(s, N);
  s.addNotes("Deliberately left open: we do not put Automatum's price on the slide, because we do not have it and guessing it would undermine everything else. Ask them to fill it in live. If a mid-tier subscription is anywhere below roughly $28K a year, the self-funding claim on the next section is arithmetic rather than marketing.");
}

/* ═══════════════ 11 · DIVIDER ═══════════════ */
{
  const s = sl(P.deep);
  eyebrow(s, "PART FOUR  ·  THE MOTIONS", P.amber);
  s.addText("Five ways to put\nArchera to work", {
    x: M, y: 1.16, w: 5.9, h: 2.2, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 40, bold: true, color: P.white, lineSpacing: 46, valign: "top",
  });
  sub(s, "Each one stands on its own — and they compound when they are delivered together. The first is the one that works on day one.", { y: 3.06, w: 5.5, size: 13.5 });

  const five = [
    ["01", "Attach savings to every ISV you already serve", "Free install, minimal privileges, live in days."],
    ["02", "Make the Automatum subscription self-funding", "The customer's AWS bill starts paying for the programme."],
    ["03", "Clear the FTR gate faster", "Automated WAFR, Lenses and FTR at no tooling cost."],
    ["04", "Cover the spend nobody can forecast", "AI, bursty and migrating workloads, insured."],
    ["05", "Open a recurring revenue line", "Rev-share on premiums, billed via AWS Marketplace CPPO."],
  ];
  five.forEach((f, i) => {
    const x = 6.90, y = 0.88 + i * 1.18, w = 13.333 - M - 6.90;
    card(s, x, y, w, 1.06, { fill: i === 0 ? P.card2 : P.bg2, line: i === 0 ? P.indigo : P.rule, lw: i === 0 ? 1.1 : 0.75 });
    s.addText(f[0], { x: x + 0.26, y, w: 0.5, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: i === 0 ? P.indigoL : P.muted, valign: "middle" });
    s.addText(f[1], { x: x + 0.88, y: y + 0.12, w: w - 1.14, h: 0.48, isTextBox: true, margin: 0, fontFace: F, fontSize: 13.5, bold: true, color: P.white, valign: "top", lineSpacing: 18 });
    s.addText(f[2], { x: x + 0.88, y: y + 0.62, w: w - 1.14, h: 0.34, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t3, valign: "middle" });
  });
  foot(s, N);
  s.addNotes("Signpost slide. If time is short, cover 01 and 02 properly and leave 03 to 05 as a read-ahead.");
}

/* ═══════════════ 12 · UC01 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 01  ·  THE PRIMARY MOTION", P.indigoL);
  h1(s, "Attach savings to every ISV you already serve.");
  sub(s, "Nothing to build, nothing to staff, and no new commercial relationship to open. The base already exists.", { y: 1.46, w: 9.0 });

  const pts = [
    "Connect a customer's AWS account in minutes, with minimal privileges — installed from AWS Marketplace.",
    "A free savings analysis shows the coverage gap in hard numbers before anyone commits to anything.",
    "Rate optimisation only: no re-architecting, no workload migration, no change to how the ISV runs.",
    "Live in days, not weeks — which fits inside the onboarding window Automatum already promises.",
    "The platform is free. The customer pays a premium only on savings actually created.",
  ];
  pts.forEach((p, i) => {
    const y = 2.24 + i * 0.68;
    s.addShape(pres.ShapeType.ellipse, { x: M + 0.02, y: y + 0.16, w: 0.17, h: 0.17, fill: { color: P.tealBr }, line: { color: P.tealBr, width: 0.25 } });
    s.addText(p, { x: M + 0.38, y, w: 7.30, h: 0.60, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, color: P.t2, valign: "middle", lineSpacing: 17 });
  });

  const px = 8.40, pw = 13.333 - M - 8.40;
  card(s, px, 2.14, pw, 3.62, { fill: P.card, line: P.rule });
  label(s, "WHY IT MATTERS TO AUTOMATUM", px + 0.30, 2.38, pw - 0.6, P.tealBr, 9);
  const why = [
    "A value-add that can be offered to the whole base at once, not sold account by account.",
    "Every conversation opens with a number from the customer's own bill, not a pitch.",
    "Archera's reference book runs 93–100% commitment utilisation — savings get used, not idled.",
    "It gives the quarterly check-in a reason to exist beyond listing maintenance.",
  ];
  why.forEach((w, i) => {
    const y = 2.74 + i * 0.80;
    s.addText(w, { x: px + 0.30, y, w: pw - 0.60, h: 0.74, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "top", lineSpacing: 16 });
  });

  const steps = [["Connect billing", "Minimal-privilege install"], ["See the gap", "Free savings analysis"], ["Cover it", "30-day or 1-year terms"]];
  steps.forEach((st, i) => {
    const w = (7.68 - 0.36) / 3, x = M + i * (w + 0.18), y = 5.72;
    card(s, x, y, w, 0.78, { fill: P.bg2, line: P.rule });
    s.addText(st[0], { x: x + 0.22, y: y + 0.10, w: w - 0.44, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, valign: "middle" });
    s.addText(st[1], { x: x + 0.22, y: y + 0.42, w: w - 0.44, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t3, valign: "middle" });
  });
  foot(s, N);
  s.addNotes("The operational ask on Automatum here is small: an install and a report. That is the argument for starting with attach rather than with rev-share — it proves value before anyone negotiates terms.");
}

/* ═══════════════ 13 · UC02 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 02  ·  THE COMPETITIVE WEDGE", P.indigoL);
  h1(s, "Make the Automatum subscription self-funding.");
  sub(s, "Automatum already competes on price — roughly a fifth of what legacy marketplace platforms charge. Archera changes the comparison entirely: the customer's own AWS bill starts paying for the marketplace programme.", { y: 1.46, w: 11.4 });

  const pitches = [
    ["THE PITCH TODAY", "Marketplace management, at a fraction of the price of the incumbents.", "It is a good pitch, and it is still a cost line. A finance team has to approve it against everything else competing for the same budget.", P.dim, P.card],
    ["THE PITCH WITH ARCHERA", "Marketplace management that returns tens of thousands a year off the AWS bill.", "The same subscription, argued from the customer's own billing data. The question moves from “can we afford this?” to “why haven't we done this already?”", P.indigoL, P.card2],
  ];
  pitches.forEach((p, i) => {
    const w = CW / 2 - 0.12, x = M + i * (CW / 2 + 0.12), y = 2.52;
    card(s, x, y, w, 2.52, { fill: p[4], line: i === 1 ? P.indigo : P.rule, lw: i === 1 ? 1.25 : 0.75 });
    label(s, p[0], x + 0.34, y + 0.24, w - 0.68, p[3], 9);
    s.addText(p[1], { x: x + 0.34, y: y + 0.56, w: w - 0.68, h: 0.94, isTextBox: true, margin: 0, fontFace: F, fontSize: 17, bold: true, color: P.white, valign: "top", lineSpacing: 23 });
    s.addText(p[2], { x: x + 0.34, y: y + 1.56, w: w - 0.68, h: 0.82, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, color: P.t2, valign: "top", lineSpacing: 17 });
  });

  card(s, M, 5.24, CW, 1.10, { fill: P.bg2, line: P.rule });
  s.addText([
    { text: "It also changes what churn looks like.  ", options: { bold: true, color: P.white } },
    { text: "A subscription that visibly returns more than it costs is not a line item anyone hunts for in a cost-cutting review — and the savings only continue while the platform stays connected.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.40, w: CW - 0.68, h: 0.78, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "middle", lineSpacing: 19 });
  caption(s, "Pricing comparison per Automatum's published positioning against legacy marketplace platforms. Savings figures per the worked example on slide 10.");
  foot(s, N);
  s.addNotes("This is the retention argument as much as the sales one. Ask them directly: what does a renewal conversation look like when the customer can see a larger number coming back off their AWS bill than they pay you?");
}

/* ═══════════════ 14 · UC03 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 03  ·  ASSESSMENTS", P.indigoL);
  h1(s, "Clear the FTR gate faster.");
  sub(s, "The Foundational Technical Review gates ISV Accelerate and co-sell. Archera auto-populates it from the live environment and writes the results back into the native AWS Well-Architected Tool — at no tooling cost.", { y: 1.46, w: 10.6 });

  const pts = [
    ["Auto-populate from the live environment", "Connect the account and the framework fills itself in. No manual data gathering, no questionnaire chase."],
    ["Cover the whole framework", "WAFR / WAR, industry and technology Lenses, and the Foundational Technical Review itself."],
    ["Write back to the AWS tooling", "Results land in the native AWS Well-Architected Tool, where AWS expects to find them."],
    ["Keep it current", "Track best-practice adoption, flag regressions, assign remediation, and keep an audit history."],
  ];
  pts.forEach((p, i) => {
    const w = (8.10 - 0.18) / 2, x = M + (i % 2) * (w + 0.18), y = 2.34 + Math.floor(i / 2) * 1.70;
    card(s, x, y, w, 1.52, { fill: P.card, line: P.rule });
    s.addText(p[0], { x: x + 0.28, y: y + 0.18, w: w - 0.56, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "top", lineSpacing: 17 });
    s.addText(p[1], { x: x + 0.28, y: y + 0.78, w: w - 0.56, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15 });
  });

  const px = 9.00, pw = 13.333 - M - 9.00;
  card(s, px, 2.34, pw, 3.22, { fill: P.card2, line: P.indigo, lw: 1.1 });
  label(s, "WHY IT MATTERS", px + 0.30, 2.58, pw - 0.6, P.tealBr, 9);
  const why = [
    "It fits inside the ~14-day go-live rather than extending it.",
    "Completed reviews help unlock AWS credits, assessment-driven discounts and funding programmes for the ISV.",
    "One more gate Automatum clears for the customer instead of handing back with instructions.",
  ];
  why.forEach((w, i) => {
    s.addText(w, { x: px + 0.30, y: 2.96 + i * 0.82, w: pw - 0.60, h: 0.76, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "top", lineSpacing: 16 });
  });

  card(s, M, 5.72, CW, 0.92, { fill: P.bg2, line: P.rule });
  s.addText([
    { text: "Worth checking:  ", options: { bold: true, color: P.amber } },
    { text: "how many of Automatum's 80+ ISVs have a current FTR, and how many stalled on it. That number is the size of this use case, and Automatum is one of the few parties who can actually find out.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.72, w: CW - 0.68, h: 0.92, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  foot(s, N);
  s.addNotes("Do not oversell this one. Archera automates the assessment, not the remediation — the ISV still has to fix what the review finds. The value is in removing the data-gathering slog and keeping the review current, which is where most FTRs actually stall.");
}

/* ═══════════════ 15 · UC04 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 04  ·  UNFORECASTABLE SPEND", P.indigoL);
  h1(s, "Cover the spend nobody can forecast.");
  sub(s, "Automatum's base skews startup and scaleup SaaS — the segment now carrying GPU, training and inference spend that moves month to month. That is precisely the spend a native one- or three-year commitment cannot touch.", { y: 1.46, w: 11.2 });

  const cases = [
    ["Cover migrations", "Cover migrating workloads while the team is still deciding what to do with them."],
    ["Re-architect freely", "Shorter terms plus rebate protection mean nobody is tied to old infrastructure by a bad commitment."],
    ["Cover bursty demand", "Cover short-term spikes with commitments sized to the event rather than to the year."],
    ["Cover AI workloads", "AI capacity is expensive and scarce. Longer training runs at a better rate, without a three-year bet."],
  ];
  cases.forEach((c, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 2.42;
    card(s, x, y, w, 2.10, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.28, y: y + 0.24, w: w - 0.56, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    s.addText(c[1], { x: x + 0.28, y: y + 0.96, w: w - 0.56, h: 0.94, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  card(s, M, 4.82, CW, 1.16, { fill: P.card2, line: P.amber, lw: 1.1 });
  s.addText([
    { text: "On spend a customer genuinely cannot commit for a year, the alternative to 28.5% is not 36%. It is 0%.", options: { bold: true, color: P.white, breakLine: true } },
    { text: "That is the qualifying question for every account: are they buying savings they could not otherwise reach, or paying for an escape hatch they will never use?", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 4.82, w: CW - 0.68, h: 1.16, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "middle", lineSpacing: 20 });
  caption(s, "Waste rose to 29% of cloud infrastructure spend in the most recent Flexera survey — the first increase in five years, attributed to AI workloads making forecasting harder rather than easier.", 6.20);
  foot(s, N);
  s.addNotes("For an AI-heavy ISV this is usually the opening use case rather than the fourth. If the room is full of AI-native customers, promote this slide ahead of use case 03.");
}

/* ═══════════════ 16 · UC05 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 05  ·  REVENUE", P.indigoL);
  h1(s, "Open a recurring revenue line.");
  sub(s, "Two models, depending on how much of the customer relationship Automatum wants to carry.", { y: 1.46, w: 9.4 });

  const models = [
    ["REFER & CO-SELL", "Low lift, immediate participation", [
      "Automatum registers and introduces the lead.",
      "Archera runs the customer sale and the support relationship.",
      "Automatum participates in the savings the customer captures, with no delivery obligation.",
    ], P.teal, P.card],
    ["RESELL & MANAGE", "For consolidated billing and managed accounts", [
      "Insured commitments de-risk RI and Savings Plan management across the book.",
      "Premiums bill through AWS Marketplace CPPO with partner revenue share.",
      "Draws down the customer's EDP or MACC commit — the mechanic Automatum already sells.",
    ], P.indigoL, P.card2],
  ];
  models.forEach((m, i) => {
    const w = CW / 2 - 0.12, x = M + i * (CW / 2 + 0.12), y = 2.10;
    card(s, x, y, w, 3.20, { fill: m[4], line: i === 1 ? P.indigo : P.rule, lw: i === 1 ? 1.25 : 0.75 });
    label(s, m[0], x + 0.34, y + 0.24, w - 0.68, m[3], 9.5);
    s.addText(m[1], { x: x + 0.34, y: y + 0.52, w: w - 0.68, h: 0.54, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    m[2].forEach((li, j) => {
      const ly = y + 1.16 + j * 0.66;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.36, y: ly + 0.16, w: 0.15, h: 0.15, fill: { color: m[3] }, line: { color: m[3], width: 0.25 } });
      s.addText(li, { x: x + 0.68, y: ly, w: w - 1.02, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "middle", lineSpacing: 15.5 });
    });
  });

  card(s, M, 5.48, CW, 1.06, { fill: P.bg2, line: P.amber, lw: 1.0 });
  s.addText([
    { text: "Timely angle.  ", options: { bold: true, color: P.amber } },
    { text: "AWS's 2025 policy ends the sharing of Reserved Instances and Savings Plans across customers. Archera offers a compliant model plus a net-new revenue stream — directly relevant to any consolidated billing or managed accounts Automatum operates.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.48, w: CW - 0.68, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  foot(s, N);
  s.addNotes("Start at refer-and-co-sell. Resell-and-manage only makes sense if Automatum is already operating consolidated billing for some customers — worth asking directly, because the AWS 2025 policy change makes it urgent for anyone who is.");
}

/* ═══════════════ 17 · PROOF ═══════════════ */
{
  const s = sl(P.bg2);
  eyebrow(s, "PART FIVE  ·  THE EVIDENCE", P.amber);
  h1(s, "It already works at this scale.");
  sub(s, "Net realised savings — actual bill reduction after Archera's premium — measured over a recent full month from live platform data, across five enterprises on three clouds.", { y: 1.42, w: 10.6, size: 12.5 });

  const tiles = [["~$20.2M", "annualised net savings"], ["~37%", "off the reservable base"], ["93–100%", "commitment utilisation"], ["3 clouds", "AWS · Azure · GCP"]];
  tiles.forEach((t, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 2.16;
    card(s, x, y, w, 0.96, { fill: P.card, line: P.rule });
    s.addText(t[0], { x: x + 0.24, y: y + 0.10, w: w - 0.48, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 22, bold: true, color: P.indigoL, valign: "middle" });
    s.addText(t[1], { x: x + 0.24, y: y + 0.54, w: w - 0.48, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t3, valign: "middle" });
  });

  const rows = [
    ["Data infrastructure / DevOps SaaS", "AWS · Azure · GCP", "$1,098,000", "42%"],
    ["Data & analytics SaaS", "AWS", "$209,800", "28%"],
    ["Vertical-market ERP SaaS", "AWS · Azure · GCP", "$164,600", "26%"],
    ["Building-materials distribution", "Azure", "$150,000", "61%"],
    ["EHS / regulatory-compliance SaaS", "AWS · Azure", "$60,000", "20%"],
  ];
  const tw = 7.90;
  label(s, "ENTERPRISE (BY VERTICAL)", M, 3.34, 3.2, P.muted, 8.5);
  label(s, "CLOUDS", M + 3.30, 3.34, 1.8, P.muted, 8.5);
  s.addText("NET SAVINGS / MO", { x: M + 5.05, y: 3.34, w: 1.65, h: 0.22, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 2, color: P.muted, align: "right", valign: "middle" });
  s.addText("VS BASE", { x: M + 6.80, y: 3.34, w: 1.10, h: 0.22, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 2, color: P.muted, align: "right", valign: "middle" });
  s.addShape(pres.ShapeType.rect, { x: M, y: 3.60, w: tw, h: 0.012, fill: { color: P.rule } });
  rows.forEach((r, i) => {
    const y = 3.70 + i * 0.50;
    s.addText(r[0], { x: M, y, w: 3.25, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t1, valign: "middle" });
    s.addText(r[1], { x: M + 3.30, y, w: 1.70, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t3, valign: "middle" });
    s.addText(r[2], { x: M + 5.05, y, w: 1.65, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, bold: true, color: P.white, align: "right", valign: "middle" });
    s.addText(r[3], { x: M + 6.80, y, w: 1.10, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, bold: true, color: P.tealBr, align: "right", valign: "middle" });
  });

  const px = 8.90, pw = 13.333 - M - 8.90;
  card(s, px, 3.34, pw, 2.86, { fill: P.card, line: P.rule });
  s.addText("“Teams no longer have to worry about over-committing or being stuck on the wrong instance types. It's simplified our FinOps workflows tremendously.”", {
    x: px + 0.32, y: 3.62, w: pw - 0.64, h: 1.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 14, color: P.white, italic: true, valign: "top", lineSpacing: 21,
  });
  s.addText([
    { text: "Ashish Gupta", options: { bold: true, color: P.white, breakLine: true } },
    { text: "Head of AI Infrastructure, Floyo", options: { color: P.t3 } },
  ], { x: px + 0.32, y: 5.34, w: pw - 0.64, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, valign: "top", lineSpacing: 16 });

  caption(s, "Figures from Archera's customer reference pack, which is marked confidential — confirm clearance with Archera before circulating this deck outside Automatum. All savings are net of Archera's premium and achieved through rate optimisation only: no re-architecting and no workload migration. Anonymised by vertical; named enterprise references are available from Archera on request.", 6.36);
  foot(s, N);
  s.addNotes("Handle with care: the source deck is stamped confidential and do-not-distribute. The anonymised vertical-level figures are used here; the named GCP reference in that pack has been deliberately left out pending clearance. If Archera clears it, the named reference is a strong addition to this slide.");
}

/* ═══════════════ 18 · WHERE IT PLUGS IN + 90 DAYS ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART FIVE  ·  ACTIVATION", P.amber);
  h1(s, "Where it plugs in, and a 90-day plan.");

  const stages = [
    ["LIST", "Automated FTR and Well-Architected inside the go-live window."],
    ["TRANSACT", "Premiums billed through the same CPPO channel as the listing."],
    ["CO-SELL", "Savings data gives AWS sellers a reason to engage the account."],
    ["SCALE", "Ongoing visibility, regression alerts and recurring premium revenue."],
  ];
  stages.forEach((st, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 1.48;
    card(s, x, y, w, 1.10, { fill: P.card2, line: P.rule });
    label(s, st[0], x + 0.26, y + 0.18, w - 0.52, P.tealBr, 9.5);
    s.addText(st[1], { x: x + 0.26, y: y + 0.44, w: w - 0.52, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 14 });
  });
  s.addText("The same install earns its keep at every stage of the motion Automatum already runs.", {
    x: M, y: 2.68, w: CW, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, color: P.t3, italic: true, valign: "middle",
  });

  const phases = [
    ["01", "DAYS 0–30", "Stand up and pilot", ["Install Archera from AWS Marketplace on two friendly ISV accounts.", "Run the free savings analysis and baseline current commitment coverage.", "Run one automated Well-Architected Review end to end."]],
    ["02", "DAYS 30–60", "Productise", ["Package the attach offer, with the savings number as the opening line.", "Confirm the rev-share model with Archera and align it to the CPPO channel.", "Brief the account team on the talk track and the qualifying question."]],
    ["03", "DAYS 60–90", "Roll out and co-sell", ["Work the base by spend band, largest AWS bills first.", "Co-sell with AWS and Archera on qualified accounts.", "Report savings delivered, AWS funding unlocked, and new margin."]],
  ];
  phases.forEach((p, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 3.16;
    card(s, x, y, w, 3.06, { fill: P.card, line: P.rule });
    s.addText(p[0], { x: x + 0.30, y: y + 0.22, w: 0.6, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.muted, valign: "middle" });
    label(s, p[1], x + 0.92, y + 0.24, w - 1.2, P.indigoL, 9);
    s.addText(p[2], { x: x + 0.30, y: y + 0.62, w: w - 0.60, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "middle" });
    p[3].forEach((li, j) => {
      const ly = y + 1.10 + j * 0.62;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.32, y: ly + 0.15, w: 0.14, h: 0.14, fill: { color: P.tealBr }, line: { color: P.tealBr, width: 0.25 } });
      s.addText(li, { x: x + 0.62, y: ly, w: w - 0.94, h: 0.58, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "middle", lineSpacing: 15 });
    });
  });
  foot(s, N);
  s.addNotes("Keep the pilot to two accounts. The single most useful output of days 0 to 30 is a real coverage baseline across those accounts, because it replaces every assumption on the sizing slide with a measured number.");
}

/* ═══════════════ 19 · THE HONEST PART ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART FIVE  ·  THE HONEST PART", P.amber);
  h1(s, "When not to use this, and what to validate.");

  card(s, M, 1.62, CW, 1.32, { fill: P.card2, line: P.amber, lw: 1.1 });
  s.addText([
    { text: "If a workload is genuinely stable and the customer will run it for three years, they should buy the three-year commitment themselves and keep all 57%.", options: { bold: true, color: P.white, breakLine: true } },
    { text: "Archera is for the spend that genuinely cannot be committed — which, for a startup and scaleup base, is a great deal more of the bill than most teams would guess.", options: { color: P.t2 } },
  ], { x: M + 0.36, y: 1.62, w: CW - 0.72, h: 1.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 13.5, valign: "middle", lineSpacing: 21 });

  const checks = [
    ["Rebate cover is off by default", "It has to be switched on with Archera. A customer can hold release-only cover while believing they are rebate-protected."],
    ["Buybacks are not automatic", "Somebody has to file the request — and for EC2, the RI Marketplace must be enabled on the account first."],
    ["Model premium economics per account", "Pricing is transparent, but the right term depends on expected utilisation. Run the numbers before recommending one."],
    ["Data access and billing ownership", "Minimal-privilege install, and the customer keeps full ownership and control of their AWS billing. Make that explicit in every engagement."],
  ];
  checks.forEach((c, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 3.18;
    card(s, x, y, w, 2.36, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.28, y: y + 0.22, w: w - 0.56, h: 0.88, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "top", lineSpacing: 18 });
    s.addText(c[1], { x: x + 0.28, y: y + 1.14, w: w - 0.56, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  card(s, M, 5.62, CW, 0.86, { fill: P.bg2, line: P.rule });
  s.addText([
    { text: "One disclosure.  ", options: { bold: true, color: P.amber } },
    { text: "Anyone recommending this is paid on it — Archera, the partner, and us. We will still tell you when the right answer is the native three-year, because a customer who over-buys flexibility works out the maths eventually.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.62, w: CW - 0.68, h: 0.86, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  foot(s, N);
  s.addNotes("Do not skip this slide to save time. It is the one that makes the other eighteen credible, and the two operational gotchas — rebate cover being off by default, and buybacks needing a filed request — are exactly the kind of thing a partner is well placed to own on the customer's behalf.");
}

/* ═══════════════ 20 · TAKEAWAY ═══════════════ */
{
  const s = sl(P.deep);
  eyebrow(s, "THE TAKEAWAY", P.tealBr);
  s.addText([
    { text: "Turn your customers' AWS bills\n", options: { color: P.white } },
    { text: "into a reason to stay.", options: { color: P.indigoL } },
  ], { x: M, y: 1.00, w: 11.4, h: 1.7, isTextBox: true, margin: 0, fontFace: F, fontSize: 40, bold: true, lineSpacing: 47, valign: "top" });
  sub(s, "One free platform, attached to a base that already exists. It automates the reviews Automatum's ISVs need to clear, produces savings on bills they already pay, and opens a recurring revenue line through the marketplace channel Automatum already runs — with almost no cost to introduce.",
    { y: 2.86, w: 11.0, size: 14.5, ls: 22 });

  const next = [
    ["Pick two pilot ISVs", "Steady-state or AI-heavy AWS spend, and a relationship that will tolerate a first run."],
    ["Run the free savings analysis", "A measured coverage baseline, at no cost and no commitment."],
    ["Agree the rev-share", "Confirm terms with Archera and wire the premium to the CPPO channel."],
  ];
  next.forEach((n, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 4.22;
    card(s, x, y, w, 1.88, { fill: P.bg2, line: i === 0 ? P.indigo : P.rule, lw: i === 0 ? 1.25 : 0.75 });
    s.addText(String(i + 1).padStart(2, "0"), { x: x + 0.30, y: y + 0.22, w: 0.7, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: i === 0 ? P.indigoL : P.muted, charSpacing: 1, valign: "middle" });
    s.addText(n[0], { x: x + 0.30, y: y + 0.56, w: w - 0.60, h: 0.54, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    s.addText(n[1], { x: x + 0.30, y: y + 1.16, w: w - 0.60, h: 0.60, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15 });
  });

  s.addText("Prepared by Only Best Practices  ·  AWS Alliance Advisory", {
    x: M, y: 6.62, w: 8, h: 0.3, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.dim, charSpacing: 0.8, valign: "middle",
  });
  s.addText("20", { x: 13.333 - M - 1.2, y: 6.62, w: 1.2, h: 0.3, isTextBox: true, margin: 0, fontFace: F, fontSize: 9, color: P.dim, align: "right", valign: "middle" });
  s.addNotes("Close on the two-pilot ask, not on the rev-share. The rev-share is worth more over time, but the pilot is what turns every assumption in this deck into Automatum's own data — and it costs them an install and a report.");
}

const out = process.argv[2] || "Archera-for-Automatum.pptx";
pres.writeFile({ fileName: out }).then(() => console.log("wrote", out, "· slides:", N));
