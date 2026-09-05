#!/usr/bin/env python3
"""Draft reference architecture diagrams for the four BOX feasibility studies.

Each solution gets one diagram showing the partner delivery architecture: which AWS
systems the solution touches, and which partner owns each step. None of the four
builds software, so there is no infrastructure to draw — the lanes are the answer.

Solid means the partners commit to it. Dashed means AWS decides it, or it is not yet
confirmed. That is the same commit / target line the studies draw in prose.

Emits an SVG per solution and renders each to PNG with the headless Chromium in this
image. Both are committed: the SVG is the readable, greppable record of every word in
the diagram, which is what keeps the naming constraint checkable once the .docx side
is an opaque bitmap.

Type is Liberation Sans. The studies are set in Amazon Ember, AWS's own face, which is
not redistributable and is not installed here.

    python3 build_diagrams.py
"""

import os, re, subprocess
from PIL import Image, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SCALE = 3                       # render multiplier; 5.70 in wide lands at ~600 dpi
DOC_WIDTH_IN = 5.70             # the value cell's content width in the AWS template

CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"
TTF = {
    False: "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    True:  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
}
FAMILY = "Liberation Sans, Arial, Helvetica, sans-serif"

INK, MUTED, PAPER, HAIR = "#15224B", "#5B6378", "#FFFFFF", "#D8DDE8"

LANE = {
    "customer":  dict(name="ISV customer", rule="#6C7686", ground="#F3F4F7", ink="#3A424F"),
    "obp":       dict(name="OBP",          rule="#F36F20", ground="#FDF3EA", ink="#8A3B05"),
    "automatum": dict(name="Automatum",    rule="#15224B", ground="#EDF0F7", ink="#15224B"),
    "aws":       dict(name="AWS",          rule="#2E7CC4", ground="#F0F6FC", ink="#1B4F80"),
}

# grid ------------------------------------------------------------------------
CANVAS_W = 1140
PAGE_X = 16                     # page margin
LABEL_W = 142                   # lane-label gutter
CORRIDOR = 32                   # reserved on the right for return routing
COLS, COL_GAP = 4, 18
CONTENT_L = PAGE_X + LABEL_W
CONTENT_R = CANVAS_W - PAGE_X - CORRIDOR
COL_W = (CONTENT_R - CONTENT_L - (COLS - 1) * COL_GAP) / COLS
PAGE_W = CANVAS_W - 2 * PAGE_X
LOOP_X = CANVAS_W - PAGE_X - 10  # the return corridor's centre line


def col_x(i):
    return CONTENT_L + i * (COL_W + COL_GAP)


def col_w(span):
    return span * COL_W + (span - 1) * COL_GAP


# text ------------------------------------------------------------------------
_fonts = {}


def _font(size, bold):
    if (size, bold) not in _fonts:
        _fonts[(size, bold)] = ImageFont.truetype(TTF[bold], size)
    return _fonts[(size, bold)]


def measure(s, size, bold=False):
    return _font(size, bold).getlength(s)


def wrap(text, size, bold, maxw):
    """Greedy wrap on real FreeType advances — the same face Chromium will use."""
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if cur and measure(trial, size, bold) > maxw:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text_lines(x, y, lines, size, fill, bold=False, anchor="middle", lh=1.30):
    """A <text> block whose first baseline sits at y."""
    weight = ' font-weight="700"' if bold else ""
    out = [f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}"{weight} fill="{fill}" '
           f'text-anchor="{anchor}">']
    for i, ln in enumerate(lines):
        dy = 0 if i == 0 else size * lh
        out.append(f'<tspan x="{x:.1f}" dy="{dy:.1f}">{esc(ln)}</tspan>')
    out.append("</text>")
    return "".join(out)


