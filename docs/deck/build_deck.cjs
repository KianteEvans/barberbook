/*
 * BOX Solutions — revised deck builder.
 *
 * Rebuilds the 14-slide internal deck as the 22-slide revision specified in
 * ../box-deck-revision-spec.md, which remains the authority on wording.
 *
 * Geometry, palette and assets are measured/extracted from the original PDF
 * export, so slides sit visually inside the real template. This is a visual
 * draft: it approximates the template rather than inheriting its master.
 *
 *   node build_deck.js
 */
const path = require('path');
let PptxGenJS;
for (const p of ['pptxgenjs',
  process.env.PPTX_LIB || '',
  '/tmp/claude-0/-home-user-barberbook/6d69865a-659c-5ec2-a4e2-29eacb5c89ea/scratchpad/pptxbuild/node_modules/pptxgenjs']) {
  if (!p) continue;
  try { PptxGenJS = require(p); break; } catch (e) { /* try next */ }
}
if (!PptxGenJS) throw new Error('pptxgenjs not found — npm install pptxgenjs, or set PPTX_LIB');

const A = f => path.join(__dirname, 'assets', /\.(png|jpg)$/.test(f) ? f : f + '.png');
const P = pt => pt / 72;                    // PDF points -> inches
const TOTAL = 22;

const C = {
  // content slides are LIGHT: navy ink on a near-white ground
  ink:'15224B', body:'5B6378', subtle:'9AA2B5', white:'FFFFFF',
  orange:'F36F20', blueEye:'2E7CC4', zebra:'F5F8FC', hi:'FAEEE1',
  bandBg:'15224B', bandTx:'D7E1F5', autoBlue:'121B47', obpBlue:'1C4E9D',
  // title slide and dividers are DARK
  dkBody:'C6D2EA', dkAccent:'9FD0FF', dkMuted:'8FA0C6', dkDim:'6C7BA6', iconLbl:'D3DCEF', badge:'B4432F',
};
const F = { bold:'Segoe UI', light:'Segoe UI Semilight', reg:'Segoe UI' };

const pptx = new PptxGenJS();
pptx.defineLayout({ name:'DECK', width:P(960), height:P(540) });
pptx.layout = 'DECK';
pptx.author = 'OBP';
pptx.title  = 'BOX Solutions — Automatum x OBP (internal)';

// ---------------------------------------------------------------- primitives
function txt(s, str, o) {
  s.addText(str, Object.assign({ isTextBox:true, margin:0, valign:'top',
    fontFace:F.light, color:C.body, fontSize:9 }, o));
}
// bulleted block: array of strings -> one text box
function block(s, lines, o) {
  const runs = lines.map((t, i) => ({ text:t,
    options:{ bullet:{ code:'2022', indent:10 }, breakLine:i < lines.length-1 } }));
  s.addText(runs, Object.assign({ isTextBox:true, margin:0, valign:'top',
    fontFace:F.light, color:C.body, fontSize:8, lineSpacingMultiple:1.12,
    paraSpaceAfter:3 }, o));
}

// -------------------------------------------------------- slide chrome
function chrome(s, { eyebrow, eyebrowIcon, eyebrowColor, title, subtitle, page }) {
  s.addImage({ path:A('bg_content.png'), x:0, y:0, w:P(960), h:P(540) });
  if (eyebrowIcon)
    s.addImage({ path:A(eyebrowIcon), x:P(44.6), y:P(37.4), w:P(20.2), h:P(20.2) });
  if (eyebrow)
    txt(s, eyebrow, { x:P(80.6), y:P(39.5), w:P(500), h:P(18), fontFace:F.bold,
      bold:true, fontSize:11.5, color:eyebrowColor || C.orange, charSpacing:1.6 });
  if (title)
    txt(s, title, { x:P(51.8), y:P(74), w:P(860), h:P(40), fontFace:F.bold,
      bold:true, fontSize:25, color:C.ink });
  if (subtitle)
    txt(s, subtitle, { x:P(51.8), y:P(130), w:P(830), h:P(34), fontSize:12.5 });
  footer(s, page);
}
function footer(s, page, dark) {
  s.addText([
    { text:'Automatum', options:{ color:dark ? C.dkBody : C.autoBlue, bold:true } },
    { text:'  ·  with  ·  ', options:{ color:dark ? C.dkDim : C.subtle } },
    { text:'OBP', options:{ color:dark ? C.dkAccent : C.obpBlue, bold:true } },
  ], { isTextBox:true, margin:0, x:P(51.8), y:P(509), w:P(260), h:P(14),
       fontFace:F.reg, fontSize:9 });
  txt(s, `INTERNAL  ·  BOX SOLUTIONS PORTFOLIO  ·  ${String(page).padStart(2,'0')} / ${TOTAL}`,
    { x:P(600), y:P(509), w:P(307), h:P(14), fontFace:F.reg, fontSize:9,
      color:dark ? C.dkMuted : C.subtle, align:'right' });
}
// the deck's footer callout band: LABEL + sentence
function band(s, label, text) {
  s.addShape(pptx.ShapeType.roundRect, { x:P(44.6), y:P(453.6), w:P(870.7), h:P(44.6),
    fill:{ color:C.bandBg }, rectRadius:0.14, line:{ type:'none' } });
  s.addText([
    { text:label, options:{ bold:true, color:C.orange, fontFace:F.bold, charSpacing:1.1 } },
    { text:'    ' + text, options:{ color:C.bandTx, fontFace:F.light } },
  ], { isTextBox:true, margin:0, x:P(66), y:P(462), w:P(830), h:P(28), fontSize:10.5, valign:'middle' });
}

