# Archera for Automatum — AWS Alliance Advisory brief

`Archera-for-Automatum.pptx` — a 20-slide partner brief on putting Archera to work for
Automatum, a cloud-marketplace management platform for ISVs with 80+ customers on AWS.

Structure: the Archera mechanic first (slides 2–5), then the Automatum business case
(6–8), the opportunity sized against the 80+ base (9–10), five use cases led by the
attach motion (11–16), and proof, activation and the honest caveats (17–20). Every slide
carries speaker notes.

`build-archera-for-automatum.js` regenerates the deck, so edits can be made in source
rather than in PowerPoint:

```
npm install pptxgenjs
node build-archera-for-automatum.js Archera-for-Automatum.pptx
```

## Before circulating

Two things need a human decision:

1. **Slide 17 uses figures from Archera's customer reference pack, which is marked
   confidential and do-not-distribute.** Only the anonymised, vertical-level rows are
   used, and the named enterprise reference in that pack has been deliberately left out.
   Confirm clearance with Archera — and ask whether the named reference can be added.
2. **The Automatum figures on slide 8** (80+ ISVs, $120M+ marketplace revenue, operating
   since 2021, four marketplaces, ~14 days to first listing) come from Automatum's
   published positioning and should be verified against what the company says today.

The sizing model on slide 9 is illustrative by design. Every assumption is printed on the
slide; replacing the average-spend anchor with real billing data from even ten accounts
tightens the whole model.