# elements --------------------------------------------------------------------
class Node:
    """A box in a lane. Height follows the wrapped label; y comes from the layout."""

    PAD_X, PAD_Y, SIZE, LH, MIN_H = 11, 13, 22, 1.30, 60

    def __init__(self, nid, lane, col, span=1, text="", dashed=False, bold=False, row=0):
        self.id, self.lane, self.row, self.dashed, self.bold = nid, lane, row, dashed, bold
        self.x, self.w = col_x(col), col_w(span)
        self.lines = wrap(text, self.SIZE, bold, self.w - 2 * self.PAD_X)
        self.h = max(self.MIN_H, 2 * self.PAD_Y + len(self.lines) * self.SIZE * self.LH)
        self.y = 0

    @property
    def cx(self): return self.x + self.w / 2
    @property
    def cy(self): return self.y + self.h / 2
    @property
    def x2(self): return self.x + self.w
    @property
    def y2(self): return self.y + self.h
    @property
    def right(self): return (self.x2, self.cy)
    @property
    def left(self): return (self.x, self.cy)
    @property
    def top(self): return (self.cx, self.y)
    @property
    def bottom(self): return (self.cx, self.y2)

    def svg(self):
        rule = LANE[self.lane]["rule"]
        dash = ' stroke-dasharray="7 5"' if self.dashed else ""
        first = self.y + (self.h - len(self.lines) * self.SIZE * self.LH) / 2 + self.SIZE * 0.86
        return (f'<rect x="{self.x:.1f}" y="{self.y:.1f}" width="{self.w:.1f}" '
                f'height="{self.h:.1f}" rx="7" fill="{PAPER}" stroke="{rule}" '
                f'stroke-width="1.7"{dash}/>'
                + text_lines(self.cx, first, self.lines, self.SIZE,
                             LANE[self.lane]["ink"], self.bold))


class Chip:
    SIZE, PAD_X, H = 20, 12, 32

    def __init__(self, x, y, text, rule, ink, dashed=False):
        self.text, self.rule, self.ink, self.dashed = text, rule, ink, dashed
        self.x, self.y = x, y
        self.w = measure(text, self.SIZE) + 2 * self.PAD_X
        self.h = self.H

    def svg(self):
        dash = ' stroke-dasharray="6 4"' if self.dashed else ""
        return (f'<rect x="{self.x:.1f}" y="{self.y:.1f}" width="{self.w:.1f}" '
                f'height="{self.h}" rx="{self.h / 2:.0f}" fill="{PAPER}" stroke="{self.rule}" '
                f'stroke-width="1.4"{dash}/>'
                + text_lines(self.x + self.w / 2, self.y + self.h / 2 + self.SIZE * 0.35,
                             [self.text], self.SIZE, self.ink))


def group_box(x, y, w, h, rule, title=None, ink=None):
    out = [f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="9" '
           f'fill="{PAPER}" stroke="{rule}" stroke-width="1.7"/>']
    if title:
        out.append(text_lines(x + w / 2, y + 28, [title], 22, ink or rule, bold=True))
    return "".join(out)


def arrow(points, dashed=False, label=None, label_at=None, label_dy=-10, head=True,
          both=False, label_w=250):
    """A polyline with an arrowhead, and an optional label on a tight white halo."""
    dash = ' stroke-dasharray="8 6"' if dashed else ""
    d = "M " + " L ".join(f"{px:.1f} {py:.1f}" for px, py in points)
    end = ' marker-end="url(#arrow)"' if head else ""
    if both:
        end += ' marker-start="url(#arrow)"' 
    out = [f'<path d="{d}" fill="none" stroke="{MUTED}" stroke-width="2"{dash}{end}/>']
    if label:
        lx, ly = label_at or ((points[0][0] + points[-1][0]) / 2,
                              (points[0][1] + points[-1][1]) / 2)
        lines = wrap(label, 19, False, label_w)
        hw = max(measure(l, 19) for l in lines) / 2 + 8
        top = ly + label_dy - (len(lines) - 1) * 24 - 16
        out.append(f'<rect x="{lx - hw:.1f}" y="{top:.1f}" width="{2 * hw:.1f}" '
                   f'height="{len(lines) * 24 + 8:.0f}" fill="{PAPER}" fill-opacity="0.93"/>')
        out.append(text_lines(lx, ly + label_dy - (len(lines) - 1) * 24, lines, 19, MUTED,
                              lh=1.26))
    return "".join(out)