// ------------------------------------------------------------ body layouts
// n evenly spaced columns; each item {head, lines[] or textOnly}
function columns(s, items, { top=195, x0=80.6, pitch, colW, headSize=13, bodySize=9.5,
                             panels=false, icons=null, height=250 } = {}) {
  const n = items.length;
  pitch = pitch || (n === 4 ? 221 : n === 3 ? 294.6 : (856 / n));
  colW  = colW  || (n === 4 ? 150 : n === 3 ? 215 : pitch - 26);
  items.forEach((it, i) => {
    const x = x0 + i * pitch;
    if (panels) {
      const cw = pitch - 13, cx = x - 36, ct = top - 1.3, ch = Math.min(208.8, height + 14);
      s.addImage({ path:A('panel.png'), x:P(cx - 11.5), y:P(ct - 3.6), w:P(cw + 23), h:P(ch + 20.2) });
      s.addShape(pptx.ShapeType.roundRect, { x:P(cx), y:P(ct), w:P(cw), h:P(ch),
        fill:{ color:C.white }, rectRadius:0.05, line:{ type:'none' } });
    }
    let y = top;
    if (icons && icons[i]) { s.addImage({ path:A(icons[i]), x:P(x - 7), y:P(y+19), w:P(21.6), h:P(21.6) }); y += 52; }
    else if (panels) y += 20;
    if (it.head) {
      txt(s, it.head, { x:P(x), y:P(y), w:P(colW), h:P(46), fontFace:F.bold, bold:true,
        fontSize:headSize, color:C.ink });
      y += it.head.length > (colW < 170 ? 20 : 34) ? 44 : 30;
    }
    if (it.sub) { txt(s, it.sub, { x:P(x), y:P(y), w:P(colW), h:P(16), fontSize:8.5,
      color:C.blueEye, fontFace:F.bold, bold:true, charSpacing:0.8 }); y += 17; }
    if (it.text) txt(s, it.text, { x:P(x), y:P(y), w:P(colW), h:P(height - (y-top)), fontSize:bodySize });
    if (it.lines) block(s, it.lines, { x:P(x), y:P(y), w:P(colW), h:P(height - (y-top)), fontSize:bodySize });
  });
}
// label/value table — navy header bar, zebra rows, per the deck's own convention
function table(s, rows, { top=180, labelX=59, valueX=217.5, labelW=150, valueW=690,
                          pitch=21.7, size=11.5, header=null, x3=678.3, col3W=228 } = {}) {
  let y = top;
  const bar = (yy, h, color) => s.addShape(pptx.ShapeType.rect,
    { x:P(44.6), y:P(yy), w:P(870.5), h:P(h), fill:{ color }, line:{ type:'none' } });
  if (header) {
    bar(y - 5.5, pitch, C.bandBg);
    txt(s, header[0], { x:P(labelX), y:P(y), w:P(labelW), h:P(16), fontFace:F.bold, bold:true, fontSize:size, color:C.white });
    txt(s, header[1], { x:P(valueX), y:P(y), w:P(valueW), h:P(16), fontFace:F.bold, bold:true, fontSize:size, color:C.white });
    if (header[2]) txt(s, header[2], { x:P(header[3] || x3), y:P(y), w:P(col3W), h:P(16), fontFace:F.bold, bold:true, fontSize:size, color:C.white });
    y += pitch + 4;
  }
  const yStart = y;
  // paint every row bar first, so a wrapped line is never sliced by the next row's stripe
  rows.forEach((r, i) => { if (i % 2 === 1) bar(yStart + i*pitch - 5.5, pitch, C.zebra); });
  rows.forEach((r, i) => {
    const yy = yStart + i * pitch;
    txt(s, r[0], { x:P(labelX), y:P(yy), w:P(labelW), h:P(pitch), fontSize:size, color:C.ink, fontFace:F.bold, bold:true });
    txt(s, r[1], { x:P(valueX), y:P(yy), w:P(valueW), h:P(pitch), fontSize:size, color:C.body });
    if (r[2] !== undefined) txt(s, r[2], { x:P(x3), y:P(yy), w:P(col3W), h:P(pitch), fontSize:size, color:C.body });
  });
  y = yStart + rows.length * pitch;
  return y;
}
// matrix: row labels + N columns
function matrix(s, rowLabels, cols, cells, { top=185, labelX=51.8, labelW=96,
                  x0=158, pitch=190, colW=176, size=8.5, rowH=null, headSize=10.5 } = {}) {
  cols.forEach((c, i) => txt(s, c, { x:P(x0 + i*pitch), y:P(top), w:P(colW), h:P(26),
    fontFace:F.bold, bold:true, fontSize:headSize, color:C.ink }));
  let y = top + 30;
  rowLabels.forEach((rl, r) => {
    const h = rowH ? rowH[r] : 52;
    txt(s, rl, { x:P(labelX), y:P(y), w:P(labelW), h:P(h), fontSize:8, color:C.orange,
      fontFace:F.bold, bold:true, charSpacing:0.5 });
    cells[r].forEach((cell, i) => txt(s, cell, { x:P(x0 + i*pitch), y:P(y), w:P(colW), h:P(h), fontSize:size }));
    y += h;
  });
  return y;
}
// the commit/target pages
function rungs(s, rungList, { top=228, x0=51.8, pitch=294, colW=274 } = {}) {
  rungList.forEach((r, i) => {
    const x = x0 + i * pitch;
    s.addText([
      { text:r.name, options:{ bold:true, color:C.ink, fontFace:F.bold } },
      { text:'   ' + r.price, options:{ color:C.orange, fontFace:F.bold, bold:true } },
    ], { isTextBox:true, margin:0, x:P(x), y:P(top), w:P(colW), h:P(16), fontSize:12 });
    txt(s, r.head, { x:P(x), y:P(top+19), w:P(colW), h:P(26), fontSize:8.5, color:C.blueEye });
    txt(s, 'WE COMMIT', { x:P(x), y:P(top+36), w:P(colW), h:P(12), fontSize:8,
      fontFace:F.bold, bold:true, color:C.orange, charSpacing:1.1 });
    block(s, r.commit, { x:P(x), y:P(top+50), w:P(colW), h:P(100), fontSize:7.5 });
    txt(s, 'WE TARGET', { x:P(x), y:P(top+154), w:P(colW), h:P(12), fontSize:8,
      fontFace:F.bold, bold:true, color:C.subtle, charSpacing:1.1 });
    block(s, r.target, { x:P(x), y:P(top+168), w:P(colW), h:P(46), fontSize:7.8, color:C.subtle });
  });
}
function divider(s, part, title, sub, labels, bg, tiles, page) {
  s.addImage({ path:A(bg), x:0, y:0, w:P(960), h:P(540) });
  txt(s, part, { x:P(51.8), y:P(150), w:P(400), h:P(20), fontFace:F.bold, bold:true,
    fontSize:11.5, color:C.orange, charSpacing:3.2 });
  txt(s, title, { x:P(51.8), y:P(185), w:P(700), h:P(50), fontFace:F.bold, bold:true,
    fontSize:34, color:C.white });
  if (sub) txt(s, sub, { x:P(51.8), y:P(245), w:P(640), h:P(24), fontSize:13, color:C.dkBody });
  labels.forEach((l, i) => {
    if (tiles && tiles[i]) {
      s.addImage({ path:A(tiles[i][0]), x:P(51.8 + i*122), y:P(300), w:P(34), h:P(34) });
      s.addImage({ path:A(tiles[i][1]), x:P(60 + i*122), y:P(308.2), w:P(17.7), h:P(17.7) });
    }
    txt(s, l, { x:P(51.8 + i*122), y:P(344), w:P(112), h:P(16), fontSize:10, color:C.iconLbl });
  });
  footer(s, page, true);
}

/* ======================================================================
 *  SLIDES
 *  Wording from ../box-deck-revision-spec.md. Bracketed figures are unset;
 *  see the placeholder register in spec section 8.
 * ==================================================================== */
let s;

