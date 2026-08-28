# Archera for Automatum — AWS Alliance Advisory brief

`Archera-for-Automatum.pptx` — a 16-slide partner brief on putting Archera to work for
Automatum, a cloud-marketplace management platform for ISVs with 80+ customers on AWS.

Written for an AWS-fluent reader: the commitment mechanic is one dense reference slide
(slide 2 — structure, discount ladder, the two settlement paths, the liability bar), and
the deck spends its space on the decisions Automatum actually has to make — the business
case (3–5), the opportunity sized against the base (6–7), the three motions with the
attach run as presales insertion plus base sequencing (8–12), and proof, the 90-day plan,
the honest caveats, and a forwardable one-frame closer that doubles as the takeaway
(13–16). Every slide carries speaker notes;
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

1. **Slide 13 uses figures from Archera's customer reference pack, which is marked
   confidential and do-not-distribute.** Only the anonymised, vertical-level rows are
   used, and the named enterprise reference in that pack has been deliberately left out.
   Confirm clearance with Archera — and ask whether the named reference can be added.
2. **The Automatum figures on slide 5**  (80+ ISVs, $120M+ marketplace revenue, operating
   since 2021, four marketplaces, ~14 days to first listing) come from Automatum's
   published positioning and should be verified against what the company says today.
3. **Slide 8's presales stages follow Automatum's published motion** — swap in the real
   internal stage names. The commercial terms on slides 6, 11 and 12 now come from
   Archera's Distributor Partner Agreement template (Appendix A: Referral tier pays a
   one-time first-month-MRR bonus; Co-Seller tiers pay 20% / 25% / 30% recurring by
   GRI/GSP MRR band, monthly on marketplace net revenue, net-new entities only). The
   template is unsigned — execution, starting tier and the joint GTM plan remain open.

The deck standardises on Archera's own product name, **Guaranteed Commitments**
(defined on slide 2), and states on slide 15 that the guarantees are contractual and
reinsurance-backed rather than regulated insurance. A full visual and copy audit
(per-slide review, whole-deck consistency pass, fact audit against the source materials,
adversarial verification) was applied in v3 — findings and fixes are in the git history.

The sizing model on slide 6 is illustrative by design. Every assumption is printed on the
slide; replacing the average-spend anchor with real billing data from even ten accounts
tightens the whole model.