def legend_svg(y):
    parts, x = [], PAGE_X
    for dashed, caption in ((False, "Committed by the partners"),
                            (True, "AWS decides it, or it is not yet confirmed")):
        dash = ' stroke-dasharray="8 6"' if dashed else ""
        parts.append(f'<line x1="{x}" y1="{y}" x2="{x + 34}" y2="{y}" stroke="{MUTED}" '
                     f'stroke-width="2"{dash} marker-end="url(#arrow)"/>')
        parts.append(text_lines(x + 44, y + 7, [caption], 19, MUTED, anchor="start"))
        x += 44 + measure(caption, 19) + 46
    return "".join(parts)


# layout ----------------------------------------------------------------------
class Diagram:
    HEADER_H, STRIP_GAP, STRIP_BOTTOM = 72, 16, 18
    TITLE_SIZE, KICKER = 30, "Draft reference architecture · Milestone 1"

    def __init__(self, key, title, lanes, lane_area_h):
        self.key, self.title = key, title
        self.lanes, y = [], self.HEADER_H
        share = sum(l[1] for l in lanes)
        for name, weight, note in lanes:
            h = lane_area_h * weight / share
            self.lanes.append(dict(name=name, y=y, h=h, note=note))
            y += h
        self.by_lane = {l["name"]: l for l in self.lanes}
        self.lane_bottom = y
        self.nodes, self.over, self.under, self.strip_items = {}, [], [], []
        self.wave, self.unsettled = "", ""
        self._placed = False
        self.h = 0

    def add(self, *nodes):
        for n in nodes:
            self.nodes[n.id] = n
        return nodes[0] if len(nodes) == 1 else nodes

    ROW_GAP, LANE_PAD = 18, 24

    def place(self):
        """Grow each lane to fit its rows, restack, then centre the rows in the band.

        A lane that is shorter than its content lets nodes bleed into the next
        partner's band, which reads as the wrong partner owning the step."""
        if self._placed:
            return self
        for lane in self.lanes:
            rows = {}
            for n in self.nodes.values():
                if n.lane == lane["name"]:
                    rows.setdefault(n.row, []).append(n)
            lane["rows"] = rows
            heights = [max(n.h for n in rows[r]) for r in sorted(rows)]
            lane["need"] = (sum(heights) + self.ROW_GAP * (len(heights) - 1)
                            + 2 * self.LANE_PAD) if heights else 0
        y = self.HEADER_H
        for lane in self.lanes:
            lane["y"], lane["h"] = y, max(lane["h"], lane["need"])
            y += lane["h"]
        self.lane_bottom = y
        for lane in self.lanes:
            rows = lane["rows"]
            if not rows:
                continue
            order = sorted(rows)
            heights = [max(n.h for n in rows[r]) for r in order]
            ny = lane["y"] + (lane["h"] - (sum(heights)
                                           + self.ROW_GAP * (len(order) - 1))) / 2
            for r, h in zip(order, heights):
                for n in rows[r]:
                    n.y = ny + (h - n.h) / 2
                ny += h + self.ROW_GAP
        self._placed = True
        return self

    # --- annotation strip ---
    def note(self, text):
        self.strip_items.append(("note", wrap(text, 19, False, PAGE_W)))

    def chips(self, items):
        """items: (text, lane key or None for muted, dashed). Flows and wraps."""
        self.strip_items.append(("chips", items))

    def _strip_layout(self):
        rows, h = [], 0
        for kind, payload in self.strip_items:
            if kind == "note":
                rows.append(("note", payload, h))
                h += len(payload) * 24 + 10
            else:
                line, x = [], PAGE_X
                for text, key, dashed in payload:
                    rule = LANE[key]["rule"] if key else MUTED
                    ink = LANE[key]["ink"] if key else MUTED
                    ch = Chip(x, 0, text, rule, ink, dashed)
                    if line and x + ch.w > PAGE_X + PAGE_W:
                        rows.append(("chips", line, h))
                        h += 40
                        x = PAGE_X
                        ch = Chip(x, 0, text, rule, ink, dashed)
                        line = []
                    line.append(ch)
                    x += ch.w + 12
                if line:
                    rows.append(("chips", line, h))
                    h += 40
        rows.append(("legend", None, h))
        h += 30
        return rows, h

    def svg(self):
        self.place()
        rows, strip_h = self._strip_layout()
        strip_top = self.lane_bottom + self.STRIP_GAP
        self.h = strip_top + strip_h + self.STRIP_BOTTOM

        out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_W}" '
               f'height="{self.h:.0f}" viewBox="0 0 {CANVAS_W} {self.h:.0f}" '
               f'font-family="{FAMILY}">',
               '<defs>'
               f'<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
               f'markerHeight="7" orient="auto-start-reverse">'
               f'<path d="M 0 1 L 10 5 L 0 9 z" fill="{MUTED}"/></marker>'
               '</defs>',
               f'<rect width="{CANVAS_W}" height="{self.h:.0f}" fill="{PAPER}"/>']

        # header — title left, kicker right, shrunk to fit if it must be
        size = self.TITLE_SIZE
        while measure(self.title, size, True) > PAGE_W - measure(self.KICKER, 19) - 40 \
                and size > 20:
            size -= 1
        out.append(text_lines(PAGE_X, 42, [self.title], size, INK, bold=True, anchor="start"))
        out.append(text_lines(CANVAS_W - PAGE_X, 40, [self.KICKER], 19, MUTED, anchor="end"))
        out.append(f'<line x1="{PAGE_X}" y1="{self.HEADER_H - 14}" x2="{CANVAS_W - PAGE_X}" '
                   f'y2="{self.HEADER_H - 14}" stroke="{HAIR}" stroke-width="1.4"/>')

        # lane bands and labels
        for lane in self.lanes:
            spec = LANE[lane["name"]]
            out.append(f'<rect x="{PAGE_X}" y="{lane["y"]:.1f}" width="{PAGE_W}" '
                       f'height="{lane["h"]:.1f}" fill="{spec["ground"]}"/>')
            out.append(f'<rect x="{PAGE_X}" y="{lane["y"]:.1f}" width="5" '
                       f'height="{lane["h"]:.1f}" fill="{spec["rule"]}"/>')
            label = wrap(spec["name"], 21, True, LABEL_W - 26)
            note = wrap(lane["note"], 17, False, LABEL_W - 28) if lane["note"] else []
            block = len(label) * 28 + (8 + len(note) * 22 if note else 0)
            ty = lane["y"] + (lane["h"] - block) / 2 + 20
            out.append(text_lines(PAGE_X + 14, ty, label, 21, spec["ink"], bold=True,
                                  anchor="start", lh=1.27))
            if note:
                out.append(text_lines(PAGE_X + 14, ty + len(label) * 28 + 4, note, 17,
                                      spec["ink"], anchor="start", lh=1.30))

        out.extend(self.under)
        out.extend(n.svg() for n in self.nodes.values())
        out.extend(self.over)

        # annotation strip
        out.append(f'<line x1="{PAGE_X}" y1="{strip_top - 2:.1f}" x2="{CANVAS_W - PAGE_X}" '
                   f'y2="{strip_top - 2:.1f}" stroke="{HAIR}" stroke-width="1.4"/>')
        for kind, payload, dy in rows:
            y = strip_top + dy
            if kind == "note":
                out.append(text_lines(PAGE_X, y + 26, payload, 19, MUTED, anchor="start",
                                      lh=1.26))
            elif kind == "chips":
                for ch in payload:
                    ch.y = y + 6
                    out.append(ch.svg())
            else:
                out.append(legend_svg(y + 20))
        out.append("</svg>")
        return "\n".join(out)