/* 1 — Title -------------------------------------------------------------- */
s = pptx.addSlide();
s.addImage({ path:A('bg_title.jpg'), x:0, y:0, w:P(960), h:P(540) });
s.addImage({ path:A('logo_automatum.png'), x:P(64.6), y:P(51.8), w:P(140.1), h:P(33.1) });
txt(s, 'with', { x:P(240.5), y:P(63), w:P(30), h:P(14), fontSize:11, color:C.dkMuted });
s.addImage({ path:A('logo_obp.png'), x:P(272.2), y:P(52.3), w:P(144), h:P(32.3) });
s.addShape(pptx.ShapeType.roundRect, { x:P(636), y:P(54.7), w:P(279.3), h:P(27.4),
  fill:{ color:C.badge }, rectRadius:0.19, line:{ type:'none' } });
txt(s, 'INTERNAL  ·  OBP AND AUTOMATUM ONLY', { x:P(636), y:P(62), w:P(279.3), h:P(16),
  fontFace:F.bold, bold:true, fontSize:9, color:C.white, align:'center', charSpacing:0.9 });
txt(s, 'INTERNAL  ·  AUTOMATUM X OBP', { x:P(51.8), y:P(178), w:P(400), h:P(18),
  fontFace:F.bold, bold:true, fontSize:12.5, color:C.orange, charSpacing:3.4 });
txt(s, 'An AWS listing is not\nan AWS business.', { x:P(51.8), y:P(218), w:P(700), h:P(105),
  fontFace:F.bold, bold:true, fontSize:44, color:C.white, lineSpacing:50 });
txt(s, 'Four jobs stand between the two. One fixed-fee project and three twelve-month retainers —\nthe internal side-by-side view, for OBP and Automatum.',
  { x:P(51.8), y:P(326), w:P(800), h:P(40), fontSize:15, color:C.dkBody });
s.addText([
  { text:'Automatum leads the solution and owns the listed software', options:{ color:C.dkAccent } },
  { text:'   ·   ', options:{ color:C.dkDim } },
  { text:'OBP delivers the engagement', options:{ color:C.dkAccent } },
  { text:'   ·   ', options:{ color:C.dkDim } },
  { text:'Automatum is seller of record', options:{ color:C.dkAccent } },
], { isTextBox:true, margin:0, x:P(51.8), y:P(382), w:P(830), h:P(16), fontFace:F.bold, bold:true, fontSize:10.5 });
[['Four','solutions','tile_a','tile_b'],['One','platform','tile_c','tile_b'],['One','operator','tile_d','tile_glyph2']]
  .forEach(([a,b,tile,glyph], i) => {
    s.addImage({ path:A(tile), x:P(44.6 + i*98), y:P(412), w:P(47.5), h:P(47.5) });
    s.addImage({ path:A(glyph), x:P(56 + i*98), y:P(423.4), w:P(24.7), h:P(24.7) });
    txt(s, a + '\n' + b, { x:P(44.6 + i*98), y:P(468), w:P(90), h:P(28), fontSize:10,
      color:C.iconLbl, lineSpacingMultiple:1.05 });
  });
txt(s, 'Two pricing logics — seniority, and throughput.', { x:P(430), y:P(478), w:P(330), h:P(14),
  fontSize:9.5, color:C.dkMuted });
txt(s, 'Bracketed items are open for decision. None reaches a customer artifact.',
  { x:P(430), y:P(494), w:P(330), h:P(14), fontSize:8.5, color:C.dkMuted });
txt(s, 'BOX Solutions   ·   revised 2026-09-02', { x:P(700), y:P(509), w:P(207), h:P(14),
  fontFace:F.reg, fontSize:9, color:C.dkMuted, align:'right' });

/* 2 — Agenda ------------------------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'AGENDA', eyebrowIcon:'eyebrow_p2.png', title:'Three parts.', page:2 });
columns(s, [
  { sub:'01', head:'The portfolio', text:'Four jobs, four buyers, one platform.' },
  { sub:'02', head:'The four solutions', text:'The project and the three retainers — each on its own page, each with what we commit and what we target.' },
  { sub:'03', head:'The machinery', text:'Value chain, components, partner economics, the exchange, the sequence, the decision.' },
], { top:200, panels:true, headSize:17, bodySize:11 });

/* 3 — Part One divider --------------------------------------------------- */
s = pptx.addSlide();
divider(s, 'PART ONE', 'The portfolio', 'An AWS listing is not an AWS business. Four jobs stand between the two.',
  ['Portfolio','Buyers','Ladder'], 'bg_divider1.jpg', [['tile_a','tile_b'],['tile_c','tile_b'],['tile_d','tile_e']], 3);

/* 4 — The thesis --------------------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE THESIS', eyebrowIcon:'eyebrow_p4.png',
  title:'Four places AWS revenue stalls.',
  subtitle:'Getting listed, running the partnership, operating the Marketplace, building the channel. One operator for all four.',
  page:4 });
columns(s, [
  { head:'Get a product qualified and listed on AWS Marketplace.',
    text:'A fixed-fee project: from unassessed to a published, transacting listing in 14 to 18 business days of delivery.' },
  { head:'Put a named owner on the AWS partnership.',
    text:'OBP as the ISV’s Director of Alliances for twelve months — a named owner at [N] hours a month, [N] partnership reviews and [N] quarterly AWS plans across the term — across three strictly additive tiers.' },
  { head:'Operate a live listing at volume.',
    text:'Nine services in three groups — compliance engineering, listing engineering, the offer desk and reporting — at every tier. Volume, turnaround and review cadence set the rung. Launch includes the listing work itself.' },
  { head:'Build and run a reseller channel.',
    text:'Partners recruited and managed to a committed roster — up to (6), up to (12), or uncapped. Partners issuing offers is the number we report; roster under management is the number we commit.' },
], { top:196, panels:true, icons:['icon_a','icon_b','icon_c','icon_d'], headSize:12, bodySize:9, height:246 });
band(s, 'TWO PRICING LOGICS', 'Alliances and Partner Development price on seniority: $2,500 / $5,000 / $7,500. Operations prices on throughput: $1,500 / $3,000 / $6,000.');

/* 5 — Four buyers, four boundaries (NEW) --------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'WHY FOUR, NOT ONE', eyebrowIcon:'eyebrow_p5.png',
  title:'Four buyers. Four budgets. Four Solution IDs.',
  subtitle:'Same ladder — different job, different buyer, different cost base. AWS treats them as four.',
  page:5 });
matrix(s,
  ['WHO SIGNS','WHAT IT REPLACES','THE LISTING BOUNDARY','COMPONENT','SOLUTION ID'],
  ['Marketplace Compliance Accelerator','Managed AWS Alliances','Managed Marketplace Operations','Managed Partner Development'],
  [
    ['[CRO] · [CISO] co-sponsor','[CEO or CRO]','[CRO] · [COO] co-sponsor','[CRO] · [VP Channel] co-sponsor'],
    ['Enterprise deals lost to Marketplace procurement, plus [N] engineer-weeks of compliance work','A Director of Alliances hire','A Marketplace ops / offer-desk hire plus compliance engineering hours','A channel manager plus a PRM subscription'],
    ['The fixed-fee route to a published listing in 14 to 18 business days, with nothing ongoing','The AWS partnership programme and the ISV’s own BOX Program listings — not the Marketplace listing work','Builds the listing AND operates it for twelve months — Launch includes WAFR, FTR and publication','Third-party sellers — not the customer’s own listing'],
    ['ASecureCloud','[none named — to confirm]','[none named — to confirm]','Kiflo, resold inside the fee'],
    ['Its own, with its own milestone submission','Its own','Its own','Its own'],
  ],
  { top:180, rowH:[30,50,60,40,30] });
txt(s, 'Buyer profiles to be validated against OBP’s closed and in-flight deals.',
  { x:P(51.8), y:P(428), w:P(500), h:P(14), fontSize:8.5, color:C.subtle });
band(s, 'NOT CUSTOMER-FACING', 'Each customer overview and deck names its own solution only.');

/* 6 — How the BOX framing works ------------------------------------------ */
s = pptx.addSlide();
chrome(s, { eyebrow:'HOW THE BOX FRAMING WORKS', eyebrowIcon:'eyebrow_p7.png',
  title:'One structure across all four.',
  subtitle:'Automatum leads the solution and owns the listed software; OBP delivers the engagement. Automatum is seller of record.',
  page:6 });
