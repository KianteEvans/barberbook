# Commercial documents

## Automatum x Only Best Venture Group - White Label Delivery Agreement

`automatum-obp-white-label-agreement.md` is the source of truth.
`automatum-obp-white-label-agreement.docx` is generated from it for signature - do not edit
the .docx by hand, because the next regeneration will overwrite it.

### What it is

A white label commercial agreement under which **Automatum** is the prime, customer-facing
party and **Only Best Venture Group** is the delivery subcontractor, performing the entire channel
function under Automatum's brand and invisible to the ISV client.

Automatum sells Managed Partner Development to software vendors that want a reseller channel
built and run on AWS. OBVG performs that channel function. This agreement papers the
relationship between the two of them; the agreements with the vendors themselves are separate
documents.

The commercial terms are: the three tiers and their prices, the partner ceilings, the deal desk
turnarounds, the review and training cadences, the $9,999 Automatum Enterprise tier platform
revenue, and the resulting OBVG service revenue of $20,001 / $50,001 / $80,001 per engagement
year.

### Decisions taken

| Decision | Choice |
|---|---|
| Governing law | New York; New York County venue; jury waiver |
| Exclusivity | Non-exclusive both ways |
| Payment to OBVG | Pay-when-paid monthly, with a hard 60-day longstop |
| Platform revenue | $9,999/year to Automatum in every case, accruing pro rata at $833.25/month |
| Net new client | Service revenue retained in full by OBVG |
| Upsell of an existing Automatum customer | Service revenue split 75% OBVG / 25% Automatum |

Because the appointment is non-exclusive, the Client Registry (clause 4), the brand rules
(clause 7 and Schedule 3) and non-circumvention (clause 15) carry the weight exclusivity would
otherwise have. They are the only things separating "an Automatum client OBVG delivers for"
from "an OBVG client".

### Net new vs upsell

The split depends on whether the client was already an Automatum subscriber. Clause 4.7
classifies every client in the Client Registry at engagement order, on a documented-first-contact
test with a 90-day lookback, and the classification is fixed for that engagement year.

| | Net new client | Existing Automatum customer |
|---|---|---|
| Platform revenue ($9,999/yr) | New money, to Automatum | Already being paid, continues to Automatum |
| Service revenue | 100% OBVG | 75% OBVG / 25% Automatum |
| Tier 1 | OBVG $20,001 | OBVG $15,000.75, Automatum $5,000.25 |
| Tier 2 | OBVG $50,001 | OBVG $37,500.75, Automatum $12,500.25 |
| Tier 3 | OBVG $80,001 | OBVG $60,000.75, Automatum $20,000.25 |

The client pays the same tier price either way.

This exists because the original structure made upsells worthless to Automatum. With the
$9,999 sitting inside the tier price, an existing subscriber moving onto Managed Partner
Development took Automatum from $9,999 to $9,999 - zero incremental revenue on up to $90,000
of brokered business, while OBVG earned the same as on a net new logo. Automatum would have had
every reason not to sell into its own base, which is the easiest base to sell to and the
obvious source of early volume. The 25% share on upsells is consideration
for the client relationship Automatum contributes, and it makes an upsell worth more to
Automatum than a net new client at every tier.

Clause 4.7 also records **Client Source** (OBVG / Automatum / Joint or ACE). Nothing currently
turns on it, but it is the hook for sourcing credit if that is ever added - see the two open
items below.

**Still open, raised but not yet drafted:**

1. **Legacy client agreements.** Clause 6.5's no-worse-than covenant assumes the client contract
   is written after this one. An existing Automatum customer already has a contract, possibly
   carrying service levels OBVG never agreed to. Needs a rule: Automatum conforms it, or the
   non-conforming terms are excluded from flow-down and stay Automatum's risk.
2. **Inherited partner roster.** "Up to 6 net new partners" assumes a standing start. An
   existing customer may arrive with partners already, so a roster baseline should be recorded
   at engagement start and the treatment of the inherited roster settled - same shape as the
   Tier 3 downgrade carry-over in Schedule 2 paragraph 5.3.

### A note on length

