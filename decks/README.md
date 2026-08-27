# Archera for Automatum — AWS Alliance Advisory brief

`Archera-for-Automatum.pptx` — a 20-slide partner brief on putting Archera to work for
Automatum, a cloud-marketplace management platform for ISVs with 80+ customers on AWS.

Written for an AWS-fluent reader: the commitment mechanic is one dense reference slide
(slide 2 — structure, discount ladder, the two settlement paths, the liability bar), and
the deck spends its space on the decisions Automatum actually has to make — the business
case (3–5), the opportunity sized against the base (6–7), the five motions with two slides
on presales insertion and base sequencing (8–15), how the money moves through CPPO (16),
and proof, activation and the honest caveats (17–20). Every slide carries speaker notes;
the notes hold the plain-language framing for a less technical audience the deck may be
forwarded to.

`build-archera-for-automatum.cjs` regenerates the deck, so edits can be made in source
rather than in PowerPoint:

```
npm install pptxgenjs
node build-archera-for-automatum.cjs Archera-for-Automatum.pptx
```

## Before circulating

Three things need a human decision:

1. **Slide 17 uses figures from Archera's customer reference pack, which is marked
   confidential and do-not-distribute.** Only the anonymised, vertical-level rows are
   used, and the named enterprise reference in that pack has been deliberately left out.
   Confirm clearance with Archera — and ask whether the named reference can be added.
2. **The Automatum figures on slide 5** (80+ ISVs, $120M+ marketplace revenue, operating
   since 2021, four marketplaces, ~14 days to first listing) come from Automatum's
   published positioning and should be verified against what the company says today.
3. **Slides 10 and 16 map against published material.** The presales stages on slide 10
   follow Automatum's published motion — swap in the real internal stage names. The CPPO
   flow on slide 16 follows Archera's partner positioning — the rev-share rate and terms
   are not quoted in any source behind this deck and must be confirmed with Archera.

The sizing model on slide 6 is illustrative by design. Every assumption is printed on the
slide; replacing the average-spend anchor with real billing data from even ten accounts
tightens the whole model.