columns(s, [
  { head:'One agreement', text:'Standalone sale. One agreement per Solution ID, no bundle SKU, list price per solution. [Multi-solution discount policy — to decide.] The customer transacts through AWS Marketplace on Automatum’s listing — software on one line, professional services on the other.' },
  { head:'The software line', text:'Every solution puts Automatum software on the software line. [Automatum software component — to name, per solution.] Load-bearing for both the four-solutions defence and the revenue split.' },
  { head:'Entry conditions', text:'Validated or Differentiated held by the lead partner — stated by Automatum, evidence to attach. Solution lists within 12 months. [Clock basis — per Solution ID from entry, or programme-level — to confirm.]' },
], { top:200, panels:true, headSize:15, bodySize:9.5, height:230 });

/* 7 — What a rung is (NEW) ----------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE RULE', eyebrowIcon:'eyebrow_p8.png', eyebrowColor:C.blueEye,
  title:'What you can hold us to.',
  subtitle:'One structure for every rung of every retainer, so the three solutions do not each argue it.',
  page:7 });
columns(s, [
  { sub:'01', head:'We commit', text:'Only what OBP controls alone: named staffing and hours, cadence, artifacts issued, response times from a stated trigger. Attendance-dependent items are written as OBP’s act.' },
  { sub:'02', head:'We target', text:'Results that depend on the customer’s product, market or sales team, or on AWS. Shown against actuals from month one.' },
  { sub:'03', head:'The band', text:'Every rung carries an included volume and an overflow rate, modelled on the Accelerator’s own convention. No uncapped commitment at a fixed fee.' },
  { sub:'04', head:'What the customer supplies', text:'Named counterpart, data, access, approvals, input turnaround. OBP’s clocks run from these being met.' },
  { sub:'05', head:'Evidence and remedy', text:'Each commit names the artifact that proves it. [Remedy — service credit / make-good / termination right — to decide.] Targets carry no fee adjustment.' },
], { top:200, x0:51.8, pitch:172, colW:152, headSize:12, bodySize:8.5, height:230 });
band(s, 'THE LINE', 'A commitment OBP cannot honour alone is worse than none.');

/* 8 — Part Two divider --------------------------------------------------- */
s = pptx.addSlide();
divider(s, 'PART TWO', 'The four solutions', 'Each stands alone in front of a customer.',
  ['List','Partner','Operate','Build'], 'bg_divider2.jpg', [['tile_a','tile_e'],['tile_c','tile_f'],['tile_d','tile_g'],['tile_a','tile_b']], 8);

/* 9 — Marketplace Compliance Accelerator --------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'FIXED-FEE PROJECT', eyebrowIcon:'eyebrow_p7.png',
  title:'Marketplace Compliance Accelerator',
  subtitle:'Get a product qualified and listed on AWS Marketplace.',
  page:9 });
txt(s, 'The engagement', { x:P(80.6), y:P(176), w:P(300), h:P(16), fontFace:F.bold, bold:true, fontSize:12, color:C.ink });
txt(s, 'From unassessed to a published, transacting listing in 14 to 18 business days of delivery.',
  { x:P(80.6), y:P(196), w:P(360), h:P(30), fontSize:9.5 });
txt(s, 'Stands alone', { x:P(522.5), y:P(176), w:P(300), h:P(16), fontFace:F.bold, bold:true, fontSize:12, color:C.ink });
txt(s, 'Its own overview, its own deck, its own Solution ID and milestone submission.',
  { x:P(522.5), y:P(196), w:P(360), h:P(30), fontSize:9.5 });
table(s, [
  ['Fee','$10,000 fixed'],
  ['Payment','50% on signature, 50% on completion'],
  ['Remediation','20 hours included; further blocks of 10 hours at $1,000 each'],
  ['Delivery','14 to 18 business days'],
  ['Customer supplies / clock start','[What starts the clock]; engineering availability for remediation, tax, bank and legal data for seller registration'],
  ['We target, not commit','Publication date — AWS’s review queue and the customer’s product govern it'],
  ['Not included','Ongoing operation of the listing — that is Managed Marketplace Operations'],
  ['Why buy it standalone','Managed Marketplace Operations Launch covers the same listing work inside a twelve-month retainer. This is the route to a published listing in 14 to 18 business days with no ongoing commitment.'],
], { top:238, labelX:59, labelW:152, valueX:225, valueW:670, pitch:26, size:9.5,
     header:['Term','What it covers'] });

/* 10 — The ladder -------------------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE RETAINERS', eyebrowIcon:'eyebrow_p8.png', eyebrowColor:C.blueEye,
  title:'Three retainers, two pricing logics.',
  subtitle:'Alliances and Partner Development price on seniority — the person on the account. Operations prices on throughput — the same rate per included offer at every rung.',
  page:10 });
['ENTRY RUNG','MIDDLE RUNG','TOP RUNG'].forEach((h, i) =>
  txt(s, h, { x:P(318.3 + i*203.8), y:P(200), w:P(190), h:P(14), fontFace:F.bold, bold:true,
    fontSize:8.5, color:C.orange, charSpacing:1.1 }));
[
  ['Managed AWS Alliances', ['$2,500 / mo','Essentials','stand the partnership up'], ['$5,000 / mo','Growth','scale the programs'], ['$7,500 / mo','Professional','open the AWS field'], '[CEO or CRO] · priced on seniority'],
  ['Managed Marketplace Operations', ['$1,500 / mo','Launch','build, publish and transact'], ['$3,000 / mo','Operate','same nine services, deeper band'], ['$6,000 / mo','Scale','same nine services, top band'], '[CRO] · [COO] co-sponsor · priced on throughput'],
  ['Managed Partner Development', ['$2,500 / mo','Establish','up to (6) partners managed'], ['$5,000 / mo','Expand','up to (12) partners managed'], ['$7,500 / mo','Accelerate','roster uncapped'], '[CRO] · [VP Channel] co-sponsor · priced on seniority'],
].forEach((row, r) => {
  const y = 228 + r * 76;
  txt(s, row[0], { x:P(59), y:P(y), w:P(250), h:P(18), fontFace:F.bold, bold:true, fontSize:11.5, color:C.ink });
  txt(s, row[4], { x:P(59), y:P(y+21), w:P(250), h:P(26), fontSize:8, color:C.subtle });
  for (let i = 1; i <= 3; i++) {
    const x = 318.3 + (i-1)*203.8;
    txt(s, row[i][0], { x:P(x), y:P(y), w:P(190), h:P(15), fontFace:F.bold, bold:true, fontSize:11.5, color:C.ink });
    txt(s, row[i][1], { x:P(x), y:P(y+16), w:P(190), h:P(14), fontFace:F.bold, bold:true, fontSize:10, color:C.blueEye });
    txt(s, row[i][2], { x:P(x), y:P(y+31), w:P(190), h:P(26), fontSize:8.5 });
  }
});
band(s, 'STANDS ALONE', 'Each solution keeps its own overview, deck, Solution ID and milestone submission. Two of the three share a ladder; Operations prices to its own band.');

/* --- helper for the three retainer pages -------------------------------- */
function retainerPage({ page, eyebrow, icon, title, subtitle, entry, commitLine, targetLine, note, rungList }) {
  const sl = pptx.addSlide();
  chrome(sl, { eyebrow, eyebrowIcon:icon, eyebrowColor:C.blueEye, title, subtitle, page });
  txt(sl, entry, { x:P(51.8), y:P(159), w:P(856), h:P(14), fontSize:8.5, color:C.orange });
  sl.addText([
    { text:'WE COMMIT   ', options:{ bold:true, color:C.orange, fontFace:F.bold, charSpacing:1.1 } },
    { text:commitLine, options:{ color:C.body, fontFace:F.light } },
  ], { isTextBox:true, margin:0, x:P(51.8), y:P(177), w:P(856), h:P(28), fontSize:9.5 });
  sl.addText([
    { text:'WE TARGET   ', options:{ bold:true, color:C.subtle, fontFace:F.bold, charSpacing:1.1 } },
    { text:targetLine, options:{ color:C.subtle, fontFace:F.light } },
  ], { isTextBox:true, margin:0, x:P(51.8), y:P(207), w:P(856), h:P(16), fontSize:9.5 });
  rungs(sl, rungList);
  band(sl, 'NOTE', note);
  return sl;
}