The agreement has been through a leaning pass: rationale that explained *why* a clause exists
was moved here, the duplication between clause 5 and Schedule 1 was collapsed, and
words-and-numerals doubling ("ninety (90) days") was dropped for numerals. 17,092 words to
13,689, 40 pages to 35, with every obligation, figure, cap and protection intact - 44 of them
checked individually, and the generated .docx round-tripped against the Markdown with zero
content lost.

One thing was *added* in that pass rather than removed: clause 4.5 now lets OBVG decline an
engagement order where the client's existing client agreement does not meet clause 6.5. That
is a partial answer to open item 1 above and costs six words; strike it if you would rather
settle that question separately.

### Regenerating the .docx

`build-docx.mjs` converts the Markdown to the Word document. It needs the `docx` npm package,
which is deliberately not an app dependency - install it somewhere scratch and point Node at it:

```bash
npm install docx --prefix /tmp/docxbuild
NODE_PATH=/tmp/docxbuild/node_modules node docs/commercial/build-docx.mjs
```

The output is US Letter, 1 inch margins, Calibri 11pt, justified body text, shaded table
headers, a page break before each schedule, page numbers in the footer, and the Only Best
Venture Group logo in a running header on every page.

`assets/obvg-logo.png` is the supplied logo with its off-white background made transparent -
as delivered it printed as a faint grey box on white paper. Brand colours are blue `#094A9E`
and orange `#F4741B`. The logo renders at 0.65 x 0.44 inches, which keeps the "ONLY BEST
VENTURE GROUP" wordmark legible at print size.

Automatum's mark is not in the document. A single party's logo on all 35 pages reads as OBVG's
paper rather than a mutual agreement, so it is worth adding Automatum's alongside it before
this goes out for signature.

### Before signature

Everything below must be closed. Find every one of them with:

```bash
grep -n "to supply\|to confirm" docs/commercial/automatum-obp-white-label-agreement.md
```

**Facts to supply** - both parties' legal entity names, entity types, states of organization
and registration numbers; principal and notice addresses including the address for legal
notices; signatory names and titles; the Effective Date; named Channel Manager, Backup and
Tier 3 Deal Desk Owner; relationship managers and escalation executives; PSR vendor details
and certifications; the subprocessor list; rate card day rates; insurance limits; the AWS
Marketplace listing identifier and seller of record entity; the APN account OBVG files
partner-sourced opportunities under; the solution identifier; and the longstop date for
the Marketplace authorization dependency.

**Figures to confirm** - PSR seats per tier; named-owner committed hours per tier; the Tier 3
coverage window; the Tier 3 onboarding throughput rate and baseline assumptions; the PSR
partner record threshold. Each carries a stated default in Schedule 8 paragraph 5 that applies
if the agreement is executed before the figure is settled.

**Dependencies to verify** - the AWS Marketplace authorization mechanism (Schedule 8
paragraph 2), the PSR vendor continuity undertaking, the capacity test, and insurance
certificates. These resolve through clause 14 and must never be closed by assumption.

### Terms chosen as market defaults, not instructed

These numbers were not specified. They are drafted as market-standard defaults. This
list used to sit in Schedule 8 of the agreement; it was drafting commentary rather than a term,
so it now lives only here. It is the record of which figures were invented and need a
deliberate decision rather than passing silently:

- service credit flow-down caps - 10% of gross monthly client fees per month, 20% where two or
  more service levels are missed, 15% of annual OBVG service revenue per year (clause 8.5)
- liability cap - the greater of 100% of trailing 12-month OBVG service revenue per engagement
  and $50,000; super-cap at 200% / $250,000 (clauses 21.3, 21.4)
- non-circumvention tail - 24 months for clients, 12 months for partners and personnel; $35,000
  liquidated damages per circumvented client; 30% of first-year compensation for personnel
  (clauses 15.2, 15.3, 15.5, 15.7)
- payment - 10 business days from client payment, 60-day longstop (clause 11.4)
- initial term - 24 months, so an engagement order signed late still runs to expiry (clause 23.1)
- transition period - 90 days, extendable to 180 (clause 24.1)

### Open commercial questions

