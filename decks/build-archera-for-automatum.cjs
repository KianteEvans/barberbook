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
  sub(s, "Guaranteed Commitments attached to the AWS estates of the 80+ ISVs Automatum already serves — inserted through the presales motion that already runs, with the premium metered through CPPO on the rails Automatum already reconciles.",
    { y: 3.24, w: 7.5, size: 14, ls: 21, color: P.t2 });

  const chips = ["The structure", "80+ ISVs", "Presales attach", "Rev-share via CPPO"];
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
    ["Zero", "upfront cost"],
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
  s.addNotes("Positioning brief: how Automatum — a cloud-marketplace management platform serving 80+ ISVs on AWS, Azure, GCP and Red Hat — can put Archera to work. The lead motion is attach: Archera is free, it installs in minutes, and it produces savings on the AWS bills most of Automatum's customers already pay. Secondary motions are a self-funding subscription, cover for unforecastable AI spend, and rev-share on premiums through CPPO. Prepared as an alliance-advisory artifact.");
}

/* ═══════════════ 02 · ARCHERA IN ONE SLIDE ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART ONE  ·  THE STRUCTURE", P.amber);
  h1(s, "Archera, in one slide.");
  sub(s, "A native three-year RI or Savings Plan, bought into the customer's own payer account. Their obligation is 30 days or 12 months; Archera carries the balance and AWS bills them directly throughout. Archera calls these Guaranteed Commitments.", { y: 1.42, w: 11.8, size: 13 });

  // liability bar
  label(s, "THE UNDERLYING THREE-YEAR COMMITMENT", M, 2.06, 6, P.muted, 9);
  const barY = 2.32, barH = 0.64, barW = CW;
  s.addShape(pres.ShapeType.roundRect, { x: M, y: barY, w: barW, h: barH, rectRadius: 0.08, fill: { color: P.card2 }, line: { color: P.rule, width: 0.75 } });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: barY, w: 2.10, h: barH, rectRadius: 0.08, fill: { color: P.indigo }, line: { color: P.indigoL, width: 0.75 } });
  s.addText("30 days  ·  theirs", { x: M, y: barY, w: 2.10, h: barH, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, align: "center", valign: "middle" });
  s.addText([
    { text: "Archera carries months 2–36 — 30-day term shown. ", options: { bold: true, color: P.white } },
    { text: "On the 1-year, theirs through month 12.", options: { color: P.t2 } },
  ], { x: M + 2.42, y: barY, w: barW - 2.80, h: barH, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle" });
  ["DAY 0", "DAY 30", "YR 1", "YR 2", "YR 3"].forEach((t, i) => {
    const xs = [M, M + 2.10, M + 2.10 + (barW - 2.10) / 3, M + 2.10 + 2 * (barW - 2.10) / 3, M + barW];
    s.addText(t, { x: xs[i] - (i === 0 ? 0 : i === 4 ? 0.8 : 0.4), y: 3.02, w: 0.8, h: 0.20, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, color: i === 1 ? P.indigoL : P.dim, bold: i === 1, align: i === 0 ? "left" : i === 4 ? "right" : "center", valign: "middle" });
  });

  // the ladder
  const rows = [
    ["Pay as you go", 0, "0%", "—", "—", P.dim],
    ["Archera 30-day", 28.5, "28.5%", "30 days", "Yes", P.teal],
    ["Native 1-year", 36, "36%", "1 year", "No", P.dim],
    ["Archera 1-year", 42.75, "42.75%", "1 year", "Yes", P.indigoL],
    ["Native 3-year", 57, "57%", "3 years", "No", P.muted],
  ];
  const tx = M, tw = 7.60;
  label(s, "EFFECTIVE SAVINGS RATE", tx, 3.44, 3.2, P.muted, 8.5);
  label(s, "LOCKED FOR", tx + 5.45, 3.44, 1.3, P.muted, 8.5);
  label(s, "EXIT?", tx + 6.78, 3.44, 1.0, P.muted, 8.5);
  s.addShape(pres.ShapeType.rect, { x: tx, y: 3.68, w: tw, h: 0.012, fill: { color: P.rule } });
  rows.forEach((r, i) => {
    const y = 3.80 + i * 0.50;
    s.addText(r[0], { x: tx, y, w: 1.85, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: r[0].startsWith("Archera"), color: r[0].startsWith("Archera") ? P.white : P.t2, valign: "middle" });
    s.addShape(pres.ShapeType.rect, { x: tx + 1.95, y: y + 0.14, w: 2.15, h: 0.14, fill: { color: P.card2 }, line: { color: P.card2, width: 0.25 } });
    if (r[1] > 0) s.addShape(pres.ShapeType.rect, { x: tx + 1.95, y: y + 0.14, w: 2.15 * (r[1] / 57), h: 0.14, fill: { color: r[5] }, line: { color: r[5], width: 0.25 } });
    s.addText(r[2], { x: tx + 4.24, y, w: 1.06, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, bold: true, color: r[5] === P.dim ? P.t2 : r[5], align: "right", valign: "middle" });
    s.addText(r[3], { x: tx + 5.45, y, w: 1.25, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t3, valign: "middle" });
    s.addText(r[4], { x: tx + 6.78, y, w: 1.05, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, bold: r[4] === "Yes", color: r[4] === "Yes" ? P.tealBr : P.t3, valign: "middle" });
  });
  s.addText([
    { text: "Fee: ", options: { color: P.t2 } },
    { text: "50% of the created saving on the 30-day, 25% on the 1-year. No savings, no fee.", options: { bold: true, color: P.white } },
  ], { x: tx, y: 6.30, w: 7.78, h: 0.24, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, valign: "middle" });

  // the two settlement paths
  const px = 8.60, pw = 13.333 - M - 8.60;
  label(s, "TWO SETTLEMENT PATHS", px, 3.44, pw, P.muted, 8.5);
  const prot = [
    ["RELEASE GUARANTEE", "They exit.", "Archera buys the commitment back, on terms as short as 30 days. Applies to select AWS commitments — covered services on slide 4."],
    ["REBATE GUARANTEE", "They stay, and get paid back.", "Net losses on what went unused, reimbursed in cash by ACH rather than credits. Broader coverage — and off by default."],
  ];
  prot.forEach((p, i) => {
    const y = 3.72 + i * 1.44;
    card(s, px, y, pw, 1.32, { fill: P.card, line: P.rule });
    label(s, p[0], px + 0.26, y + 0.14, pw - 0.52, i === 0 ? P.tealBr : P.amber, 8.5);
    s.addText(p[1], { x: px + 0.26, y: y + 0.36, w: pw - 0.52, h: 0.26, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, bold: true, color: P.white, valign: "middle" });
    s.addText(p[2], { x: px + 0.26, y: y + 0.64, w: pw - 0.52, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "top", lineSpacing: 13.5 });
  });

  caption(s, "AWS sells no commitment shorter than one year, at any price.", 6.62);
  foot(s, N);
  s.addNotes("The only mechanic slide, and a reference sheet rather than a teaching slide. Three things to say out loud: the commitment sits in their payer account, so counterparty risk is limited to the guarantee rather than to the discount itself; Archera 1-year beats a native 1-year at identical lock-in, 42.75 against 36; and the 30-day rate is only 'worse' than a native 1-year for spend that could actually have taken a year. For a non-technical audience, the plain version is an annual subscription somebody else signs and carries for you.");
}
/* ═══════════════ 06 · EXECUTIVE SUMMARY ═══════════════ */
{
  const s = sl(P.bg2);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "One free platform, three ways to win.");
  sub(s, "Archera is a free, multicloud commitment-management platform. For Automatum it attaches to a base that already exists: 80+ ISVs, most with AWS estates — and at the measured 55% median commitment coverage, most of that spend sits uncovered (AWS share of the base to confirm). The premium bills through the AWS Marketplace channel Automatum already operates.",
    { y: 1.46, w: 11.6, ls: 20 });

  const wins = [
    ["01", "Attach through presales, to the base you already have", "The free savings analysis rides discovery, coverage lands at go-live, and the QBR gets a value agenda. No new pipeline to build."],
    ["02", "Make the subscription self-funding", "Base-case savings run ~3× the $9,999 Enterprise plan — turning a cost line into one that argues for itself."],
    ["03", "Open a recurring revenue line", "A 20–30% tiered revenue share on premiums, through the CPPO channel Automatum already runs."],
  ];
  wins.forEach((w, i) => {
    const cwid = (CW - 0.36) / 3, x = M + i * (cwid + 0.18), y = 2.66;
    card(s, x, y, cwid, 2.98, { fill: P.card, line: i === 0 ? P.indigo : P.rule, lw: i === 0 ? 1.25 : 0.75 });
    s.addText(w[0], { x: x + 0.28, y: y + 0.24, w: 1.0, h: 0.36, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: i === 0 ? P.indigoL : P.muted, valign: "middle", charSpacing: 1 });
    s.addText(w[1], { x: x + 0.28, y: y + 0.68, w: cwid - 0.56, h: 0.98, isTextBox: true, margin: 0, fontFace: F, fontSize: 14, bold: true, color: P.white, valign: "top", lineSpacing: 18 });
    s.addText(w[2], { x: x + 0.28, y: y + 1.72, w: cwid - 0.56, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });
  s.addText([
    { text: "The first one is the point. ", options: { bold: true, color: P.white } },
    { text: "The other two compound on top of it — the motions that follow run the attach through presales and across the base. One clock to respect: rev-share counts only entities net-new to Archera.", options: { color: P.t2 } },
  ], { x: M, y: 5.84, w: CW, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "top", lineSpacing: 19 });
  foot(s, N);
  s.addNotes("Lead with attach and stay there — everything else is upside. The reason attach is credible here and not for a typical partner: Automatum already holds the billing relationship, already connects to customer accounts as part of listing work, and already reconciles the marketplace rails the premium bills over.");
}

/* ═══════════════ 07 · WHAT ARCHERA IS ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "What Archera is.");
  sub(s, "A free procurement and commitment-management layer that helps AWS teams forecast, optimise and insure their commitments — then keep the savings.", { y: 1.46, w: 8.4 });

  const caps = [
    ["Commitment & FinOps management", "Automate RI and Savings Plan purchasing, and maximise private-pricing coverage."],
    ["Guaranteed Commitments", "Contractual, reinsurance-backed alternatives to native terms — commit without over-commitment risk."],
    ["Visibility & custom BI", "Blend business and cloud-cost data into drill-down dashboards and forecasts."],
  ];
  caps.forEach((c, i) => {
    const w = 8.3, x = M, y = 2.28 + i * 1.10;
    card(s, x, y, w, 0.96, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.30, y, w: 2.85, h: 0.96, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "middle", lineSpacing: 17 });
    s.addText(c[1], { x: x + 3.30, y, w: w - 3.60, h: 0.96, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "middle", lineSpacing: 15 });
  });

  const px = 9.20, pw = 13.333 - M - 9.20;
  label(s, "COVERAGE, BY EXIT PATH", px, 2.28, pw, P.muted, 8.5);
  card(s, px, 2.56, pw, 1.32, { fill: P.card, line: P.rule });
  label(s, "RELEASE PATH · RESALE EXISTS", px + 0.24, 2.74, pw - 0.48, P.tealBr, 8.5);
  s.addText("EC2 Standard RIs — resellable on the RI Marketplace, which must be enabled on the account before a buyback can execute.", {
    x: px + 0.24, y: 2.98, w: pw - 0.48, h: 0.84, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "top", lineSpacing: 14 });
  card(s, px, 4.02, pw, 1.78, { fill: P.card, line: P.rule });
  label(s, "REBATE PATH · NO RESALE", px + 0.24, 4.20, pw - 0.48, P.amber, 8.5);
  s.addText("Compute Savings Plans (EC2, Lambda, Fargate) and the reserved instances, nodes and capacity behind RDS, ElastiCache, OpenSearch, Redshift and DynamoDB. No resale route — the rebate guarantee covers them, off by default.", {
    x: px + 0.24, y: 4.44, w: pw - 0.48, h: 1.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "top", lineSpacing: 14 });
  s.addText("This split is why the release guarantee applies to select commitments while the rebate guarantee is the broader of the two. Mapping inferred from AWS resale rules — confirm the covered list with Archera.", {
    x: px, y: 5.94, w: pw, h: 0.90, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, italic: true, color: P.t3, valign: "top", lineSpacing: 13 });

  const facts = ["The platform itself is 100% free", "Customers keep full ownership of their AWS billing", "Minimal-privilege install from AWS Marketplace", "Works across AWS, Azure and Google Cloud"];
  facts.forEach((f, i) => {
    const w = (8.3 - 0.36) / 2, x = M + (i % 2) * (w + 0.18), y = 5.62 + Math.floor(i / 2) * 0.56;
    s.addShape(pres.ShapeType.ellipse, { x, y: y + 0.15, w: 0.16, h: 0.16, fill: { color: P.tealBr }, line: { color: P.tealBr, width: 0.25 } });
    s.addText(f, { x: x + 0.30, y, w: w - 0.30, h: 0.46, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "middle" });
  });
  foot(s, N);
  s.addNotes("The exit-path split is the expert detail on this slide: only EC2 Standard RIs have a resale route (the RI Marketplace, which must be enabled), so everything else — Savings Plans included — settles through the rebate guarantee. That answers the obvious objection that Savings Plans cannot be resold. Also worth saying: RDS, OpenSearch, ElastiCache and Redshift often carry as much reservable spend as EC2 in a SaaS estate.");
}

/* ═══════════════ 08 · WHY IT FITS AUTOMATUM ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART TWO  ·  THE CASE", P.amber);
  h1(s, "Why it fits Automatum.");

  const bar = [["80+", "ISVs live"], ["$120M+", "marketplace GMV"], ["2021", "operating since"], ["4", "marketplaces"], ["5–7 days", "average listing"], ["CPPO", "channel in place"]];
  bar.forEach((b, i) => {
    const w = (CW - 0.5) / 6, x = M + i * (w + 0.10), y = 1.50;
    card(s, x, y, w, 0.98, { fill: P.card2, line: P.rule });
    s.addText(b[0], { x: x + 0.16, y: y + 0.12, w: w - 0.32, h: 0.42, isTextBox: true, margin: 0, fontFace: F, fontSize: 19, bold: true, color: P.indigoL, align: "center", valign: "middle" });
    s.addText(b[1], { x: x + 0.10, y: y + 0.54, w: w - 0.20, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t3, align: "center", valign: "middle" });
  });

  const fits = [
    ["You already hold the relationship", "No new logo and no new contract vehicle. This is an offer to customers Automatum already bills every month, through a conversation that is already scheduled.", P.indigo],
    ["You already run the plumbing", "Archera's premium bills through AWS Marketplace and draws down the customer's EDP commit. Private offers, metering and CPPO resale are Automatum's core competency, not a new build.", P.teal],
    ["Your customers are the under-covered band", "Startups and scaleups sit where measured savings capture is lowest — a skew to confirm from account data. The sequencing slide turns those bands into the sales map.", P.amber],
  ];
  fits.forEach((f, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 2.72;
    card(s, x, y, w, 2.64, { fill: P.card, line: P.rule });
    s.addShape(pres.ShapeType.rect, { x: x + 0.30, y: y + 0.30, w: 0.42, h: 0.05, fill: { color: f[2] } });
    s.addText(f[0], { x: x + 0.30, y: y + 0.50, w: w - 0.60, h: 0.78, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 19 });
    s.addText(f[1], { x: x + 0.30, y: y + 1.34, w: w - 0.60, h: 1.20, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  s.addText([
    { text: "The multicloud shape matches too — ", options: { bold: true, color: P.white } },
    { text: "the same guarantee structure covers AWS, Azure and Google Cloud from one control plane.", options: { color: P.t2 } },
  ], { x: M, y: 5.56, w: CW, h: 0.26, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, valign: "middle" });
  caption(s, "Listing stats and plan pricing per Automatum's own materials; $120M+ GMV, 2021 and the four-marketplace count per published positioning — confirm those before circulation.", 6.10);
  foot(s, N);
  s.addNotes("This is the slide that separates Automatum from a generic partner pitch: the rev-share plumbing most partners would have to build is the product Automatum already sells. The base includes enterprise names — CBRE, Knight Frank, Deel, ELMO, Subex, Tanda, Energy Exemplar, SettleMint — not just startups, which strengthens the mid- and upper-band sizing. The evidence line to speak to: ProsperOps measures the median company under $500K of annual compute as having captured nothing — and that is most of an ISV base. The sequencing slide carries the full bands.");
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
    ["Net savings to the ISVs  ·  35% blended net rate", "$0.91M", "$2.27M", "$4.54M", true],
    ["Archera premium pool  ·  22% of addressable spend", "$0.57M", "$1.43M", "$2.85M", false],
    ["Recurring revenue to Automatum  ·  20–30% tiered rev-share", "$114–171K", "$285–428K", "$570–855K", true],
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
  caption(s, "Illustrative. Reservable share and the blended Archera rate are assumptions; the 45% coverage gap follows the measured 55% median AWS commitment coverage (ProsperOps). The 22% premium is the gap between the 57% a three-year creates and the 35% blended net the customer keeps. Rev-share 20–30% per the distributor agreement's Co-Seller tiers, laddered on the revenue-line slide — the base case's ~$119K premium MRR lands in Silver (25%).", 6.30);
  foot(s, N);
  s.addNotes("Do not defend the inputs — invite the audience to replace them. The point of the slide is that even the conservative column, at $10K a month of average AWS spend, produces a high-six-figure savings pool for the base (seven figures in the base case) and a six-figure revenue line for Automatum at the agreement's 20-30% tiers. If Automatum can pull actual spend data for even ten accounts, the base case tightens immediately.");
}

/* ═══════════════ 10 · ONE CUSTOMER, WORKED ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART THREE  ·  THE OPPORTUNITY", P.amber);
  h1(s, "One customer, worked.");
  sub(s, "A single ISV at the base-case spend. No re-architecting and no workload migration — connecting billing is the whole project.", { y: 1.46, w: 9.4 });

  const flow = [
    ["$300K", "a year on AWS", "$25K a month — the base-case ISV.", P.t1],
    ["$180K", "reservable", "60% of the bill: compute plus RDS, OpenSearch, ElastiCache, Redshift, DynamoDB.", P.t1],
    ["$81K", "not yet covered", "45% of the reservable base, at the measured median coverage. This is what Archera is for.", P.amber],
  ];
  flow.forEach((f, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 2.22;
    card(s, x, y, w, 1.64, { fill: i === 2 ? P.card2 : P.card, line: i === 2 ? P.amber : P.rule, lw: i === 2 ? 1.1 : 0.75 });
    s.addText(f[0], { x: x + 0.28, y: y + 0.18, w: w - 0.56, h: 0.50, isTextBox: true, margin: 0, fontFace: F, fontSize: 28, bold: true, color: f[3], valign: "middle" });
    s.addText(f[1], { x: x + 0.28, y: y + 0.66, w: w - 0.56, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, valign: "middle" });
    s.addText(f[2], { x: x + 0.28, y: y + 0.94, w: w - 0.56, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t3, valign: "top", lineSpacing: 14 });
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

  card(s, M, 5.66, CW, 0.92, { fill: P.bg2, line: P.indigo, lw: 1.1 });
  s.addText([
    { text: "$28.4K a year back — nearly three times the $9,999 Enterprise plan. ", options: { bold: true, color: P.white } },
    { text: "The pitch flips from “marketplace management at a fraction of the incumbents' price” to “marketplace management the AWS bill pays for” — and a subscription that visibly returns more than it costs is not a line anyone hunts in a cost-cutting review.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.66, w: CW - 0.68, h: 0.92, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  caption(s, "Illustrative, at the base-case assumptions from the previous slide, net of Archera's premium. At the 35% blended net rate, savings cover the $1,199 Startup plan from ~$1.1K a month of AWS spend, the $3,999 Scale-up from ~$3.5K, and the $9,999 Enterprise from ~$9K. Plan prices per Automatum's published list.", 6.64);
  foot(s, N);
  s.addNotes("The self-funding claim is now arithmetic against Automatum's own list prices ($1,199 / $3,999 / $9,999 a year): the base-case ISV's savings run 2.8x the Enterprise plan, and the thresholds in the caption show even Startup-plan customers self-fund from about $1.1K a month of AWS spend. Caveat to say out loud: list prices — negotiated or legacy pricing may differ. This is also the retention argument: ask what a renewal conversation looks like when the customer sees a larger number coming back off their AWS bill than they pay Automatum.");
}

/* ═══════════════ NEW · PRESALES MOTION ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 01  ·  PRESALES", P.indigoL);
  h1(s, "Where Archera enters your presales motion.");
  sub(s, "No new pipeline and no new meeting. Each stage Automatum already runs gets one insertion point — mapped here against the published motion; swap in your internal stage names.", { y: 1.46, w: 10.8 });

  const stages = [
    ["DISCOVERY", "A discovery artefact, not a pitch", "Ask for read-only billing access in the scoping conversation that already happens. Coverage and Effective Savings Rate numbers come back inside the week — and earn a seat with the ISV's finance owner, not just product."],
    ["LISTING BUILD", "Coverage designed while the listing is built", "The savings analysis becomes a term plan — 30-day or 1-year, workload by workload — while Automatum builds the listing, ready to execute at go-live. No second ask of the customer."],
    ["GO-LIVE", "Coverage lands before marketplace revenue ramps", "The saving shows up on the ISV's AWS bill from the first covered month — offsetting the Automatum fee while the listing is still ramping."],
    ["OFFERS & CO-SELL", "A number the AWS seller can act on", "A savings number from the customer's own bill gives the AWS account team a concrete reason to engage — and strengthens the co-sell narrative on the listing side too."],
    ["QBR", "From maintenance check-in to value review", "Coverage drift, utilisation and savings-to-date give the quarterly conversation an agenda beyond listing upkeep — and set up the renewal."],
  ];
  stages.forEach((st, i) => {
    const y = 2.22 + i * 0.82;
    card(s, M, y, CW, 0.72, { fill: i === 0 ? P.card2 : P.card, line: i === 0 ? P.indigo : P.rule, lw: i === 0 ? 1.1 : 0.75 });
    label(s, st[0], M + 0.28, y + 0.10, 2.30, i === 0 ? P.indigoL : P.muted, 8.5);
    s.addText(st[1], { x: M + 0.28, y: y + 0.30, w: 3.55, h: 0.38, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, bold: true, color: P.white, valign: "middle", lineSpacing: 13.5 });
    s.addText(st[2], { x: M + 4.05, y: y + 0.06, w: CW - 4.35, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "middle", lineSpacing: 13.5 });
  });

  s.addText([
    { text: "Who does what: ", options: { bold: true, color: P.white } },
    { text: "Automatum runs the connect and the analysis; Archera builds and manages the commitments; the ISV signs one private offer.", options: { color: P.t2 } },
  ], { x: M, y: 6.42, w: CW, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, valign: "middle" });
  foot(s, N);
  s.addNotes("The operational claim of the whole deck: this fits inside conversations that are already on the calendar. The discovery row is the one to dwell on — a read-only billing connection granted during scoping produces the number every later stage runs on. Stage names here follow Automatum's published motion; confirm the real internal names before presenting.");
}
/* ═══════════════ NEW · WORKING THE 80+ ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 01  ·  THE INSTALLED BASE", P.indigoL);
  h1(s, "Working the 80+: sequence by spend, not tenure.", { size: 27 });
  sub(s, "Median saving already captured, by annual AWS compute usage — the bands say where to start and what to lead with.", { y: 1.46, w: 9.6 });

  const bands = [
    ["UNDER $500K", "0%", "captured", "Most of the base. Smallest per account, fastest to close — nobody there has a FinOps function, and the median company is simply paying list.", "Batch the motion: standard analysis, standard offer.", P.amber],
    ["$500K–$10M", "23%", "captured", "The sweet spot: enough spend for the number to matter, no dedicated FinOps team to defend the status quo.", "Start here. Two pilots prove the motion on real numbers.", P.teal],
    ["OVER $10M", "38%", "captured", "Few accounts, biggest absolute savings, hardest sell — they have FinOps and will interrogate every term.", "Go last, armed with your own pilot data.", P.indigoL],
  ];
  bands.forEach((b, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 2.22;
    card(s, x, y, w, 2.52, { fill: i === 1 ? P.card2 : P.card, line: i === 1 ? P.teal : P.rule, lw: i === 1 ? 1.2 : 0.75 });
    label(s, b[0], x + 0.28, y + 0.20, w - 0.56, b[5], 9);
    s.addText([{ text: b[1], options: { fontSize: 24, bold: true, color: P.white } }, { text: "  " + b[2], options: { fontSize: 10.5, color: P.t3 } }], { x: x + 0.28, y: y + 0.42, w: w - 0.56, h: 0.44, isTextBox: true, margin: 0, fontFace: F, valign: "middle" });
    s.addText(b[3], { x: x + 0.28, y: y + 0.92, w: w - 0.56, h: 0.94, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 14.5 });
    s.addText(b[4], { x: x + 0.28, y: y + 1.98, w: w - 0.56, h: 0.44, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, bold: true, color: b[5], valign: "top", lineSpacing: 14 });
  });

  label(s, "THREE PLAYS, BY ACCOUNT STATE", M, 4.90, 6, P.muted, 9);
  const plays = [
    ["Live and stable", "Insert at the next QBR. Open with the account's own coverage number, not a product."],
    ["In onboarding", "Connect during the listing build — the analysis rides the access the build already needs."],
    ["AI / GPU-heavy", "Lead with forecast variance, not the discount — too volatile to commit for a year, let alone three."],
  ];
  plays.forEach((p, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 5.16;
    card(s, x, y, w, 1.08, { fill: P.bg2, line: P.rule });
    s.addText(p[0], { x: x + 0.26, y: y + 0.12, w: w - 0.52, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, bold: true, color: P.white, valign: "middle" });
    s.addText(p[1], { x: x + 0.26, y: y + 0.40, w: w - 0.52, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 14 });
  });
  caption(s, "Instrument the motion like marketplace revenue: accounts connected, coverage baseline, savings realised, premium billed, rev-share accrued. The constraint is calendar time, not lead generation — every account is already a customer, and at list prices any ISV spending ~$9K+ a month on AWS covers the Enterprise plan from savings alone. Bands: ProsperOps median ESR by annual AWS compute usage.", 6.36);
  foot(s, N);
  s.addNotes("The argument for starting mid-band: the sub-$500K band is bigger but each win is small, and the $10M+ band is where a botched first conversation is most expensive. Two mid-band pilots produce the numbers that make both other bands easier. The three plays keep the motion from being one-size-fits-all without turning it into bespoke consulting.");
}
/* ═══════════════ 15 · UC04 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 02  ·  UNFORECASTABLE SPEND", P.indigoL);
  h1(s, "Cover the spend nobody can forecast.");
  sub(s, "Automatum's base skews startup and scaleup SaaS — the segment carrying GPU, training and inference spend with month-to-month variance no one- or three-year term can absorb. Committing it natively means betting a fixed term against a forecast nobody stands behind.", { y: 1.46, w: 11.2 });

  const cases = [
    ["Cover migrations", "Carry workloads mid-move while the team decides what stays."],
    ["Re-architect freely", "Shorter terms plus the release guarantee mean nobody is tied to old infrastructure by a bad commitment."],
    ["Cover bursty demand", "Commitments sized to the event rather than to the year."],
    ["Cover AI workloads", "Training and inference at committed rates, sized to the run — no multi-year bet on a moving baseline."],
  ];
  cases.forEach((c, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 2.42;
    card(s, x, y, w, 2.20, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.28, y: y + 0.24, w: w - 0.56, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    s.addText(c[1], { x: x + 0.28, y: y + 0.96, w: w - 0.56, h: 1.04, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  card(s, M, 4.82, CW, 1.16, { fill: P.card2, line: P.amber, lw: 1.1 });
  s.addText([
    { text: "On spend a customer genuinely cannot commit for a year, the alternative to 28.5% is not 36%. It is 0%.", options: { bold: true, color: P.white, breakLine: true } },
    { text: "That is the qualifying question for every account: are they buying savings they could not otherwise reach, or paying for an escape hatch they will never use?", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 4.82, w: CW - 0.68, h: 1.16, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, valign: "middle", lineSpacing: 20 });
  caption(s, "Waste rose to 29% of cloud infrastructure spend in Flexera's 2026 State of the Cloud survey — the first increase in five years, attributed to AI workloads. Base-composition skew is a working assumption; confirm from account data.", 6.20);
  foot(s, N);
  s.addNotes("For an AI-heavy ISV this is usually the opening use case rather than the second — if the room is full of AI-native customers, lead with it.");
}

/* ═══════════════ 16 · UC05 ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 03  ·  REVENUE", P.indigoL);
  h1(s, "Open a recurring revenue line.");
  sub(s, "The distributor agreement offers two postures — and the recurring revenue line this deck argues for requires the second.", { y: 1.46, w: 9.8 });

  // left: referral card
  {
    const w = CW / 2 - 0.12, x = M, y = 2.10;
    card(s, x, y, w, 3.20, { fill: P.card, line: P.rule });
    label(s, "REFERRAL TIER", x + 0.34, y + 0.24, w - 0.68, P.teal, 9.5);
    s.addText("A one-time bonus, not a revenue line", { x: x + 0.34, y: y + 0.52, w: w - 0.68, h: 0.34, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    ["Automatum registers the lead; Archera runs the sale, onboarding and support.",
     "Pays a one-off bonus of the first month's MRR — nothing recurring.",
     "Fine for the odd out-of-scope account. It is not the line this deck argues for."].forEach((li, j) => {
      const ly = y + 1.16 + j * 0.66;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.36, y: ly + 0.16, w: 0.15, h: 0.15, fill: { color: P.teal }, line: { color: P.teal, width: 0.25 } });
      s.addText(li, { x: x + 0.68, y: ly, w: w - 1.02, h: 0.56, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, color: P.t2, valign: "middle", lineSpacing: 15.5 });
    });
  }
  // right: co-seller tier ladder
  {
    const w = CW / 2 - 0.12, x = M + CW / 2 + 0.12, y = 2.10;
    card(s, x, y, w, 3.20, { fill: P.card2, line: P.indigo, lw: 1.25 });
    label(s, "CO-SELLER TIER", x + 0.34, y + 0.24, w - 0.68, P.indigoL, 9.5);
    s.addText("20–30% recurring, rising with the book", { x: x + 0.34, y: y + 0.52, w: w - 0.68, h: 0.34, isTextBox: true, margin: 0, fontFace: F, fontSize: 15, bold: true, color: P.white, valign: "top", lineSpacing: 20 });
    const tiers = [
      ["BRONZE", "20%", "under $100K MRR", "conservative ~$48K MRR"],
      ["SILVER", "25%", "under $500K", "base ~$119K · optimistic ~$238K"],
      ["GOLD", "30%", "$1M+ MRR", "a multi-year ambition"],
    ];
    tiers.forEach((t, j) => {
      const ty = y + 1.02 + j * 0.60;
      s.addShape(pres.ShapeType.roundRect, { x: x + 0.34, y: ty, w: w - 0.68, h: 0.50, rectRadius: 0.06, fill: { color: j === 1 ? P.indigo : P.bg2 }, line: { color: j === 1 ? P.indigoL : P.rule, width: j === 1 ? 1.0 : 0.75 } });
      s.addText([
        { text: t[0] + "  " + t[1], options: { bold: true, fontSize: 11.5, color: P.white } },
        { text: "   " + t[2], options: { fontSize: 9.5, color: j === 1 ? P.t1 : P.t3 } },
      ], { x: x + 0.52, y: ty, w: w - 1.04, h: 0.50, isTextBox: true, margin: 0, fontFace: F, valign: "middle" });
      s.addText(t[3], { x: x + 0.52, y: ty, w: w - 1.22, h: 0.50, isTextBox: true, margin: 0, fontFace: F, fontSize: 8.5, italic: true, color: j === 1 ? P.t1 : P.muted, align: "right", valign: "middle" });
    });
    s.addText("Automatum runs the motion with joint GTM support; Archera provides Tier-2 support.", { x: x + 0.34, y: y + 2.86, w: w - 0.68, h: 0.28, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "middle" });
  }

  caption(s, "Tier bands measured on commitment MRR — Archera's GRI/GSP (Guaranteed RI and Savings Plan) revenue across the partner's book. Scenario placements per the slide 6 model (premium pool ÷ 12).", 6.66);
  card(s, M, 5.48, CW, 1.06, { fill: P.bg2, line: P.amber, lw: 1.0 });
  s.addText([
    { text: "Timely angle. ", options: { bold: true, color: P.amber } },
    { text: "AWS's 2025 policy ends the sharing of Reserved Instances and Savings Plans across customers. Archera offers a compliant model plus a net-new revenue stream — directly relevant to any consolidated-billing or managed accounts Automatum operates.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.48, w: CW - 0.68, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  foot(s, N);
  s.addNotes("Frame this as a per-account choice, not a one-time fork: refer on the accounts where Automatum wants no delivery role, resell where it already operates consolidated billing or wants the structural margin. The AWS 2025 policy ending cross-customer RI/SP sharing makes the resell question urgent for anyone running consolidated billing today.");
}

/* ═══════════════ NEW · HOW THE MONEY MOVES ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "USE CASE 03  ·  THE RAILS", P.indigoL);
  h1(s, "How the money moves.");
  sub(s, "The premium is metered, marketplace-billed, and channel-shared — the same rails Automatum already reconciles.", { y: 1.46, w: 9.6 });

  const steps = [
    ["1", "Archera's Marketplace listing", "The SaaS listing the private offer is issued against."],
    ["2", "CPPO, Automatum as channel partner", "The offer carries Automatum's margin as the channel partner of record."],
    ["3", "ISV accepts on their own account", "One click on the private offer; onboarded via the Archera Partner Portal."],
    ["4", "Premium meters monthly on savings realised", "Variable, not a flat subscription — the no-savings-no-fee mechanic, metered."],
    ["5", "Billed on the AWS invoice · draws down EDP", "AWS disburses; Automatum's share arrives through its existing disbursement channel."],
  ];
  steps.forEach((st, i) => {
    const y = 2.22 + i * 0.70;
    card(s, M, y, 7.55, 0.60, { fill: P.card, line: P.rule });
    s.addShape(pres.ShapeType.ellipse, { x: M + 0.20, y: y + 0.14, w: 0.32, h: 0.32, fill: { color: P.indigo }, line: { color: P.indigoL, width: 0.75 } });
    s.addText(st[0], { x: M + 0.20, y: y + 0.14, w: 0.32, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, bold: true, color: P.white, align: "center", valign: "middle" });
    s.addText(st[1], { x: M + 0.68, y: y + 0.06, w: 3.55, h: 0.48, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, bold: true, color: P.white, valign: "middle", lineSpacing: 13 });
    s.addText(st[2], { x: M + 4.30, y: y + 0.06, w: 3.05, h: 0.48, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, color: P.t2, valign: "middle", lineSpacing: 12.5 });
  });

  const px = 8.45, pw = 13.333 - M - 8.45;
  card(s, px, 2.22, pw, 1.72, { fill: P.card2, line: P.indigo, lw: 1.1 });
  label(s, "WHAT AUTOMATUM STANDS UP", px + 0.26, 2.42, pw - 0.52, P.tealBr, 8.5);
  s.addText("Channel-partner registration against Archera's listing, an offer template, and metering reconciliation in the existing rhythm. No new billing system.", {
    x: px + 0.26, y: 2.68, w: pw - 0.52, h: 1.16, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 15,
  });
  card(s, px, 4.10, pw, 1.52, { fill: P.card, line: P.rule });
  label(s, "THE TERMS, PER THE AGREEMENT", px + 0.26, 4.28, pw - 0.52, P.amber, 8.5);
  s.addText("20–30% tiered rev-share on marketplace net revenue, paid monthly and reported in the Partner Portal. Rev-share applies to net-new entities only — Archera checks each against its existing book. Still open: execution, the starting tier, and the joint GTM plan.", {
    x: px + 0.26, y: 4.52, w: pw - 0.52, h: 1.04, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, color: P.t2, valign: "top", lineSpacing: 13.5,
  });

  card(s, M, 5.80, CW, 0.66, { fill: P.bg2, line: P.amber, lw: 1.0 });
  s.addText([
    { text: "Rev-share counts net-new Archera customers only. ", options: { bold: true, color: P.amber } },
    { text: "Every ISV Archera signs directly first is permanently off Automatum's rev-share — the strongest argument for moving first. For the ISV, the charge is simply marketplace spend on the AWS invoice.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.80, w: CW - 0.68, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, valign: "middle", lineSpacing: 17 });
  caption(s, "Terms per Archera's Distributor Partner Agreement template (Appendix A) — unsigned, so everything here is subject to execution. Azure and GCP channel private offers are approved routes under the same agreement.", 6.56);
  foot(s, N);
  s.addNotes("The point of this slide is that the plumbing is Automatum's home turf — CPPO, private offers, metering, disbursement reconciliation are the product they already operate. The terms panel now reflects the distributor agreement template: 20/25/30 tiers on marketplace net revenue, monthly, via the Partner Portal — and rev-share applies to net-new Archera customers only, which makes moving before Archera sells into the base directly worth real money. Still open: execution, starting tier, joint GTM plan.");
}
/* ═══════════════ 17 · PROOF ═══════════════ */
{
  const s = sl(P.bg2);
  eyebrow(s, "PART FOUR  ·  THE RECKONING", P.amber);
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
  s.addText("“Teams no longer have to worry about over-committing or being stuck on the wrong instance types. It’s simplified our FinOps workflows tremendously.”", {
    x: px + 0.32, y: 3.62, w: pw - 0.64, h: 1.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 14, color: P.white, italic: true, valign: "top", lineSpacing: 21,
  });
  s.addText([
    { text: "Ashish Gupta", options: { bold: true, color: P.white, breakLine: true } },
    { text: "Head of AI Infrastructure, Floyo", options: { color: P.t3 } },
  ], { x: px + 0.32, y: 5.34, w: pw - 0.64, h: 0.66, isTextBox: true, margin: 0, fontFace: F, fontSize: 11.5, valign: "top", lineSpacing: 16 });

  caption(s, "Figures from Archera's customer reference pack, which is marked confidential — confirm clearance with Archera before circulating this deck outside Automatum. All savings are net of Archera's premium and achieved through rate optimisation only: no re-architecting and no workload migration. Anonymised by vertical; a named reference exists in Archera's pack, pending clearance. Quote from Archera's published materials — separate from the five anonymised enterprises.", 6.36);
  foot(s, N);
  s.addNotes("Handle with care: the source deck is stamped confidential and do-not-distribute. The anonymised vertical-level figures are used here; the named GCP reference in that pack has been deliberately left out pending clearance. If Archera clears it, the named reference is a strong addition to this slide.");
}

/* ═══════════════ 18 · WHERE IT PLUGS IN + 90 DAYS ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART FOUR  ·  THE RECKONING", P.amber);
  h1(s, "Where it plugs in, and a 90-day plan.");

  const stages = [
    ["LIST", "The savings analysis runs during the listing build — coverage ready at go-live."],
    ["TRANSACT", "Premiums billed through the same CPPO channel as the listing."],
    ["CO-SELL", "Savings data gives AWS sellers a reason to engage the account."],
    ["SCALE", "Ongoing visibility, regression alerts and recurring premium revenue."],
  ];
  stages.forEach((st, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 1.48;
    card(s, x, y, w, 1.22, { fill: P.card2, line: P.rule });
    label(s, st[0], x + 0.26, y + 0.18, w - 0.52, P.tealBr, 9.5);
    s.addText(st[1], { x: x + 0.26, y: y + 0.44, w: w - 0.52, h: 0.70, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, color: P.t2, valign: "top", lineSpacing: 14 });
  });
  s.addText("The same install earns its keep at every stage of the motion Automatum already runs.", {
    x: M, y: 2.82, w: CW, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 12, color: P.t3, italic: true, valign: "middle",
  });

  const phases = [
    ["01", "DAYS 0–30", "Stand up and pilot", ["Install Archera from AWS Marketplace on two friendly ISV accounts.", "Run the free savings analysis and baseline coverage.", "Turn each pilot's analysis into a term plan — 30-day vs 1-year, workload by workload."]],
    ["02", "DAYS 30–60", "Productise", ["Package the attach offer, with the savings number as the opening line.", "Execute the distributor agreement and clear its free enablement bar.", "Brief the account team on the talk track and the qualifying question."]],
    ["03", "DAYS 60–90", "Roll out and co-sell", ["Work the base mid-band first, largest accounts last — the slide 9 order.", "Co-sell with AWS and Archera on qualified accounts.", "Report savings delivered, premium billed and new margin."]],
  ];
  phases.forEach((p, i) => {
    const w = (CW - 0.36) / 3, x = M + i * (w + 0.18), y = 3.28;
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
  s.addNotes("The enablement bar in the agreement: three people through Archera Sales Enablement and one through Technical Sales Enablement, both free, plus a twice-monthly pipeline cadence with Archera. Keep the pilot to two accounts. The single most useful output of days 0 to 30 is a real coverage baseline across those accounts, because it replaces every assumption on the sizing slide with a measured number.");
}

/* ═══════════════ 19 · THE HONEST PART ═══════════════ */
{
  const s = sl(P.bg);
  eyebrow(s, "PART FOUR  ·  THE RECKONING", P.amber);
  h1(s, "When not to use this, and what to validate.");

  card(s, M, 1.62, CW, 1.32, { fill: P.card2, line: P.amber, lw: 1.1 });
  s.addText([
    { text: "If a workload is genuinely stable and the customer will run it for three years, they should buy the three-year commitment themselves and keep all 57%.", options: { bold: true, color: P.white, breakLine: true } },
    { text: "Archera is for the spend that genuinely cannot be committed — which, for a startup and scaleup base, is a great deal more of the bill than most teams would guess.", options: { color: P.t2 } },
  ], { x: M + 0.36, y: 1.62, w: CW - 0.72, h: 1.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 13.5, valign: "middle", lineSpacing: 21 });

  const checks = [
    ["Rebate cover: off by default", "It has to be switched on with Archera. A customer can hold release-only cover while believing they are rebate-protected."],
    ["Buybacks are not automatic", "Somebody has to file the request — and for EC2, the RI Marketplace must be enabled on the account first."],
    ["Model the economics per account", "Pricing is transparent, but the right term depends on expected utilisation. Run the numbers before recommending one."],
    ["Data access and billing ownership", "Minimal-privilege install, and the customer keeps full ownership and control of their AWS billing. Make that explicit in every engagement."],
  ];
  checks.forEach((c, i) => {
    const w = (CW - 0.54) / 4, x = M + i * (w + 0.18), y = 3.18;
    card(s, x, y, w, 2.36, { fill: P.card, line: P.rule });
    s.addText(c[0], { x: x + 0.28, y: y + 0.22, w: w - 0.56, h: 0.88, isTextBox: true, margin: 0, fontFace: F, fontSize: 13, bold: true, color: P.white, valign: "top", lineSpacing: 18 });
    s.addText(c[1], { x: x + 0.28, y: y + 1.14, w: w - 0.56, h: 1.06, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, color: P.t2, valign: "top", lineSpacing: 15.5 });
  });

  card(s, M, 5.66, CW, 1.04, { fill: P.bg2, line: P.rule });
  s.addText([
    { text: "One disclosure. ", options: { bold: true, color: P.amber } },
    { text: "Anyone recommending this is paid on it — Archera, us, and once the rev-share is live, Automatum too. We will still tell you when the right answer is the native three-year. And the guarantees themselves are contractual under Archera's terms, backed by third-party reinsurance — not regulated insurance.", options: { color: P.t2 } },
  ], { x: M + 0.34, y: 5.66, w: CW - 0.68, h: 1.04, isTextBox: true, margin: 0, fontFace: F, fontSize: 12.5, valign: "middle", lineSpacing: 18 });
  caption(s, "Also review the agreement's term before signing: it auto-renews in 18-month cycles unless terminated with at least six months' written notice, under Delaware law.", 6.76);
  foot(s, N);
  s.addNotes("Do not skip this slide to save time. It is the one that makes the other eighteen credible, and the two operational gotchas — rebate cover being off by default, and buybacks needing a filed request — are exactly the kind of thing a partner is well placed to own on the customer's behalf.");
}

/* ═══════════════ 21 · SEND THIS ON ═══════════════ */
{
  const s = sl(P.deep);
  eyebrow(s, "SEND THIS ON", P.tealBr);
  h1(s, "Archera × Automatum, in one frame.", { size: 26, h: 0.5 });
  sub(s, "Turn your customers’ AWS bills into a reason to stay — the whole argument, for whoever was not in the room.", { y: 1.24, w: 10.5, size: 12 });

  const colW = (CW - 0.44) / 3;
  const colY = 1.78, colH = 4.56;

  // col 1 · the structure
  {
    const x = M;
    card(s, x, colY, colW, colH, { fill: P.bg2, line: P.rule });
    label(s, "THE STRUCTURE", x + 0.28, colY + 0.20, colW - 0.56, P.indigoL, 9);
    const pts = [
      "A native 3-year RI or Savings Plan, bought into the customer's own payer account.",
      "Their obligation: 30 days or 12 months. Archera carries the balance; AWS bills them directly.",
      "Fee: 50% of the created saving on the 30-day term, 25% on the 1-year. No savings, no fee.",
    ];
    pts.forEach((t, j) => {
      s.addText(t, { x: x + 0.28, y: colY + 0.50 + j * 0.66, w: colW - 0.56, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "top", lineSpacing: 13.5 });
    });
    const lad = [["Pay as you go", "0%", P.dim, false], ["Archera 30-day", "28.5%", P.teal, true], ["Native 1-year", "36%", P.dim, false], ["Archera 1-year", "42.75%", P.indigoL, true], ["Native 3-year", "57%", P.muted, false]];
    lad.forEach((r, j) => {
      const ry = colY + 2.62 + j * 0.37;
      s.addText(r[0], { x: x + 0.28, y: ry, w: 1.45, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, bold: r[3], color: r[3] ? P.white : P.t3, valign: "middle" });
      s.addShape(pres.ShapeType.rect, { x: x + 1.78, y: ry + 0.11, w: 1.10, h: 0.10, fill: { color: P.card2 }, line: { color: P.card2, width: 0.25 } });
      const pct = parseFloat(r[1]);
      if (pct > 0) s.addShape(pres.ShapeType.rect, { x: x + 1.78, y: ry + 0.11, w: 1.10 * (pct / 57), h: 0.10, fill: { color: r[2] }, line: { color: r[2], width: 0.25 } });
      s.addText(r[1] + (r[3] ? "  · exit" : ""), { x: x + 2.96, y: ry, w: colW - 3.10, h: 0.32, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, bold: true, color: r[3] ? r[2] : P.t3, valign: "middle" });
    });
  }

  // col 2 · when not to
  {
    const x = M + colW + 0.22;
    card(s, x, colY, colW, colH, { fill: P.bg2, line: P.rule });
    label(s, "WHEN NOT TO — AND THE FINE PRINT", x + 0.28, colY + 0.20, colW - 0.56, P.amber, 9);
    const pts = [
      ["Stable three-year workloads", "Buy the native 3-year and keep all 57%. Archera is only for the spend that cannot honestly be committed."],
      ["Rebate cover is off by default", "It must be switched on with Archera — release-only cover is not rebate cover."],
      ["Buybacks are filed, not automatic", "Somebody requests the release, and EC2 buybacks need the RI Marketplace enabled first."],
      ["The guarantees are contractual", "Backed by third-party reinsurance — not a regulated insurance policy."],
    ];
    pts.forEach((t, j) => {
      const py = colY + 0.52 + j * 0.98;
      s.addText(t[0], { x: x + 0.28, y: py, w: colW - 0.56, h: 0.26, isTextBox: true, margin: 0, fontFace: F, fontSize: 10.5, bold: true, color: P.white, valign: "middle" });
      s.addText(t[1], { x: x + 0.28, y: py + 0.27, w: colW - 0.56, h: 0.62, isTextBox: true, margin: 0, fontFace: F, fontSize: 9.5, color: P.t2, valign: "top", lineSpacing: 13 });
    });
  }

  // col 3 · the partnership
  {
    const x = M + 2 * (colW + 0.22);
    card(s, x, colY, colW, colH, { fill: P.card2, line: P.indigo, lw: 1.1 });
    label(s, "THE PARTNERSHIP", x + 0.28, colY + 0.20, colW - 0.56, P.tealBr, 9);
    const pts = [
      "The platform is free; the premium meters monthly on savings realised, billed through AWS Marketplace CPPO.",
      "Co-Seller rev-share: 20% / 25% / 30% by commitment MRR — on entities net-new to Archera only.",
    ];
    pts.forEach((t, j) => {
      s.addText(t, { x: x + 0.28, y: colY + 0.50 + j * 0.76, w: colW - 0.56, h: 0.72, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.t2, valign: "top", lineSpacing: 13.5 });
    });
    label(s, "THE THREE ASKS", x + 0.28, colY + 2.14, colW - 0.56, P.muted, 8.5);
    const asks = ["Pick two pilot ISVs", "Run the free savings analysis", "Sign the distributor agreement"];
    asks.forEach((t, j) => {
      const ay = colY + 2.42 + j * 0.62;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.30, y: ay + 0.11, w: 0.30, h: 0.30, fill: { color: P.indigo }, line: { color: P.indigoL, width: 0.75 } });
      s.addText(String(j + 1), { x: x + 0.30, y: ay + 0.11, w: 0.30, h: 0.30, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, bold: true, color: P.white, align: "center", valign: "middle" });
      s.addText(t, { x: x + 0.72, y: ay, w: colW - 1.02, h: 0.52, isTextBox: true, margin: 0, fontFace: F, fontSize: 11, bold: true, color: P.white, valign: "middle" });
    });
  }

  caption(s, "Figures per this deck: savings vs on-demand from Archera's AWS pricing; tiers per the distributor agreement template (unsigned). Full sources on the slides behind each claim.", 6.50);
  s.addText("Prepared by Only Best Practices  ·  AWS Alliance Advisory", {
    x: M, y: 6.90, w: 8, h: 0.3, isTextBox: true, margin: 0, fontFace: F, fontSize: 10, color: P.dim, charSpacing: 0.8, valign: "middle",
  });
  s.addText(String(N), { x: 13.333 - M - 1.2, y: 6.90, w: 1.2, h: 0.3, isTextBox: true, margin: 0, fontFace: F, fontSize: 9, color: P.dim, align: "right", valign: "middle" });
  s.addNotes("The forwardable slide and the close: everything load-bearing in one frame, for the CEO to send to their team without the deck. Close on the two-pilot ask, not on the rev-share — the pilot turns every assumption in this deck into Automatum's own data, and it costs them an install and a report. If only one slide survives the meeting, this is the one it should be.");
}

const out = process.argv[2] || "Archera-for-Automatum.pptx";
pres.writeFile({ fileName: out }).then(() => console.log("wrote", out, "· slides:", N));