/* 11 — Managed AWS Alliances -------------------------------------------
 * Outcomes from Managed_AWS_Alliances_Outcomes_1.docx. Every AWS decision
 * (acceptance, MDF, approved listings, leads) sits in the target column;
 * OBP commits only to the work that pursues them.
 * ---------------------------------------------------------------------- */
retainerPage({
  page:11, eyebrow:'RETAINER · TWELVE MONTHS', icon:'eyebrow_p8.png',
  title:'Managed AWS Alliances',
  subtitle:'Put a named owner on the AWS partnership, and drive the ISV’s own AWS program progression. Three strictly additive tiers.',
  entry:'ENTRY CONDITION — the ISV holds the partner stage each program requires. [Marketplace listing as a prerequisite — to confirm.]',
  commitLine:'A named Director of Alliances at [N] hours a month with a named backup, [N] partnership reviews and [N] quarterly AWS plans delivered, and every application, event, check and artifact below prepared, filed or run.',
  targetLine:'ISV Accelerate and Competency acceptance, MDF availability, BOX Program listings approved, and AWS-sourced leads — all AWS’s decisions.',
  note:'The ISV’s OWN BOX Program benefits, which this retainer drives them toward — separate from the four Automatum × OBP solutions and their milestones. [“BOX Program listing” to be defined; it is not the Accelerator’s Marketplace listing.]',
  rungList:[
    { name:'Essentials', price:'$2,500 / mo', head:'Stand the partnership up.',
      commit:[
        'Named alliance lead at [N] hours a month, with a named backup',
        'Monthly partnership review held and minuted; action log within [N] business days, and a quarterly AWS partnership plan',
        'ISV Accelerate, Competency and MDF applications prepared and filed',
        'One BOX Program listing submission prepared and filed',
        'AWS-facing marketing support produced: 1-pagers, solution decks',
      ],
      target:[
        'ISV-A acceptance — unlocking up to 25k in MDF',
        '(1) Competency acceptance — unlocking up to 50k in MDF',
        '(1) BOX Program listing — unlocking 35k in AWS credits, 35k in cash and 55 leads via a sponsored AWS marketing campaign',
      ] },
    { name:'Growth', price:'$5,000 / mo', head:'Adds to Essentials — scale the programs.',
      commit:[
        'Quarterly events organised and run: Lunch & Learn, Immersion Day, Meet-Up',
        'Weekly ACE hygiene checks, with exceptions written back',
        'Funding applications prepared and filed',
        'Up to (3) Competency and (3) BOX Program listing submissions prepared and filed',
      ],
      target:[
        'ISV-A acceptance, and up to (3) Competency acceptances',
        'Up to (3) BOX Program listings approved',
        '55+ leads via sponsored AWS marketing campaigns',
      ] },
    { name:'Professional', price:'$7,500 / mo', head:'Adds to Growth — open the AWS field.',
      commit:[
        'Applications prepared and filed across all applicable Competency programs',
        'BOX Program listing submissions filed with no cap',
        '(4) Account Executive and (2) Partner Sales Manager introductions made and logged',
        '(1) Segment Leader introduction made and logged',
      ],
      target:[
        'Acceptance across all applicable Competency programs',
        'Listings uncapped, subject to AWS approval',
        'Meetings held and opportunities sourced from the introductions',
      ] },
  ],
});

/* 12 — Managed Marketplace Operations ----------------------------------
 * Outcomes from Managed_Services_Outcomes.docx. Launch absorbs the listing
 * work (WAFR, FTR, publication); the Accelerator remains the standalone
 * fixed-fee route to the same listing. AWS decisions sit in target.
 * ---------------------------------------------------------------------- */