These are business decisions, not drafting gaps. Items 1 and 5 are recorded as assumptions in
Schedule 8 paragraph 3 of the agreement because they bear on pricing mechanics. Items 2, 3 and 4
are recorded only here: they question whether the pricing works, which the agreement settles in
Schedule 2 rather than relitigates. Clause 14.1 and Schedule 8 paragraph 3.3 carry the operative
consequence - neither party warrants that the fees at any tier cover its own cost of performance.

1. **The $9,999 on early churn.** Under pro rata accrual, an engagement ending in month 3
   recovers only $2,499.75 of a retention Automatum likely commits annually. The gap cannot be
   closed inside the OBVG subcontract - it has to be closed in the client agreement, by a
   minimum term with an early termination charge, by a monthly-cancellable Enterprise tier, or
   by Automatum accepting early churn as its own loss.
2. **Tier 1 viability.** $20,001 a year funds a named channel manager, a named backup, a
   next-business-day deal desk, two training sessions, four channel reviews, up to six partner
   recruitments and the PSR licence. Licensing was stress-tested at this tier; labour was not.
3. **Automatum's margin as prime.** At Tier 3 the retention is 11.1% of gross while Automatum
   carries client credit risk, SLA liability, collection risk and the client relationship.
   Whether $9,999 is margin or a pass-through of Automatum's own cost has never been settled,
   and the agreement implements the figures as they stand.
4. **Stress testing at the wrong end.** Licensing was tested against Tier 1, the most
   predictable case, while Tier 3 carries an uncapped roster. If the PSR is priced per partner,
   Tier 3 is where the model breaks. Schedule 1 paragraph 4 provides a cost pass-through if so.
5. **Marketplace fee.** Schedule 2 assumes engagement fees are invoiced directly, not
   transacted through AWS Marketplace - the figures require this, since $9,999 plus $20,001 is
   exactly $30,000 with no room for a listing fee. If that changes, roughly 3%
   (about $900 / $1,800 / $2,700 a year) needs a home. Clause 11.9.

### Drafting problems resolved rather than inherited

- **Tier 1 and Tier 2 sold the same turnaround.** "1 business day" and "8 business hours" are
  the same period if a business day is eight hours. Schedule 4 paragraph 1 defines Tier 1 as
  close of the *next* business day (up to about 16 business hours) so the tiers actually differ.
- **The deal desk SLA spans both parties.** Automatum issues offers as seller of record, so OBVG
  cannot warrant end-to-end turnaround. Schedule 4 splits every turnaround into an OBVG leg and
  an Automatum leg, and only OBVG-leg failures flow down (clause 8.2).
- **The 365-day "Active" test is unachievable late in a 12-month engagement.** A partner
  recruited in month 10 cannot qualify. Schedule 1 paragraph 5 adds trailing measurement, a
  post-term measurement date and exclusion of partners onboarded in the final 90 days.
- **"Up to 6 / up to 12" is a ceiling, not a promise.** Clause 5.2 says so explicitly, because
  a client will read it as a commitment and the supplier as a cap.
- **"First transaction by end of Q1" contradicts the AWS-dependency disclaimer.** Schedule 1
  paragraph 6 makes it a target with a best-efforts obligation, not a warranty.
- **"OBVG supplies partner agreements" was ambiguous.** Clause 5.3 makes OBVG the drafter and
  administrator, never a principal - otherwise the whole partner roster is contractually OBVG's
  and exit becomes impossible.
- **Which APN account OBVG files ACE opportunities under.** If OBVG files under its own, its name
  appears on records the client and AWS can see and the white label is blown. Clause 5.1(j) and
  Schedule 8 require this to be named.
- **Escrow would not have worked.** OBVG licenses rather than owns the PSR, so escrowed source
  would give Automatum a codebase it cannot operate. Clause 10.5 and 10.8 use a standing data
  replica plus a vendor continuity undertaking instead.
- **Co-employment risk.** OBVG staff on Automatum email presenting as Automatum's team for 12
  months is a recognisable joint-employer pattern. Clause 7.6 and Schedule 3 paragraph 1 set
  out exactly what personnel may and may not say.

### Not included

The client-facing agreement between Automatum and each ISV, and the partner/reseller agreement
and margin schedule OBVG papers for each client, are separate documents. Note that clause 6.5
constrains what the client agreement may contain: it may not carry service levels stricter
than Schedule 4, credits above the caps, or any guaranteed outcome.