# ---------- the four diagrams ----------
def d01():
    d = Diagram("01_Marketplace-Compliance-Accelerator", "Marketplace Compliance Accelerator",
                [("customer", 112, None),
                 ("obp", 198, "14–18 business days of delivery"),
                 ("automatum", 150, None),
                 ("aws", 168, None)], 640)
    d.wave, d.unsettled = "Wave one", "AWS&rsquo;s review queue governs the FTR decision date."
    N = d.add
    c1 = N(Node("c1", "customer", 0, 1, "ISV product in the customer's AWS account"))
    c2 = N(Node("c2", "customer", 1, 1, "Customer engineering — remediation hours"))
    c3 = N(Node("c3", "customer", 3, 1, "Enterprise buyer procures through AWS Marketplace"))
    o1 = N(Node("o1", "obp", 0, 1, "Automated Well-Architected data collection"))
    o2 = N(Node("o2", "obp", 1, 1, "Remediation applied — CloudFormation and CLI templates"))
    o3 = N(Node("o3", "obp", 2, 1, "FTR prepared and submitted"))
    o4 = N(Node("o4", "obp", 3, 1, "Listing built, configured and published"))
    a1 = N(Node("a1", "automatum", 2, 1, "Seller registration completed"))
    a2 = N(Node("a2", "automatum", 3, 1, "Listing and seller-of-record account in AMMP"))
    w1 = N(Node("w1", "aws", 0, 1, "AWS Well-Architected Tool"))
    w2 = N(Node("w2", "aws", 1, 1, "Foundational Technical Review", dashed=True))
    w3 = N(Node("w3", "aws", 3, 1, "AWS Marketplace — published, transacting listing"))
    d.place()

    A = d.over
    A.append(arrow([c1.bottom, (c1.cx, o1.y)]))
    A.append(arrow([c2.bottom, (c2.cx, o2.y)]))
    A.append(arrow([(o1.cx, o1.y2), (o1.cx, w1.y)], both=True))
    for a, b in ((o1, o2), (o2, o3), (o3, o4)):
        A.append(arrow([a.right, (b.x, b.cy)]))
    rail = max(n.y2 for n in (o1, o2, o3, o4)) + 26
    A.append(arrow([(o3.cx, o3.y2), (o3.cx, rail), (w2.cx, rail), (w2.cx, w2.y)], dashed=True))
    A.append(arrow([(o4.cx, o4.y2), (a2.cx, a2.y)]))
    A.append(arrow([a1.right, (a2.x, a2.cy)]))
    A.append(arrow([(a2.cx, a2.y2), (w3.cx, w3.y)]))
    A.append(arrow([w3.right, (LOOP_X, w3.cy), (LOOP_X, c3.cy), (c3.x2, c3.cy)]))

    d.note("AWS's review queue governs the FTR decision date. Architecture diagrams are "
           "maintained in AMMP to evidence the \"Deployed on AWS\" badge.")
    return d


