# BOX Solutions — revised deck

`BOX_Solutions_Revised.pptx` — the 22-slide revision specified in
[`../box-deck-revision-spec.md`](../box-deck-revision-spec.md), built from the design system of the
original 14-slide export.

## Read this before using it

**This is a visual draft for the call, not a drop-in replacement for the production file.** We hold
only the exported PDF of the original deck, so this rebuild *approximates* the template — it does
not inherit its master, layouts or theme. Merging it into the real `.pptx` is a manual job.

**The spec is the authority on wording.** Where this deck and `box-deck-revision-spec.md` disagree,
the spec wins. Slide content here is compressed to fit: each rung column carries at most four
commit lines and three target lines, while the spec carries the full set.

**Every bracketed figure — `[N]`, `[$X]`, `[date]` — is unset.** They are deliberate. The owner and
closing date for each sits in the spec's placeholder register (§8). No bracket may reach a
customer-facing overview or deck.

## Rebuilding

```bash
npm install pptxgenjs          # or set PPTX_LIB to an existing install
node build_deck.cjs            # writes BOX_Solutions_Revised.pptx
```

`build_deck.cjs` must keep the `.cjs` extension — the repo's `package.json` sets `"type": "module"`,
and the script is CommonJS.

`assets/` holds backgrounds, logos and icons extracted from the original PDF, so the build is
reproducible without the source file. It carries the deck's whole icon set, including nine icons the
current slides do not use (`icon_e`–`icon_l`, `tile_e`) — kept deliberately, so new slides can be
drawn from the same set rather than introducing foreign artwork.

## Design system, measured from the original

Canvas 960 × 540pt (13.333in × 7.5in).

| | |
|---|---|
| **Dark slides** (title, three dividers) | Navy photographic backgrounds, light text |
| **Light slides** (everything else) | Near-white ground, navy ink |
| Ink / body / subtle | `#15224B` / `#5B6378` / `#9AA2B5` |
| Eyebrow | `#F36F20`, blue variant `#2E7CC4` |
| Footer band | `#15224B` rounded strip, x 44.6, top 453.6, 870.7 × 44.6 |
| Table header / zebra / highlight | `#15224B` / `#F5F8FC` / `#FAEEE1`, rows 21.6pt |
| Chrome | eyebrow icon 20.2² at (44.6, 37.4) · eyebrow 11.5pt at (80.6, 42.3) · title 25pt at (51.8, 79) · subtitle 12.5pt at (51.8, 133) · band 466 · footer 514 |
| Columns | 4-col at x 80.6 / 301.6 / 522.5 / 743.5 · 3-col at 80.6 / 375.2 / 669.8 |
| Fonts | Segoe UI Bold / Semilight / Regular |

## A note on rendering here

Segoe UI is not installed in this environment, so LibreOffice substitutes DejaVu Sans, which is
**wider** at the same size. Any QA render is therefore a conservative check: text that fits in the
render will fit in Segoe UI in PowerPoint. Open the file in PowerPoint for a true view.