retainerPage({
  page:12, eyebrow:'RETAINER · TWELVE MONTHS', icon:'eyebrow_p10.png',
  title:'Managed Marketplace Operations',
  subtitle:'Get a listing live and operate it at volume. All nine services at every rung, priced to the included offer band — the same rate per offer at each.',
  entry:'ENTRY CONDITION — none. Launch includes the listing work; the Accelerator remains the fixed-fee route to the same listing in 14 to 18 business days.',
  commitLine:'A named operations owner who takes the product through Well-Architected review, FTR and publication, then runs the offer desk to the band bought, with listing changes inside the rung’s turnaround and a monthly report on offers, Marketplace revenue and listing health.',
  targetLine:'FTR acceptance, the publication date, offers accepted and Marketplace revenue — AWS’s review queue and the customer’s deal flow govern every one.',
  note:'Nine services in three groups: compliance engineering · listing engineering · the offer desk and reporting. [Grouping proposed — confirm. CPPO also appears in Partner Development: originated there, executed here.]',
  rungList:[
    { name:'Launch', price:'$1,500 / mo', head:'Get it built, published and transacting.',
      commit:[
        '(1) WAFR conducted, findings remediated — the FTR takes a completed WAFR as its input',
        'FTR prepared and submitted; listing built, configured and taken through publication, with AMMP diagrams maintained',
        'CRM integration configured; private offer desk — up to (50) offers a year, direct and CPPO',
        'Listing changes in 5 business days; monthly reporting on offers, revenue and listing health',
      ],
      target:[
        'FTR acceptance — AWS decides; it grants AWS Qualified Software status and Solutions Finder placement, valid 2 years',
        'Publication date — AWS’s review queue governs it',
        'Offers accepted and Marketplace revenue transacted',
      ] },
    { name:'Operate', price:'$3,000 / mo', head:'Same nine services, deeper band.',
      commit:[
        '(2) Well-Architected Framework Reviews conducted, findings remediated',
        'Private offer desk — up to (100) offers a year',
        'Listing configuration changes in 3 business days',
        'FTR, listing publication, AMMP diagrams, CRM integration and monthly reporting as at Launch',
      ],
      target:[
        'FTR acceptance and Qualified Software status — AWS decides',
        'Offers accepted and Marketplace revenue transacted',
        'Demand at the band bought — offers issued follows the customer’s deal flow',
      ] },
    { name:'Scale', price:'$6,000 / mo', head:'Same nine services, top band.',
      commit:[
        '(4) Well-Architected Framework Reviews conducted, findings remediated',
        'Private offer desk — up to (200) offers a year',
        'Listing configuration changes in 1 business day',
        'FTR, listing publication, AMMP diagrams, CRM integration and monthly reporting as at Launch',
      ],
      target:[
        'FTR acceptance and Qualified Software status — AWS decides',
        'Offers accepted and Marketplace revenue transacted',
        'Demand at the band bought — offers issued follows the customer’s deal flow',
      ] },
  ],
});

/* 13 — Managed Partner Development --------------------------------------
 * Recruitment and management is OBP's own act, so it is committed at
 * 6 / 12 / uncapped. Partners issuing offers stays the headline reported
 * number, in target, per Aein's steer.
 * ---------------------------------------------------------------------- */
retainerPage({
  page:13, eyebrow:'RETAINER · TWELVE MONTHS', icon:'eyebrow_p12.png',
  title:'Managed Partner Development',
  subtitle:'Build and run a reseller channel. Roster under management is what we commit; partners issuing offers is what we report.',
  entry:'WHY TWELVE MONTHS — ramp from first outreach to first partner transaction models at 8 months, which is what sets the term.',
  commitLine:'A named channel manager recruiting and managing the roster at the rung’s cap, a CPPO deal desk at the rung’s turnaround with selling authorizations drafted, issued and tracked, training on cadence, channel reviews with sourced-pipeline and attribution reporting, and Kiflo Core operated inside the fee.',
  targetLine:'Partners issuing offers — the headline number — plus partner-sourced pipeline and revenue. Each partner clears its own AWS gate.',
  note:'AWS permits only one partner identifier per resource, so partner attribution runs on user agent string rather than competing tags. [CPPO boundary with Managed Marketplace Operations — originated here, executed on the listing there — to confirm.]',
  rungList:[
    { name:'Establish', price:'$2,500 / mo', head:'Stand the channel up.',
      commit:[
        'Up to (6) net new partners recruited and under management',
        'Twice-yearly partner training and enablement sessions held',
        'CPPO deal desk — 1 business day turnaround; recurring selling authorizations drafted, issued and tracked in AWS Marketplace',
        'Quarterly channel reviews with sourced-pipeline and attribution reporting',
        'Kiflo Core stood up and operated inside the fee; PRM attribution configured for the channel',
      ],
      target:[
        'Partners issuing offers — reported monthly',
        'Each partner clears its own AWS gate: seller registration, tax interview, disbursement, service-linked role',
        'Partner-sourced pipeline and revenue',
      ] },
    { name:'Expand', price:'$5,000 / mo', head:'Widen the roster under management.',
      commit:[
        'Up to (12) net new partners recruited and under management',
        'Quarterly partner training and enablement sessions',
        'CPPO deal desk — 8 business hour turnaround',
        'Monthly channel reviews with sourced-pipeline and attribution reporting',
        'Kiflo Core operated inside the fee; PRM attribution maintained across the roster',
      ],
      target:[
        'Partners issuing offers — reported monthly',
        'Each partner clears its own AWS gate — the partner’s act, not OBP’s',
        'Partner-sourced pipeline and revenue',
      ] },
    { name:'Accelerate', price:'$7,500 / mo', head:'Operate the channel end to end.',
      commit:[
        'No cap on net new partners recruited and under management',
        'Monthly partner training and enablement sessions',
        'CPPO deal desk — 4 business hour turnaround',
        'Fortnightly channel reviews with sourced-pipeline and attribution reporting',
        'Kiflo Core operated inside the fee; PRM attribution maintained across the roster',
      ],
      target:[
        'Partners issuing offers — reported monthly',
        'Each partner clears its own AWS gate — the partner’s act, not OBP’s',
        'Partner-sourced pipeline and revenue',
      ] },
  ],
});

/* 14 — How every number is settled (NEW) --------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE SCOREBOARD', eyebrowIcon:'eyebrow_p14.png',
  title:'No number without a source.',
  subtitle:'Every target is settled from data that sits on Automatum’s side of the chain. Agree the source before the first report, not after.',
  page:14 });
table(s, [
  ['ACE opportunities accepted','AWS Partner Central — [whose instance, to confirm]','Monthly'],
  ['AWS-attributed pipeline','Partner Central / ACE export, drawn by OBP','Monthly'],
  ['Private offers issued','Automatum’s seller account','Monthly'],
  ['Marketplace revenue and disbursements','AWS seller reporting, reconciled by OBP','Monthly, against AWS statements'],
  ['Partners issuing offers','Kiflo — system of record','Monthly'],
  ['Partner-registered deals','Kiflo','Monthly'],
  ['Evidence for each commitment','Dated pack, action log, Kiflo activity log, monthly report','Per commitment'],
], { top:190, labelX:59, labelW:255, valueX:330, valueW:330, pitch:26, size:10,
     header:['The metric','The source, and who draws it','Cadence', 690] });
s.addText([{ text:'Targets. Not guaranteed. Set from the customer’s baseline at onboarding, shown against actuals from month one.  ', options:{ color:C.subtle } },
           { text:'[Remedy] applies to commitments only.', options:{ color:C.orange } }],
  { isTextBox:true, margin:0, x:P(59), y:P(412), w:P(850), h:P(16), fontFace:F.light, fontSize:9 });
band(s, 'ON EVERY ARTIFACT', 'Both lines above appear on every customer overview and deck, so no target is ever mistaken for a commitment.');

/* 15 — Part Three divider ------------------------------------------------ */
s = pptx.addSlide();
divider(s, 'PART THREE', 'The machinery', 'What sits behind the four, for us and for AWS.',
  ['Value chain','Components','Economics','The decision'], 'bg_divider3.jpg',
  [['tile_a','tile_b'],['tile_c','tile_h'],['tile_d','tile_i'],['tile_a','tile_e']], 15);