def d02():
    d = Diagram("02_Managed-AWS-Alliances", "Managed AWS Alliances",
                [("customer", 118, None),
                 ("obp", 196, "Twelve months, three additive tiers"),
                 ("automatum", 162, None),
                 ("aws", 190, None)], 680)
    d.wave, d.unsettled = "Wave one", "which Partner Central instance ACE opportunities are filed from."
    N = d.add
    c1 = N(Node("c1", "customer", 0, 1, "ISV — CRO and CEO"))
    c2 = N(Node("c2", "customer", 3, 1, "Programme benefits captured — MDF, credits, "
                                        "co-sell leads"))
    o1 = N(Node("o1", "obp", 0, 1, "Director of Alliances — named owner and named backup",
                bold=True))
    o2 = N(Node("o2", "obp", 1, 1, "Reviews minuted, quarterly AWS plans, monthly reporting"))
    o3 = N(Node("o3", "obp", 2, 1, "Programme applications prepared and filed"))
    a1 = N(Node("a1", "automatum", 0, 1, "Listing and seller-of-record position"))
    a2 = N(Node("a2", "automatum", 1, 1, "ACE opportunities filed from — Partner Central "
                                         "instance to confirm", dashed=True))
    d.place()

    lane = d.by_lane["aws"]
    names = ["ACE opportunities", "ISV Accelerate", "Competency", "MDF", "BOX Program listing"]
    gx, gw = col_x(2), col_w(2)
    rows, line, used = [], [], 0
    for n in names:
        cw = measure(n, Chip.SIZE) + 2 * Chip.PAD_X
        if line and used + cw + 10 > gw - 24:
            rows.append((line, used)); line, used = [], 0
        line.append((n, cw)); used += cw + 10
    rows.append((line, used))
    gh = 44 + len(rows) * 36
    gy = lane["y"] + (lane["h"] - gh) / 2
    d.under.append(group_box(gx, gy, gw, gh, LANE["aws"]["rule"], "AWS Partner Central",
                             LANE["aws"]["ink"]))
    for i, (line, used) in enumerate(rows):
        x = gx + (gw - (used - 10)) / 2
        for n, cw in line:
            d.over.append(Chip(x, gy + 38 + i * 36, n, LANE["aws"]["rule"],
                               LANE["aws"]["ink"]).svg())
            x += cw + 10

    A = d.over
    A.append(arrow([o1.top, (o1.cx, c1.y2)]))
    A.append(arrow([o1.right, (o2.x, o2.cy)]))
    A.append(arrow([o2.right, (o3.x, o3.cy)]))
    A.append(arrow([(o3.cx, o3.y2), (o3.cx, gy)]))
    A.append(arrow([(a1.cx, a1.y), (a1.cx, o1.y2)]))
    A.append(arrow([(a2.cx, a2.y2), (a2.cx, gy + 24), (gx, gy + 24)], dashed=True))
    A.append(arrow([(gx + gw, gy + gh / 2), (LOOP_X, gy + gh / 2), (LOOP_X, c2.cy),
                    (c2.x2, c2.cy)], dashed=True))

    d.note("The partners commit the machinery — a named owner, a fixed cadence, and a filed "
           "application trail. AWS decides acceptance, MDF availability, listings approved "
           "and AWS-sourced leads.")
    return d


