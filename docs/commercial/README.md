# Commercial documents

## Automatum x Only Best Practices - White Label Delivery Agreement

`automatum-obp-white-label-agreement.md` is the source of truth.
`automatum-obp-white-label-agreement.docx` is generated from it for signature - do not edit
the .docx by hand, because the next regeneration will overwrite it.

### What it is

A white label commercial agreement under which **Automatum** is the prime, customer-facing
party and **Only Best Practices** is the delivery subcontractor, performing the entire channel
function under Automatum's brand and invisible to the ISV client.

It exists because the AWS Business Outcomes Xcelerator feasibility study ("Automatum x OBP -
Managed Partner Development") states under *Solution Team Structure* that "The Automatum x
Only Best Practices Commercial Agreement for Managed Partner Development has been reviewed and
executed." This is that agreement. **The study's date will need reconciling with the actual
execution date** - as drafted the study asserts an executed agreement that did not yet exist.

All commercial terms are taken from the study: the three tiers and their prices, the partner
ceilings, the deal desk turnarounds, the review and training cadences, the $9,999 Automatum
Enterprise tier retention, and the resulting OBP service revenue of $20,001 / $50,001 /
$80,001 per engagement year.

### Decisions taken

| Decision | Choice |
|---|---|
| Governing law | New York; New York County venue; jury waiver |
| Exclusivity | Non-exclusive both ways |
| Payment to OBP | Pay-when-paid monthly, with a hard 60-day longstop |
| $9,999 retention | Accrues pro rata at $833.25/month, not front-loaded |

Because the appointment is non-exclusive, the Client Registry (clause 4), the brand rules
(clause 7 and Schedule 3) and non-circumvention (clause 15) carry the weight exclusivity would
otherwise have. They are the only things separating "an Automatum client OBP delivers for"
from "an OBP client".

### Regenerating the .docx

`build-docx.mjs` converts the Markdown to the Word document. It needs the `docx` npm package,
which is deliberately not an app dependency - install it somewhere scratch and point Node at it:

```bash
npm install docx --prefix /tmp/docxbuild
NODE_PATH=/tmp/docxbuild/node_modules node docs/commercial/build-docx.mjs
```

The output is US Letter, 1 inch margins, Calibri 11pt, justified body text, shaded table
headers, a page break before each schedule, and page numbers in the footer.

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
Marketplace listing identifier and seller of record entity; the APN account OBP files
partner-sourced opportunities under; the BOX solution identifier; and the longstop date for
the Marketplace authorization dependency.

**Figures to confirm** - PSR seats per tier; named-owner committed hours per tier; the Tier 3
coverage window; the Tier 3 onboarding throughput rate and baseline assumptions; the PSR
partner record threshold. Each carries a stated default in Schedule 8 paragraph 5 that applies
if the agreement is executed before the figure is settled.

**Dependencies to verify** - the AWS Marketplace authorization mechanism (Schedule 8
paragraph 2), the PSR vendor continuity undertaking, the capacity test, and insurance
certificates. These resolve through clause 14 and must never be closed by assumption.

### Terms chosen as market defaults, not instructed

The study does not supply these numbers. They are drafted as market-standard defaults and
listed here so they get a deliberate decision rather than passing silently:

- service credit flow-down caps - 10% of gross monthly client fees per month, 20% where two or
  more service levels are missed, 15% of annual OBP service revenue per year (clause 8.5)
- liability cap - the greater of 100% of trailing 12-month OBP service revenue per engagement
  and $50,000; super-cap at 200% / $250,000 (clauses 21.3, 21.4)
- non-circumvention tail - 24 months for clients, 12 months for partners and personnel; $35,000
  liquidated damages per circumvented client; 30% of first-year compensation for personnel
  (clauses 15.2, 15.3, 15.6, 15.7)
- payment - 10 business days from client payment, 60-day longstop (clause 11.5)
- initial term - 24 months, so an engagement order signed late still runs to expiry (clause 23.1)
- transition period - 90 days, extendable to 180 (clause 24.1)

### Open commercial questions the study leaves unresolved

These are flagged in Schedule 8 paragraph 3 rather than papered over. They are business
decisions, not drafting gaps.

1. **The $9,999 on early churn.** Under pro rata accrual, an engagement ending in month 3
   recovers only $2,499.75 of a retention Automatum likely commits annually. The gap cannot be
   closed inside the OBP subcontract - it has to be closed in the client agreement, by a
   minimum term with an early termination charge, by a monthly-cancellable Enterprise tier, or
   by Automatum accepting early churn as its own loss.
2. **Tier 1 viability.** $20,001 a year funds a named channel manager, a named backup, a
   next-business-day deal desk, two training sessions, four channel reviews, up to six partner
   recruitments and the PSR licence. The study stress-tested licensing at this tier but says
   nothing about labour.
3. **Automatum's margin as prime.** At Tier 3 the retention is 11.1% of gross while Automatum
   carries client credit risk, SLA liability, collection risk and the client relationship. The
   study does not say whether $9,999 is margin or a pass-through of Automatum's own cost. The
   agreement implements the study's figures as written.
4. **Stress testing at the wrong end.** Licensing was tested against Tier 1, the most
   predictable case, while Tier 3 carries an uncapped roster. If the PSR is priced per partner,
   Tier 3 is where the model breaks. Schedule 1 paragraph 4 provides a cost pass-through if so.
5. **Marketplace fee.** Schedule 2 assumes engagement fees are invoiced directly, not
   transacted through AWS Marketplace - the study's own arithmetic requires this, since $9,999
   plus $20,001 is exactly $30,000 with no room for a listing fee. If that changes, roughly 3%
   (about $900 / $1,800 / $2,700 a year) needs a home. Clause 11.10.

### Problems in the study the agreement resolves rather than inherits

- **Tier 1 and Tier 2 sold the same turnaround.** "1 business day" and "8 business hours" are
  the same period if a business day is eight hours. Schedule 4 paragraph 2 defines Tier 1 as
  close of the *next* business day (up to about 16 business hours) so the tiers actually differ.
- **The deal desk SLA spans both parties.** Automatum issues offers as seller of record, so OBP
  cannot warrant end-to-end turnaround. Schedule 4 splits every turnaround into an OBP leg and
  an Automatum leg, and only OBP-leg failures flow down (clause 8.2).
- **The 365-day "Active" test is unachievable late in a 12-month engagement.** A partner
  recruited in month 10 cannot qualify. Schedule 1 paragraph 7 adds trailing measurement, a
  post-term measurement date and exclusion of partners onboarded in the final 90 days.
- **"Up to 6 / up to 12" is a ceiling, not a promise.** Clause 5.3 says so explicitly, because
  a client will read it as a commitment and the supplier as a cap.
- **"First transaction by end of Q1" contradicts the AWS-dependency disclaimer.** Schedule 1
  paragraph 6 makes it a target with a best-efforts obligation, not a warranty.
- **"OBP supplies partner agreements" was ambiguous.** Clause 5.4 makes OBP the drafter and
  administrator, never a principal - otherwise the whole partner roster is contractually OBP's
  and exit becomes impossible.
- **Which APN account OBP files ACE opportunities under.** If OBP files under its own, its name
  appears on records the client and AWS can see and the white label is blown. Clause 5.11 and
  Schedule 8 require this to be named.
- **Escrow would not have worked.** OBP licenses rather than owns the PSR, so escrowed source
  would give Automatum a codebase it cannot operate. Clause 10.5 and 10.8 use a standing data
  replica plus a vendor continuity undertaking instead.
- **Co-employment risk.** OBP staff on Automatum email presenting as Automatum's team for 12
  months is a recognisable joint-employer pattern. Clause 7.6 and Schedule 3 paragraph 1 set
  out exactly what personnel may and may not say.
- **The AWS non-binding footer** on the study is not carried across. This document is intended
  to bind.

### Not included

The client-facing agreement between Automatum and each ISV, and the partner/reseller agreement
and margin schedule OBP papers for each client, are separate documents. Note that clause 6.5
constrains what the client agreement may contain: it may not carry service levels stricter
than Schedule 4, credits above the caps, or any guaranteed outcome.