/* 16 — Value chain ------------------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'ONE PLATFORM, FOUR STAGES', eyebrowIcon:'eyebrow_p10.png',
  title:'Automatum is the common thread.',
  subtitle:'Each solution puts OBP on a different stage of the same chain — and the boundary row is what keeps them four.',
  page:16 });
matrix(s,
  ['STAGE','AUTOMATUM','OBP','THE BOUNDARY'],
  ['Get listed','Run the partnership','Operate the Marketplace','Build the channel'],
  [
    ['The listing the product publishes to','The Marketplace platform compliance and co-sell work transacts on','The listing, the private offers, and the CRM and Partner Central integrations','The selling authorizations, the private offers and the AWS attribution'],
    ['Seller of record on every transaction','Seller of record','Issues every private offer','Issues partner offers and selling authorizations'],
    ['The review, the remediation, the FTR and the seller registration','Program management, compliance, marketing, events, ACE and co-sell','Compliance engineering, the offer desk, reporting and listing configuration','Recruitment, agreements, enablement, training, the desk and the reviews'],
    ['Listing production as a fixed-fee project, nothing ongoing','The AWS partnership programme, and the ISV’s own BOX Program listings','Listing production AND twelve months of operation; CPPO executed on the listing','Partner recruitment and management; CPPO originated with partners'],
  ],
  { top:180, labelX:51.8, labelW:88, x0:150, pitch:196, colW:176, size:8, rowH:[62,40,66,52], headSize:10.5 });
band(s, 'STACKING RULE', 'Where a customer buys two, the higher solution’s commit column governs the overlap, and the same work is not billed twice.');

/* 17 — Components -------------------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'COMPONENTS BEHIND THE LISTING', eyebrowIcon:'eyebrow_p8.png', eyebrowColor:C.blueEye,
  title:'Licensed and operated inside the fee.',
  subtitle:'Costs live in the models and in this register alone — a percentage discloses an amount as surely as the amount does.',
  page:17 });
table(s, [
  ['ASecureCloud','Automates data collection for a Well-Architected review, suggests answers, and generates CloudFormation and AWS CLI templates that resolve findings.','Licensed and operated by OBP. Premium required for Well-Architected reviews; licences reassign between accounts and are held as a pool.'],
  ['Kiflo','Partner system of record: portal, onboarding, deal registration, commission tracking. Core carries HubSpot and Salesforce sync.','Kiflo Core stood up and operated by OBP inside Managed Partner Development at every tier, included in the engagement fee. System of record behind the partners-issuing-offers count, and carries PRM attribution across the roster. [Seats per rung — to confirm.]'],
  ['Archera','Commitment management for AWS spend — insured reservations and savings plans.','Carried under OBP’s own agreement and sold on its own motion. It appears in no artifact of these four solutions, and must not leak into the revenue share.'],
], { top:192, labelX:59, labelW:110, valueX:180, valueW:300, pitch:74, size:9, x3:510 });
band(s, 'NOT YET NAMED', 'No component is named for Alliances or Operations, and no Automatum software for the software line of any of the four listings. Name them, or mark them confirmed-empty.');

/* 18 — Partner economics (NEW) ------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'PARTNER ECONOMICS', eyebrowIcon:'eyebrow_p12.png',
  title:'What we owe each other.',
  subtitle:'Automatum is seller of record and owns the listed software in all four. No numbers here before the call — this is the agenda for it.',
  page:18 });
table(s, [
  ['Flow of funds and payment trigger','AWS disbursement to Automatum vs invoice at [N] days; who carries the float, including the Accelerator’s 50/50','Both · to agree'],
  ['Revenue split, software line','Follows the licensor','Both · to agree'],
  ['Revenue split, professional services line','Follows the delivering party','Both · to agree'],
  ['Marketplace listing fee','Rates, mechanics and how it is netted','Automatum · to confirm'],
  ['Milestone cash and credits','Figures are established; the division is not. Credits are worth face value only to the party with spend to offset','Both · to agree'],
  ['Milestone 3 — the 55 leads','Confirm the direction before agreeing who owns them','Both · to confirm'],
  ['Component cost recovery','ASecureCloud and Kiflo, stress-tested against the $1,500 rung','OBP · to model'],
  ['Back-to-back internal SLAs','Offer issue, listing configuration, selling authorizations, ACE instance, reporting feed','Automatum · needed first'],
  ['Renewal, churn and exit','Ownership of partner agreements and Kiflo channel data at end of term','Both · to agree'],
  ['Exclusivity and reporting access','Scope boundary, and OBP’s access to Marketplace seller reporting','Both · to agree'],
], { top:180, labelX:59, labelW:190, valueX:262, valueW:415, pitch:22, size:8.5, x3:700,
     header:['Term','What has to be settled','Owner and status', 700] });
band(s, 'NOT CUSTOMER-FACING', 'The fee and the ladder are only validated once the split is known — so these terms come before any repricing.');

/* 19 — The exchange ------------------------------------------------------ */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE EXCHANGE', eyebrowIcon:'eyebrow_p12.png',
  title:'What the program funds, and what AWS gets back.',
  subtitle:'The four Automatum × OBP solutions’ own milestones. Cash and credits are separate instruments, up to the amounts shown.',
  page:19 });
[['$10,000 + $10,000','Milestone 1, cash + credits'],['$25,000 + $25,000','Milestone 2, cash + credits'],
 ['55','Project leads generated for the participant via a sponsored AWS marketing campaign — Milestone 3, AWS-funded.'],
 ['5 per solution','ACE opportunity submissions — the programme’s obligation to AWS']].forEach(([big, lbl], i) => {
  const x = 73.4 + i*221;
  txt(s, big, { x:P(x), y:P(186), w:P(200), h:P(26), fontFace:F.bold, bold:true, fontSize:16, color:C.ink });
  txt(s, lbl, { x:P(x), y:P(215), w:P(200), h:P(50), fontSize:8.5 });
});
txt(s, 'THE RULE — each solution carries its own Solution ID and its own five ACE submissions; an opportunity belongs to one solution. Milestone apportionment between OBP and Automatum is open — see partner economics.',
  { x:P(51.8), y:P(274), w:P(856), h:P(16), fontSize:8.5, color:C.body });