def d03():
    d = Diagram("03_Managed-Marketplace-Operations", "Managed Marketplace Operations",
                [("customer", 118, None),
                 ("obp", 200, "50 / 100 / 200 offers a year by rung"),
                 ("automatum", 190, None),
                 ("aws", 190, None)], 720)
    d.wave, d.unsettled = "Wave two", "the CPPO boundary with Managed Partner Development."
    N = d.add
    c1 = N(Node("c1", "customer", 0, 1, "ISV revenue team — offer requested"))
    c2 = N(Node("c2", "customer", 3, 1, "Buyer or channel partner accepts — subscription"))
    o1 = N(Node("o1", "obp", 1, 1, "Offer desk drafts the offer", row=0))
    o2 = N(Node("o2", "obp", 0, 1, "Monthly operating pack — offers, revenue, listing health",
                row=1))
    a1 = N(Node("a1", "automatum", 2, 1, "Issued as seller of record", row=0))
    a2 = N(Node("a2", "automatum", 1, 1, "CRM and Partner Central integration", row=1))
    w1 = N(Node("w1", "aws", 3, 1, "AWS Marketplace — private offer or CPPO", row=0))
    w2 = N(Node("w2", "aws", 2, 1, "Marketplace and subscription data", row=1))
    d.place()

    A = d.over
    A.append(arrow([(c1.cx + 46, c1.y2), (c1.cx + 46, o1.cy), (o1.x, o1.cy)]))
    A.append(arrow([o1.right, (a1.cx, o1.cy), (a1.cx, a1.y)]))
    A.append(arrow([a1.right, (w1.cx, a1.cy), (w1.cx, w1.y)]))
    A.append(arrow([w1.right, (LOOP_X, w1.cy), (LOOP_X, c2.cy), (c2.x2, c2.cy)]))
    A.append(arrow([(w1.cx, w1.y2), (w1.cx, w2.cy), (w2.x2, w2.cy)]))
    A.append(arrow([w2.left, (a2.cx, w2.cy), (a2.cx, a2.y2)]))
    A.append(arrow([a2.left, (o2.cx, a2.cy), (o2.cx, o2.y2)]))
    A.append(arrow([(c1.cx - 46, o2.y), (c1.cx - 46, c1.y2)]))

    d.chips([("Listing configuration changes — 5 / 3 / 1 business days by rung", "obp", False),
             ("Well-Architected reviews — 1 / 2 / 4 a year", "obp", False),
             ("CPPO boundary with Managed Partner Development — to confirm", None, True)])
    return d


