#!/usr/bin/env python3
"""A browser viewer for the four BOX Milestone 1 feasibility studies.

Reads the four built .docx and walks word/document.xml in order, so the page shows
what the submission actually contains rather than a re-derivation of it. The Draft
Reference Architecture cell holds a picture; the matching SVG is inlined in its place.

Every [bracketed] open item is marked and counted — that is what a reviewer is here
to look at.

    python3 build_studies_viewer.py
"""

import os, re, sys, zipfile
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "diagrams"))
from build_diagrams import inline_svg          # noqa: E402  (unique marker ids per SVG)

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Wave and headline price mirror the table in 00_README-what-is-filled-and-what-is-not.md.
META = {
    "01": ("Wave one", "Fixed-fee project", "$10,000"),
    "02": ("Wave one", "Retainer, three tiers", "$2,500 / $5,000 / $7,500 a month"),
    "03": ("Wave two", "Retainer, three rungs", "$1,500 / $3,000 / $6,000 a month"),
    "04": ("Wave two", "Retainer, three rungs", "$2,500 / $5,000 / $7,500 a month"),
}
# every bracket is an unfilled field — including short ones like [N]
OPEN_ITEM = re.compile(r"\[[^\[\]]+?\]")


# ---------- reading the document ----------
def cell_paras(tc):
    out = []
    for p in tc.findall(W + "p"):
        if p.find(".//" + W + "drawing") is not None:
            out.append(("image", None))
            continue
        t = " ".join("".join(p.itertext()).split())
        if t:
            out.append(("text", t))
    return out


def label_of(tc):
    return " ".join("".join(tc.itertext()).split())


def read_study(path):
    root = etree.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    body = root.find(W + "body")
    title, sections, heading = "", [], None
    for el in body:
        tag = etree.QName(el).localname
        if tag == "p":
            style = el.find(W + "pPr/" + W + "pStyle")
            style = style.get(W + "val") if style is not None else ""
            t = " ".join("".join(el.itertext()).split())
            if style == "Heading3":
                heading = {"name": t, "rows": []}
                sections.append(heading)
            elif "Multi-Partner Feasibility Study" in t:
                title = t
        elif tag == "tbl" and heading is not None:
            for tr in el.findall(W + "tr"):
                tcs = tr.findall(W + "tc")
                if len(tcs) < 2:
                    continue
                value = tcs[1] if len(tcs) == 3 else tcs[-1]
                heading["rows"].append({"label": label_of(tcs[0]), "paras": cell_paras(value)})
    return title, sections


# ---------- rendering ----------
def esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def mark_open(t):
    """Escape, then flag every [bracketed] item so the unfilled fields read at a glance."""
    return OPEN_ITEM.sub(lambda m: f'<mark class="open">{m.group(0)}</mark>', esc(t))


def render_rows(rows, svg, is_feedback=False):
    """Row list to markup. Partner 3 and beyond collapses — the template carries the
    block, we have two partners, and nine 'Not applicable' rows bury everything else."""
    out, later_partner = [], []
    for r in rows:
        label = r["label"]
        if label.lower().startswith("partner 3 name"):
            later_partner.append(r)
            continue
        if later_partner:
            later_partner.append(r)
            continue
        out.append(render_row(r, svg, is_feedback))
    if later_partner:
        inner = "".join(render_row(r, svg, is_feedback) for r in later_partner)
        out.append(
            '<details class="fold"><summary><span class="foldlabel">Partner 3 and beyond'
            f'</span><span class="foldnote">Not applicable — two partners · {len(later_partner)}'
            f' rows</span></summary><div class="rows">{inner}</div></details>')
    return "".join(out)


def render_row(r, svg, is_feedback):
    body = []
    for kind, text in r["paras"]:
        if kind == "image":
            body.append(f'<figure>{svg}</figure>')
        elif is_feedback:
            body.append(f'<p class="instruction">{esc(text)}</p>')   # the template's own note
        else:
            body.append(f"<p>{mark_open(text)}</p>")
    if not body:
        body.append('<p class="empty">Blank.</p>')
    is_partner = bool(re.match(r"partner \d+ name", r["label"].lower()))
    cls = ' class="row partner"' if is_partner else ' class="row"'
    return (f'<div{cls}><div class="lab">{esc(r["label"])}</div>'
            f'<div class="val">{"".join(body)}</div></div>')


def main():
    studies, tabs = [], []
    for path in sorted(f for f in os.listdir(HERE) if re.match(r"0\d_.*\.docx$", f)):
        num = path[:2]
        title, sections = read_study(os.path.join(HERE, path))
        name = title.split("—", 1)[1].rsplit(":", 1)[0].strip()
        svg_path = next(f for f in os.listdir(os.path.join(HERE, "diagrams"))
                        if f.startswith(num) and f.endswith(".svg"))
        svg = inline_svg(open(os.path.join(HERE, "diagrams", svg_path)).read(), num, name)

        blocks, open_items = [], 0
        for sec in sections:
            feedback = sec["name"].strip().lower() == "aws feedback"
            if not feedback:
                open_items += sum(len(OPEN_ITEM.findall(t))
                                  for r in sec["rows"] for k, t in r["paras"] if k == "text")
            blocks.append(f'<section class="block"><h3>{esc(sec["name"])}</h3>'
                          f'<div class="rows">{render_rows(sec["rows"], svg, feedback)}</div>'
                          '</section>')

        wave, shape, price = META[num]
        studies.append(
            f'<article class="study" id="study-{num}"{"" if num == "01" else " hidden"}>'
            f'<header class="studyhead">'
            f'<p class="eyebrow"><span class="n">{num}</span>{esc(wave)} · {esc(shape)}</p>'
            f'<h2>{esc(name)}</h2>'
            f'<dl class="facts">'
            f'<div><dt>List price</dt><dd>{esc(price)}</dd></div>'
            f'<div><dt>Open items</dt><dd><b>{open_items}</b> bracketed fields still to fill'
            f'</dd></div>'
            f'</dl></header>{"".join(blocks)}</article>')
        tabs.append(f'<button type="button" role="tab" data-study="{num}" '
                    f'aria-selected="{"true" if num == "01" else "false"}" '
                    f'aria-controls="study-{num}"><span class="n">{num}</span>'
                    f'<span class="t">{esc(name)}</span></button>')
        print(f"  {num} {name:38s} {open_items:2d} open items, "
              f"{sum(len(s['rows']) for s in sections)} rows")

    tpl = open(os.path.join(HERE, "studies_viewer_template.html")).read()
    out = os.path.join(HERE, "studies_viewer.html")
    with open(out, "w") as fh:
        fh.write(tpl.replace("{{TABS}}", "".join(tabs)).replace("{{STUDIES}}", "".join(studies)))
    print("  viewer ->", out)


if __name__ == "__main__":
    main()