columns(s, [
  { head:'Four transacting listings', text:'Four solutions listed and transacting through AWS Marketplace on Automatum’s listing.' },
  { head:'Twenty ACE submissions', text:'Five per solution across the set. A customer’s own submissions follow their opportunity flow and are not an entitlement of five.' },
  { head:'A named alliance owner', text:'Co-sell and program progression run through a named owner on every engagement.' },
], { top:304, headSize:13, bodySize:9, height:142 });
band(s, 'TWO PARTICIPATIONS, ONE SCHEDULE', 'These are OUR four solutions’ milestones. An ISV pursuing its own BOX Program listings earns the same schedule separately — see Managed AWS Alliances. Same figures, different participant, not the same money.');

/* 20 — The sequence (NEW) ------------------------------------------------ */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE SEQUENCE', eyebrowIcon:'eyebrow_p13.png',
  title:'Evidence first, then scale.',
  subtitle:'Sequence, rather than four at once. The split is the value chain down the middle, and it pairs each retainer with the work that precedes it.',
  page:20 });
[
  { t:'WAVE ONE', sol:'Marketplace Compliance Accelerator  +  Managed AWS Alliances',
    stage:'Get listed  →  Run the partnership',
    rows:['2 feasibility studies','2 milestone plans','10 ACE submissions'],
    why:'The Accelerator is the only fixed, provable delivery in the portfolio — the cheapest feasibility study to write and the fastest route to Milestone 1 evidence. It also produces the listing Alliances runs the partnership around.' },
  { t:'WAVE TWO', sol:'Managed Marketplace Operations  +  Managed Partner Development',
    stage:'Operate the Marketplace  →  Build the channel',
    rows:['2 feasibility studies','2 milestone plans','10 ACE submissions'],
    why:'Opens on wave one’s Milestone 1 approval — the only gate consistent with arriving with evidence. Both depend on a listing that is already live and transacting.' },
].forEach((w, i) => {
  const x = 80.6 + i*430;
  txt(s, w.t, { x:P(x), y:P(190), w:P(390), h:P(16), fontFace:F.bold, bold:true, fontSize:11, color:C.orange, charSpacing:1.4 });
  txt(s, w.sol, { x:P(x), y:P(210), w:P(390), h:P(34), fontFace:F.bold, bold:true, fontSize:13, color:C.ink });
  txt(s, w.stage, { x:P(x), y:P(250), w:P(390), h:P(16), fontSize:9.5, color:C.blueEye });
  block(s, w.rows, { x:P(x), y:P(274), w:P(390), h:P(50), fontSize:9 });
  txt(s, w.why, { x:P(x), y:P(332), w:P(390), h:P(70), fontSize:9 });
});
txt(s, 'TWO CONDITIONS PRINTED ON THIS SLIDE', { x:P(80.6), y:P(408), w:P(400), h:P(14),
  fontSize:8, fontFace:F.bold, bold:true, color:C.orange, charSpacing:1 });
block(s, [
  'Wave one assumes capacity to run two feasibility studies and two milestone plans concurrently. [Capacity to confirm — if it is genuinely one at a time, wave one splits.]',
  'The whole recommendation is contingent on the 12-month listing clock running per Solution ID from entry. If it runs programme-level, sequencing burns the clock rather than staggering it, and the sequence changes.',
], { x:P(80.6), y:P(424), w:P(830), h:P(40), fontSize:8.5, color:C.subtle });

/* 21 — The decision ------------------------------------------------------ */
s = pptx.addSlide();
chrome(s, { eyebrow:'THE DECISION', eyebrowIcon:'eyebrow_p13.png',
  title:'Five decisions, today.',
  subtitle:'The sequence, the lead partner of record, the back-to-back turnarounds, the CPPO boundary, and wave one’s date.',
  page:21 });
table(s, [
  ['Validated or Differentiated held by the lead partner','Automatum','Stated by Automatum — Partner Central evidence to attach'],
  ['Automatum is lead partner of record on all four Solution IDs','Automatum','To confirm'],
  ['Solution listed within 12 months','Automatum + OBP','[Per-wave deadlines once the clock basis is confirmed]'],
  ['Five ACE opportunity submissions per solution','OBP','Built into each solution’s plan'],
  ['Milestone 1 Feasibility Study per solution','OBP','Drafted from the overviews'],
  ['Retainer outcomes per rung','OBP','Set — all three retainers'],
  ['Staffing, bands and overflow rates behind every rung','OBP','To capacity-test and price before any customer artifact'],
  ['Automatum back-to-back turnarounds','Automatum','Needed before any turnaround is published'],
  ['CPPO boundary — Operations vs Partner Development','OBP + Automatum','To confirm'],
  ['Commercial terms between OBP and Automatum','OBP + Automatum','On the agenda for [call date]'],
], { top:176, labelX:59, labelW:330, valueX:405, valueW:150, pitch:21, size:9, x3:580,
     header:['Entry condition or item','Owner','Standing', 580] });
txt(s, 'Stage and partner tier are separate axes. The gate the deck names is Validated or Differentiated, which Differentiated satisfies on its own — attach the stage and tier as shown on Partner Central, the Partner ID, the date checked, and any expiry.',
  { x:P(59), y:P(418), w:P(850), h:P(28), fontSize:8.5, color:C.subtle });
band(s, 'THE ASK', 'Approve the two-wave sequence, confirm the lead partner of record, agree the back-to-back turnarounds and the CPPO boundary, and calendar wave one’s Milestone 1 for [date].');

/* 22 — Where everything lives -------------------------------------------- */
s = pptx.addSlide();
chrome(s, { eyebrow:'WHERE EVERYTHING LIVES', eyebrowIcon:'eyebrow_p14.png',
  title:'The set, and how it travels.',
  subtitle:'Each overview and deck stands alone and can go to a customer; this deck and the catalog page stay internal.',
  page:22 });
columns(s, [
  { head:'Customer-facing', text:'Four overviews and four decks per partner — each names its own solution only, and ships only when its brackets are closed.' },
  { head:'Internal', text:'The catalog page and this deck: the side-by-side view, the four-buyers page, the commit / target sets, the components register, partner economics, the sequence and the BOX figures.' },
  { head:'The mirror', text:'The two partner sets match exactly, name aside, and the sweep asserts it on every run.' },
], { top:200, panels:true, headSize:15, bodySize:9.5, height:150 });
txt(s, 'THE RENAME CASCADE — PRICE IT BEFORE APPROVING', { x:P(51.8), y:P(392), w:P(500), h:P(14),
  fontSize:8, fontFace:F.bold, bold:true, color:C.orange, charSpacing:1 });
txt(s, 'The mirror rule means any rung rename — Expand to Activate, say — re-cuts up to four overviews and four decks per partner: sixteen artifacts, plus anything already drafted for a Solution ID or milestone submission. Weigh that before approving the renames, not after.',
  { x:P(51.8), y:P(408), w:P(856), h:P(34), fontSize:9 });
band(s, 'PUBLISHING RULE', 'Bracketed placeholders live in the internal deck and never appear in a customer overview or deck.');

/* ---------------------------------------------------------------- write */
const out = path.join(__dirname, 'BOX_Solutions_Revised.pptx');
pptx.writeFile({ fileName: out }).then(() => console.log('wrote', out, '—', TOTAL, 'slides'));