def d04():
    d = Diagram("04_Managed-Partner-Development", "Managed Partner Development",
                [("customer", 116, None),
                 ("obp", 214, "Deal desk — 1 business day / 8 hours / 4 hours by rung"),
                 ("automatum", 168, None),
                 ("aws", 192, None)], 720)
    d.wave, d.unsettled = "Wave two", "whether a reseller can issue offers against Automatum&rsquo;s listing while Automatum is seller of record."
    N = d.add
    c1 = N(Node("c1", "customer", 0, 1, "Reseller partners"))
    c2 = N(Node("c2", "customer", 3, 1, "End customer transacts"))
    o1 = N(Node("o1", "obp", 0, 1, "Recruitment, agreements, training and enablement", row=0))
    o2 = N(Node("o2", "obp", 1, 1, "Partner system of record — deal registration, "
                                   "commissions, CRM sync", row=0))
    o3 = N(Node("o3", "obp", 0, 2, "Monthly report — partners issuing offers", row=1))
    a1 = N(Node("a1", "automatum", 2, 1, "Selling authorizations and CPPOs issued as seller "
                                         "of record", dashed=True))
    w1 = N(Node("w1", "aws", 3, 1, "AWS Marketplace — selling authorizations, CPPO"))
    w2 = N(Node("w2", "aws", 2, 1, "Partner Revenue Measurement — attribution on user agent "
                                   "string"))
    d.place()

    A = d.over
    A.append(arrow([o1.top, (o1.cx, c1.y2)]))
    A.append(arrow([c1.right, (o2.cx, c1.cy), (o2.cx, o2.y)]))
    A.append(arrow([o2.right, (a1.cx, o2.cy), (a1.cx, a1.y)]))
    A.append(arrow([a1.right, (w1.cx, a1.cy), (w1.cx, w1.y)]))
    A.append(arrow([w1.right, (LOOP_X, w1.cy), (LOOP_X, c2.cy), (c2.x2, c2.cy)]))
    A.append(arrow([w1.left, (w2.x2, w1.cy)]))
    A.append(arrow([w2.left, (o3.cx, w2.cy), (o3.cx, o3.y2)]))

    d.note("Dashed: whether a reseller can issue offers against Automatum's listing while "
           "Automatum is seller of record is not settled — AWS and Automatum to confirm, and "
           "the reported metric depends on it. AWS permits one partner identifier per "
           "resource, so attribution runs on user agent string.")
    return d


# render ----------------------------------------------------------------------
def render(svg_path, png_path, w, h):
    tmp = os.path.join(os.path.dirname(svg_path), "._render.html")
    with open(tmp, "w") as fh:
        fh.write(f'<!doctype html><meta charset="utf-8">'
                 f'<style>html,body{{margin:0;padding:0;background:#fff}}'
                 f'img{{display:block;width:{w * SCALE}px;height:{h * SCALE}px}}</style>'
                 f'<img src="{os.path.basename(svg_path)}">')
    try:
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--no-sandbox", "--force-color-profile=srgb",
                        f"--screenshot={png_path}",
                        f"--window-size={int(w * SCALE)},{int(h * SCALE)}",
                        "--default-background-color=FFFFFFFF", f"file://{tmp}"],
                       check=True, capture_output=True, timeout=180)
    finally:
        os.remove(tmp)


def verify(png_path, w, h):
    """A render that came back blank has bitten this pipeline before. Fail loudly."""
    im = Image.open(png_path).convert("RGB")
    want = (int(w * SCALE), int(h * SCALE))
    assert im.size == want, f"{png_path}: {im.size} != {want}"
    px = list(im.resize((w, h)).getdata())
    colours = len(set(px))
    assert colours > 200, f"{png_path}: only {colours} colours — blank render?"
    frac = sum(1 for p in px if p == (255, 255, 255)) / (w * h)
    assert frac < 0.97, f"{png_path}: {frac:.1%} pure white — blank render?"
    return colours, frac


# viewer ----------------------------------------------------------------------
PLATE = '''      <section class="plate" id="s{num}">
        <span class="rowlabel">Draft Reference Architecture</span>
        <h2><span class="n">{num}</span>{title}</h2>
        <p class="unsettled"><b>Marked unsettled &mdash;</b> {unsettled}</p>
        <figure>{svg}</figure>
      </section>
'''


def inline_svg(body, num, title):
    """Prepare one SVG for a shared document: unique marker id, fluid size, a name."""
    head_end = body.index('>') + 1
    head, rest = body[:head_end], body[head_end:]
    head = re.sub(r'\s(?:width|height)="[^"]*"', '', head)          # the viewBox drives size
    head = head[:-1] + (' role="img" aria-label="{} — partner delivery architecture across four '
                        'lanes: ISV customer, OBP, Automatum and AWS.">'.format(title))
    out = head + rest
    # every diagram names its arrowhead marker "arrow"; inlined together they would
    # collide, and each url(#arrow) would resolve against whichever came first
    return out.replace('id="arrow"', f'id="arrow-{num}"').replace('url(#arrow)', f'url(#arrow-{num})')


def write_viewer(built):
    tpl = open(os.path.join(HERE, 'viewer_template.html')).read()
    plates = "".join(
        PLATE.format(num=d.key[:2], title=d.title, unsettled=d.unsettled,
                     svg=inline_svg(body, d.key[:2], d.title))
        for d, body in built)
    out = os.path.join(HERE, 'viewer.html')
    with open(out, 'w') as fh:
        fh.write(tpl.replace('{{PLATES}}', plates.rstrip('\n')))
    return out


def main():
    built = []
    for fn in (d01, d02, d03, d04):
        d = fn()
        body = d.svg()
        svg = os.path.join(HERE, f"{d.key}_architecture.svg")
        png = os.path.join(HERE, f"{d.key}_architecture.png")
        with open(svg, "w") as fh:
            fh.write(body)
        render(svg, png, CANVAS_W, int(d.h))
        colours, frac = verify(png, CANVAS_W, int(d.h))
        print(f"  {d.key:38s} {CANVAS_W}x{d.h:.0f} -> {DOC_WIDTH_IN:.2f} x "
              f"{DOC_WIDTH_IN * d.h / CANVAS_W:.2f} in | {colours} colours, {frac:.0%} white")
        built.append((d, body))
    print("  viewer ->", write_viewer(built))


if __name__ == "__main__":
    main()
