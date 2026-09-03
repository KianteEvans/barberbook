import copy, os, re, shutil, subprocess, zipfile
from lxml import etree

W="{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SRC="unpacked/word/document.xml"

def txt(el): return "".join(el.itertext()).strip()

# ---------- shared content ----------
COMMON_TECH_TAIL = ("Component inventory is disclosed in full: no component is used that is not listed here, "
    "and licence cost recovery sits inside the engagement fee rather than being passed through.")

PARTNERSHIP = [
 ("Partner 1 Name","Automatum — lead partner. Owns the listed software and is seller of record for all four solutions."),
 ("Partner 2 Name","Only Best Practices (OBP) — supporting partner. Delivers the engagement."),
]
REG_BRACKET = {
 "SFDC Link":"[AWS SFDC link — to supply]",
 "APN SFDC Link":"[APN SFDC link — to supply]",
 "Partner Tier":"[Tier as displayed on Partner Central — to attach with Partner ID and date checked]",
 "Partner Since":"[Date — to supply]",
 "Business Plan Owners":"[Named owner — to supply]",
 "Current APN Programs":"[Current APN programs — to supply]",
 "Office Locations":"[Office locations — to supply]",
 "Key Focus Verticals of Partner":"[Key focus verticals — to supply]",
 "EXISTING Competencies & Service Delivery Programs":"[Existing competencies and service delivery programs — to supply]",
}

SOLUTIONS = [
{
 "file":"01_Marketplace-Compliance-Accelerator",
 "name":"Marketplace Compliance Accelerator",
 "summary":{
  "Customer Use Case":"An ISV with a shippable product but no AWS Marketplace presence needs to become transactable on AWS — Well-Architected review, remediation, Foundational Technical Review and a published, transacting listing.",
  "AWS Services":"AWS Marketplace; AWS Marketplace Management Portal (AMMP); AWS Well-Architected Framework Review; AWS Foundational Technical Review (FTR); AWS Partner Central / ACE.",
  "Expected Launch Date":"[Launch date — to confirm against the wave one submission schedule]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Qualified yes — and the partners flag this for AWS discussion. The engagement is a fixed-fee compliance and listing project whose immediate buyer is technical ([CTO / VP Engineering]), not a line-of-business persona. Its business outcome is real but indirect: it is the precondition for the ISV transacting on AWS at all, and it is the entry point to the three twelve-month retainers that do carry direct top-line outcomes. The partners' recommendation is that AWS assess it as the on-ramp component of the four-solution portfolio rather than as a standalone business outcome solution.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CTO / VP Engineering] — to be validated against OBP's closed and in-flight deals. Economic buyer is frequently the CEO in ISVs below [N] employees.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose the Marketplace Compliance Accelerator: a fixed-fee project that takes an ISV from unassessed to a published, transacting AWS Marketplace listing in 14 to 18 business days of delivery, for $10,000.",
   "Automatum leads the solution, owns the listed software and is seller of record; OBP delivers the engagement. The customer signs one agreement and transacts through AWS Marketplace on Automatum's listing, with software on one line and professional services on the other.",
   "Preliminary analysis: the work is well understood and repeatable, the delivery window is short and provable, and the component that carries most of the effort — Well-Architected data collection and remediation — is already automated by a licensed tool OBP operates. This is the lowest-risk of the four solutions to build and the fastest route to Milestone 1 evidence, which is why the partners propose submitting it in the first wave.",
  ],
  "Description of Solution":[
   "Final delivery is a published, transacting AWS Marketplace listing, with the compliance evidence behind it.",
   "The engagement covers: a Well-Architected Framework Review conducted and its findings remediated in the product; the AWS Foundational Technical Review prepared and submitted; the Marketplace listing built, configured and taken through publication; architecture diagrams maintained in AMMP to evidence the \"Deployed on AWS\" badge; and seller registration completed.",
   "It is desirable because Marketplace access is now a precondition for a large and growing share of enterprise software procurement, and because FTR acceptance grants AWS Qualified Software status and Solutions Finder placement, valid two years. Demand is evidenced by [pipeline figure — to supply from OBP's closed and in-flight deals].",
  ],
  "Technology considerations":[
   "Delivery is professional services against AWS-operated systems; there is no new software to build.",
   "Components: ASecureCloud, licensed and operated by OBP, automates the data collection for the Well-Architected review, suggests answers to the questionnaire, and generates CloudFormation and AWS CLI templates that resolve findings — Premium edition is required for Well-Architected reviews, and licences are held as a reassignable pool. Automatum supplies the Marketplace listing the product publishes to, and is seller of record. AWS supplies Marketplace, AMMP, the Well-Architected tool and the FTR process.",
   "Labour: OBP compliance engineering, plus [N] hours of the customer's own engineering availability for remediation. The customer supplies tax, bank and legal data for seller registration. " + COMMON_TECH_TAIL,
  ],
  "Market Fit":[
   "Target market: ISVs that need to transact on AWS Marketplace and have no listing, or a listing that has not passed FTR.",
   "Demand: driven by enterprise buyers increasingly requiring Marketplace transactability, and by ISVs pursuing AWS co-sell, which depends on it.",
   "Competitors: AWS systems integrators offering listing services, ISVs attempting it in-house, and AWS's own self-service path. The differentiator is a fixed fee, a stated delivery window, and an automated Well-Architected component that removes the largest variable in the work.",
  ],
  "Marketing strategy":[
   "The solution carries its own overview and deck, and lists under its own Solution ID.",
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed for this solution; joint outbound from both partners; and AWS-facing collateral produced under the Managed AWS Alliances retainer for customers who buy both.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP delivers with existing compliance engineering staff. Automatum's involvement is the listing and seller-of-record position, not delivery labour.",
   "Staffing to be capacity-tested before any customer artifact is published: the delivery window is a staffing commitment, and a window honoured for two concurrent engagements and missed for the sixth is worse than no window. [Concurrent engagement capacity — to confirm.]",
   "No hiring is anticipated for this solution at the volumes currently forecast.",
  ],
  "Schedule":[
   "Wave one of a two-wave submission sequence, submitted alongside Managed AWS Alliances. Wave two (Managed Marketplace Operations and Managed Partner Development) opens on this wave's Milestone 1 approval.",
   "Per engagement: 14 to 18 business days of delivery. This is business days of delivery, not elapsed time; [the clock start — to define] and it runs from the customer's inputs being met.",
   "Constraints: AWS's FTR review queue governs the publication date and is outside the partners' control; the twelve-month listing deadline applies from entry [clock basis — per Solution ID from entry, or programme-level — to confirm with AWS].",
  ],
  "Initial  Financial projections":[
   "List price $10,000 fixed, 50% on signature and 50% on completion. Twenty hours of remediation are included; further blocks of ten hours are $1,000 each.",
   "Revenue split between Automatum and OBP on the software and professional services lines is under negotiation and is not settled at the time of this submission. [Volume forecast and margin — to supply.]",
  ],
  "Draft Reference Architecture":["[Insert architecture diagram — to supply.]"],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding, and recommend this solution as the first of the four submitted.",
   "Findings: the work is repeatable, the delivery window is provable, the effort is largely automated, and the commercial structure is simple. The risk concentrated here is not delivery risk but classification risk — see the Business Outcomes Solution response in the Submission Summary, which the partners raise deliberately rather than leave for AWS to find.",
   "Open before build: the commercial terms between Automatum and OBP; the clock-start definition; and confirmation that Automatum is lead partner of record on this Solution ID.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the engagement and for the compliance work. Automatum is first line for anything touching the listing itself, private offers or the seller-of-record position, since those sit in its account. Escalation between the partners is [named path — to define], and the customer sees a single named OBP owner throughout.",
  "opportunities":"Both partners source. OBP sources from its own compliance and AWS practice pipeline; Automatum sources from its listing and ISV relationships; AWS sources through ACE, where five opportunity submissions are committed for this solution. An opportunity belongs to exactly one solution and is registered against this Solution ID. Where a customer buys more than one of the four, the higher solution's commit column governs any overlap and the same work is not billed twice.",
  "commercial":"Not yet. Both partners have seen the engagement structure — one customer agreement per Solution ID, transacting on Automatum's listing, software on one line and professional services on the other — but the revenue split on each line, the flow of funds and payment trigger, Marketplace fee treatment, milestone cash and credit apportionment, and component cost recovery are on the agenda for a partner call and are not settled at the time of this submission. The partners flag this as the principal open commercial item across all four solutions.",
 },
},
{
 "file":"02_Managed-AWS-Alliances",
 "name":"Managed AWS Alliances",
 "summary":{
  "Customer Use Case":"An ISV with an AWS listing but no one running the AWS partnership needs a named Director of Alliances to drive its AWS programme progression — ISV Accelerate, Competency acceptance, MDF, and its own BOX Program listings.",
  "AWS Services":"AWS Partner Central / ACE; AWS Marketplace; ISV Accelerate Program; AWS Competency Programs; AWS Marketing Development Funds (MDF); AWS Business Outcomes Xcelerator.",
  "Expected Launch Date":"[Launch date — to confirm against the wave one submission schedule]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is a line-of-business executive (CEO or CRO), the outcome is top-line — AWS-sourced pipeline, co-sell revenue and AWS programme funding the ISV would not otherwise capture — and the solution combines components from AWS (Partner Central, ACE, ISV Accelerate, Competency, MDF), from Automatum (the listing and seller-of-record position) and from OBP (the alliance function itself). It replaces a Director of Alliances hire rather than supplying software.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CEO or CRO] — to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed AWS Alliances: OBP acts as the ISV's Director of Alliances for twelve months across three strictly additive tiers, priced $2,500 / $5,000 / $7,500 a month.",
   "The solution puts a named owner on the AWS partnership and drives the ISV's own AWS programme progression. What the partners commit to is the machinery — a named owner with a named backup, partnership reviews held and minuted, quarterly AWS plans, and every ISV Accelerate, Competency, MDF and BOX Program listing application prepared and filed. What they target, and do not guarantee, is what AWS decides: acceptance, MDF availability, listings approved and AWS-sourced leads.",
   "Preliminary analysis: this is the solution with the clearest line-of-business buyer and the clearest top-line outcome, and it pairs naturally with the Accelerator, which produces the listing the partnership is built around. Both are proposed for wave one.",
  ],
  "Description of Solution":[
   "Final delivery is twelve months of a staffed AWS partnership: a named Director of Alliances, a fixed cadence of partnership reviews and quarterly AWS plans, and a filed application trail against every AWS programme the ISV qualifies for.",
   "Tier outcomes the ISV pursues: at Essentials, ISV Accelerate acceptance (unlocking up to 25k in MDF), one Competency acceptance (up to 50k in MDF), one BOX Program listing (unlocking 35k in AWS credits, 35k in cash and 55 leads via a sponsored AWS marketing campaign), and AWS-facing marketing collateral. At Growth, up to three Competency acceptances and three BOX Program listings, quarterly events, weekly ACE hygiene checks and funding application support. At Professional, all applicable Competency programmes, uncapped BOX Program listings, and introductions to four Account Executives, two Partner Sales Managers and one Segment Leader.",
   "Note for AWS: the BOX Program listings referenced here are the ISV customer's own participation, which this retainer drives them toward. They are separate from the four Automatum × OBP solutions and their milestones, which are the subject of this submission. The figures coincide because both run the same AWS programme schedule.",
  ],
  "Technology considerations":[
   "Delivery is a staffed alliance function against AWS-operated systems; there is no new software to build.",
   "AWS supplies Partner Central, ACE, the programme applications and the funding mechanisms. Automatum supplies the listing and the seller-of-record position, and files ACE opportunities from [whose Partner Central instance — to confirm]. OBP supplies the alliance function: the named owner, the reviews, the plans, the application preparation and the reporting.",
   "No third-party component is licensed into this solution. The deck's components register names none for this solution, and the partners confirm that as accurate rather than an omission. " + COMMON_TECH_TAIL,
  ],
  "Market Fit":[
   "Target market: ISVs with an AWS listing and AWS revenue ambition, but no dedicated alliance staff — typically below the size at which a full-time Director of Alliances is affordable.",
   "Demand: driven by the gap between what AWS programmes offer an ISV and what an unstaffed ISV actually captures. Most ISVs qualify for programme benefits they never apply for.",
   "Competitors: a direct Director of Alliances hire (materially more expensive at every tier), AWS consulting partners offering alliance advisory, and doing nothing. The differentiator is a named owner at a stated cadence with a filed application trail, at a fraction of the hire.",
  ],
  "Marketing strategy":[
   "The solution carries its own overview and deck, and lists under its own Solution ID.",
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed for this solution; joint outbound from both partners; and AWS-facing events run under the retainer itself at Growth and above, which double as a demand channel.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs each engagement with a named alliance lead and a named backup, so the cadence holds through absence.",
   "This is the largest staffing input across the four solutions and it is not yet settled. Named-owner hours per rung, whether a backup is funded at the bottom rung, and how many accounts one owner can hold must be capacity-tested against the full additive load at the top rung before any figure is published. [Staffing model — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Wave one of a two-wave submission sequence, submitted alongside the Marketplace Compliance Accelerator.",
   "Per engagement: a twelve-month term, with the review and planning cadence running from kickoff. [Cadence counts and the action-log service level — to confirm with the staffing model.]",
   "Constraints: every programme outcome depends on AWS decision timelines outside the partners' control; the twelve-month listing deadline applies from entry [clock basis — to confirm with AWS].",
  ],
  "Initial  Financial projections":[
   "List price $2,500 / $5,000 / $7,500 a month across three strictly additive tiers, on a twelve-month term. Priced on the seniority of the person on the account.",
   "Included volumes and overflow rates per rung are being set alongside the staffing model and are not published at the time of this submission. Revenue split between the partners is under negotiation. [Volume forecast, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":["[Insert architecture diagram — to supply.]"],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding, and recommend this solution for wave one alongside the Accelerator.",
   "Findings: the clearest line-of-business buyer of the four and an unambiguous business outcome. The commercial model is sound at list price. The risk is delivery capacity rather than demand — every commitment in this solution is a staffing commitment, and none should be published before the capacity model is tested.",
   "Open before build: the staffing model; the commercial terms between the partners; whose Partner Central instance ACE opportunities are filed into; and confirmation that Automatum is lead partner of record on this Solution ID.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support and owns the customer relationship through a named alliance lead with a named backup. Automatum is first line for the listing, private offers, selling authorizations and the seller-of-record position. Escalation between the partners is [named path — to define].",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution. An opportunity belongs to exactly one solution and is registered against this Solution ID; a customer's own ACE submissions follow their opportunity flow and are not an entitlement of five. Where a customer buys more than one of the four, the higher solution's commit column governs any overlap and the same work is not billed twice.",
  "commercial":"Not yet — see the equivalent response in the other three studies. The partners additionally flag a dependency specific to this solution and to Managed Marketplace Operations: OBP cannot publish a single response-time commitment until Automatum agrees matching internal turnarounds behind it, covering offer issue, listing configuration submission, selling authorizations and the Partner Central instance ACE is filed into. That is the principal open operational item between the partners.",
 },
},
]

SOLUTIONS += [
{
 "file":"03_Managed-Marketplace-Operations",
 "name":"Managed Marketplace Operations",
 "summary":{
  "Customer Use Case":"An ISV needs its AWS Marketplace listing built and then operated at volume — compliance engineering, a private offer desk, listing configuration and monthly reporting on offers, Marketplace revenue and listing health.",
  "AWS Services":"AWS Marketplace; AWS Marketplace Management Portal (AMMP); AWS Well-Architected Framework Review; AWS Foundational Technical Review (FTR); Channel Partner Private Offers (CPPO); AWS Partner Central / ACE.",
  "Expected Launch Date":"[Launch date — to confirm against the wave two submission schedule]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is a line-of-business persona (RevOps, deal desk or COO) and the outcome is directly top-line: the listing is the mechanism through which the ISV transacts on AWS, and the offer desk is what converts demand into issued offers and Marketplace revenue. It combines AWS components (Marketplace, AMMP, FTR, CPPO), Automatum's listing and seller-of-record position, and OBP's operations function. It replaces a Marketplace operations hire plus compliance engineering hours rather than supplying software.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[RevOps / deal desk or COO] — to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed Marketplace Operations: a twelve-month retainer that gets a listing live and then operates it at volume, priced $1,500 / $3,000 / $6,000 a month.",
   "All nine services are delivered at every rung — compliance engineering, listing engineering, and the offer desk and reporting. Volume, turnaround and review cadence set the rung rather than scope. Uniquely among the four, this solution is priced on throughput rather than seniority: the rungs track the included offer band exactly, at the same rate per included offer at each.",
   "Preliminary analysis: this is the most mechanical and therefore the most repeatable of the four, and its pricing has an unusually clean rationale. It is proposed for wave two, on the reasoning that it should follow evidence from a completed Milestone 1 rather than run in parallel with it.",
  ],
  "Description of Solution":[
   "Final delivery is a live, operated AWS Marketplace listing, transacting at the volume the rung provides for, with a written service level issued at onboarding, twelve monthly operating packs and an annual state-of-the-listing review.",
   "Nine services at every rung: a Well-Architected Framework Review conducted and findings remediated — the FTR takes a completed WAFR as its input, so compliance engineering runs before the listing is built; the FTR prepared and submitted; the listing built, configured and taken through publication; architecture diagrams maintained in AMMP to evidence the \"Deployed on AWS\" badge; CRM integration configured for Marketplace offers and subscriptions; a private offer desk operating direct offers and CPPOs; listing configuration changes inside the rung's turnaround; and monthly reporting on offers, Marketplace revenue and listing health.",
   "Rung depth: one, two or four Well-Architected reviews; up to 50, 100 or 200 offers operated per year; listing configuration changes in five, three or one business days.",
   "Note for AWS: this solution includes the listing work that the Marketplace Compliance Accelerator also delivers. That overlap is deliberate and is disclosed rather than avoided — see Findings and recommendations.",
  ],
  "Technology considerations":[
   "Delivery is professional services against AWS-operated systems; there is no new software to build.",
   "AWS supplies Marketplace, AMMP, the Well-Architected tool, the FTR process and the CPPO mechanism. Automatum supplies the listing, issues every private offer as seller of record, and provides the CRM and Partner Central integrations. OBP supplies compliance engineering, the offer desk, listing configuration and reporting.",
   "A dependency the partners state plainly: OBP drafts and submits offers, but Automatum issues them. Every issue turnaround in this solution is committed only where Automatum's matching internal turnaround is in place. [CRM platforms Automatum's integration supports — to confirm.] " + COMMON_TECH_TAIL,
  ],
  "Market Fit":[
   "Target market: ISVs transacting on AWS Marketplace at volume, or intending to, without dedicated Marketplace operations staff.",
   "Demand: driven by private offer volume. An ISV issuing offers at any material rate needs a desk; an ISV issuing none does not need this solution and should be sold the Accelerator instead.",
   "Competitors: a Marketplace operations hire, AWS consulting partners offering listing management, and ISVs operating the desk in-house alongside other duties. The differentiator is a stated offer band with a stated turnaround at a price that scales linearly with the band.",
  ],
  "Marketing strategy":[
   "The solution carries its own overview and deck, and lists under its own Solution ID.",
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed for this solution; joint outbound from both partners; and referral from the Accelerator, whose customers have a live listing and a reason to want it operated.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs a named operations owner and a named backup, with the desk open across a stated coverage window. The top rung's increment is coverage and response band rather than headcount.",
   "Staffing must be capacity-tested before publication: every turnaround in this solution is a staffing commitment. [Desk coverage window and time zone, and accounts per owner — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Wave two of a two-wave submission sequence, submitted alongside Managed Partner Development, opening on wave one's Milestone 1 approval.",
   "Per engagement: a twelve-month term. The listing work runs at the start of the term; the operating cadence runs across all twelve months.",
   "Constraints: AWS's FTR review queue governs the publication date; AWS-mandated catalog and policy changes arrive on AWS's schedule and are assessed within the rung's turnaround, though landing them before an AWS deadline may require the customer's own engineering.",
  ],
  "Initial  Financial projections":[
   "List price $1,500 / $3,000 / $6,000 a month on a twelve-month term — $18,000, $36,000 and $72,000 across the term, against included offer bands of 50, 100 and 200 offers a year. The rate per included offer is identical at all three rungs, which is the pricing rationale.",
   "Overflow rates above the included band are being set alongside the staffing model. Revenue split between the partners is under negotiation. [Volume forecast, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":["[Insert architecture diagram — to supply.]"],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding, in wave two.",
   "Findings: the most repeatable of the four, with the cleanest pricing logic. Two items are disclosed deliberately. First, this solution's Launch rung includes the same listing work the Marketplace Compliance Accelerator delivers as a fixed-fee project. The partners have kept both: the project is the route to a listing in 14 to 18 business days with nothing ongoing at $10,000, while this retainer builds the listing and then operates it for twelve months at $18,000 across the term — so the retainer is not the cheap way in, which is what makes the pair coherent. Second, CPPO appears in both this solution and Managed Partner Development; the partners draw the boundary as originated with partners there, executed on the listing here, and ask AWS to confirm it.",
   "Open before build: Automatum's back-to-back internal turnarounds, without which no response time here is publishable; the CPPO boundary; the CRM platforms supported; and the staffing model.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the desk, compliance engineering and reporting, through a named operations owner with a named backup. Automatum is first line for the listing itself, offer issuance and the seller-of-record position. The division matters operationally here more than in the other three, because OBP drafts offers and Automatum issues them; the handoff and its turnaround are [to agree].",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution. The Marketplace Compliance Accelerator is also a source: its customers finish with a live listing and a reason to have it operated. An opportunity belongs to exactly one solution and is registered against this Solution ID. Where a customer buys more than one of the four, the higher solution's commit column governs any overlap and the same work is not billed twice.",
  "commercial":"Not yet — see the equivalent response in the other three studies. This solution carries the sharpest operational dependency: OBP cannot publish a single offer-issue or listing-configuration turnaround until Automatum agrees a matching internal turnaround behind it. That agreement is a precondition of the customer-facing artifact, not a refinement of it.",
 },
},
{
 "file":"04_Managed-Partner-Development",
 "name":"Managed Partner Development",
 "summary":{
  "Customer Use Case":"An ISV needs a reseller channel on AWS built and run — partners recruited and managed, a CPPO deal desk, selling authorizations, enablement, a partner system of record and attribution reporting.",
  "AWS Services":"AWS Marketplace; Channel Partner Private Offers (CPPO); selling authorizations; AWS Partner Central / ACE; AWS Marketplace seller reporting.",
  "Expected Launch Date":"[Launch date — to confirm against the wave two submission schedule]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is a line-of-business executive (CRO or VP Channel), the outcome is directly top-line — partner-sourced Marketplace revenue the ISV does not have today — and the solution combines AWS components (Marketplace, CPPO, selling authorizations, attribution), Automatum's listing and seller-of-record position, and OBP's channel function, with Kiflo Core as the partner system of record included in the fee. It replaces a channel manager plus a PRM subscription rather than supplying software.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CRO / VP Channel] — to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed Partner Development: a twelve-month retainer that stands up and runs an ISV's reseller channel on AWS, priced $2,500 / $5,000 / $7,500 a month.",
   "What the partners commit to is the roster under management and the machinery around it — up to six, up to twelve, or an uncapped roster of net new partners recruited and managed, a CPPO deal desk at the rung's turnaround, training on cadence, channel reviews with sourced-pipeline and attribution reporting, and Kiflo Core operated inside the fee. What they report, and target rather than guarantee, is partners issuing offers, because that depends on the partners themselves.",
   "Preliminary analysis: the term length is not arbitrary. Ramp from first outreach to a first partner transaction models at eight months, which is what sets the twelve-month term — the clearest justification in the portfolio for a customer signing for a year.",
  ],
  "Description of Solution":[
   "Final delivery is a working reseller channel: executed partner agreements and a margin schedule, a live partner portal carrying onboarding, deal registration and commission tracking, recruitment and enablement running on a named cadence, a deal desk answering registrations, and a monthly report whose headline number is partners issuing offers.",
   "Rung depth: up to six, twelve or an uncapped roster of net new partners recruited and under management; twice-yearly, quarterly or monthly training and enablement sessions; a CPPO deal desk at one business day, eight business hours or four business hours; quarterly, monthly or fortnightly channel reviews with sourced-pipeline and attribution reporting.",
   "At every rung: recurring selling authorizations drafted, issued and tracked in AWS Marketplace; Kiflo Core stood up and operated inside the engagement fee; and Partner Revenue Measurement attribution configured for the channel.",
   "A constraint worth stating for AWS: AWS permits only one partner identifier per resource, so partner attribution runs on user agent string rather than competing tags.",
  ],
  "Technology considerations":[
   "Delivery is a staffed channel function against AWS-operated systems, plus one licensed component.",
   "AWS supplies Marketplace, the CPPO mechanism, selling authorizations and attribution. Automatum supplies the listing, the seller-of-record position and the offer issuance. OBP supplies recruitment, agreements, enablement, training, the deal desk and the reviews.",
   "Kiflo Core is the partner system of record — portal, onboarding, deal registration and commission tracking, with HubSpot and Salesforce sync — stood up and operated by OBP inside the engagement fee, and it is the auditable source behind the partners-issuing-offers count. [Seats per rung — to confirm.] " + COMMON_TECH_TAIL,
   "One mechanism requires AWS and Automatum confirmation before the outcome model is final: whether and by what mechanism a third-party reseller can issue offers against Automatum's listing while Automatum is seller of record. The entire scoreboard rests on it.",
  ],
  "Market Fit":[
   "Target market: ISVs with a live AWS listing and an intention to sell through resellers, without a channel function.",
   "Demand: driven by ISVs discovering that Marketplace channel revenue requires partners who are themselves registered, authorized and enabled — work that does not happen without an owner.",
   "Competitors: a channel manager hire plus a PRM subscription, channel consultancies, and doing nothing. The differentiator is a committed roster under management, a stated deal-desk turnaround, and a reported number a customer can actually point at.",
  ],
  "Marketing strategy":[
   "The solution carries its own overview and deck, and lists under its own Solution ID.",
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed for this solution; joint outbound from both partners; and referral from Managed Marketplace Operations, whose customers already transact and are the natural candidates for a channel.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs a named channel manager with a named backup, and at the top rung a named deal-desk owner with a stated coverage window.",
   "Staffing must be capacity-tested before publication: the deal-desk turnarounds and the review cadence are staffing commitments, and the uncapped roster at the top rung is the hardest of the four to bound. [Named-owner hours per rung and accounts per owner — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Wave two of a two-wave submission sequence, submitted alongside Managed Marketplace Operations, opening on wave one's Milestone 1 approval.",
   "Per engagement: a twelve-month term, set by the eight-month ramp from first outreach to a first partner transaction.",
   "Constraints: each recruited partner must clear its own AWS gate — paid seller registration, tax interview, USD disbursement and service-linked role — which is the partner's act and outside both the ISV's and the partners' control.",
  ],
  "Initial  Financial projections":[
   "List price $2,500 / $5,000 / $7,500 a month across three rungs, on a twelve-month term. Priced on the seniority of the person on the account, on the same ladder as Managed AWS Alliances.",
   "Kiflo Core licence cost is carried inside the engagement fee and must be stress-tested against the lowest rung in the portfolio. Revenue split between the partners is under negotiation. [Volume forecast, seats per rung, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":["[Insert architecture diagram — to supply.]"],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding, in wave two.",
   "Findings: the strongest twelve-month justification of the four, and a reported metric a customer can audit because it sits in a system of record. The material risk is a mechanism question rather than a delivery question — if a third-party reseller cannot issue offers against Automatum's listing under its seller-of-record position, the outcome model needs rebuilding. The partners recommend confirming that before build rather than during it.",
   "Open before build: the reseller offer-issuance mechanism; the CPPO boundary with Managed Marketplace Operations; Kiflo seats per rung and licence cost recovery; ownership of the partner agreements and the channel record at end of term or on non-renewal; and the staffing model.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the channel, the deal desk and the partner system of record, through a named channel manager with a named backup. Automatum is first line for the listing, offer issuance and selling authorizations. Recruited partners are supported by OBP; the ISV's own customers remain the ISV's.",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution. Managed Marketplace Operations is also a source: its customers already transact and are the natural candidates for a channel. Partner-sourced deals filed to ACE by OBP are counted separately from the programme's five per Solution ID. An opportunity belongs to exactly one solution. Where a customer buys more than one of the four, the higher solution's commit column governs any overlap and the same work is not billed twice.",
  "commercial":"Not yet — see the equivalent response in the other three studies. Two items are specific to this solution: Kiflo Core licence cost recovery inside the engagement fee, stress-tested against the lowest rung; and ownership of the executed partner agreements and the Kiflo channel record at end of term or on non-renewal, which is a question the ISV will ask before signing.",
 },
},
]

# ---------- machinery ----------
def norm(s):
    s = re.sub(r'\s+',' ',s).strip().lower()
    s = re.sub(r'\s*/\s*','/',s)
    return s.rstrip('?.').strip()

def make_para(model_p, text, bold=False):
    """Clone a paragraph in the cell, keep its formatting, swap the text."""
    p = copy.deepcopy(model_p)
    runs = p.findall(W+'r')
    if not runs:
        # empty cell: build a run, inheriting the paragraph's own run properties
        keep = etree.SubElement(p, W+'r')
        pPr = p.find(W+'pPr')
        if pPr is not None and pPr.find(W+'rPr') is not None:
            keep.append(copy.deepcopy(pPr.find(W+'rPr')))
        runs = [keep]
    keep = runs[0]
    for r in runs[1:]:
        p.remove(r)
    for t in keep.findall(W+'t'):
        keep.remove(t)
    rPr = keep.find(W+'rPr')
    if bold and rPr is not None and rPr.find(W+'b') is None:
        b = etree.SubElement(rPr, W+'b'); b.tail=None
    if not bold and rPr is not None:
        for tag in (W+'b', W+'bCs'):
            e = rPr.find(tag)
            if e is not None: rPr.remove(e)
    t = etree.SubElement(keep, W+'t')
    t.text = text
    t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    return p

def fill_cell(tc, values):
    """Replace a value cell's paragraphs with one paragraph per string."""
    paras = tc.findall(W+'p')
    if not paras: return False
    model = paras[0]
    new = [make_para(model, v) for v in values]
    new = [n for n in new if n is not None]
    if not new: return False
    idx = list(tc).index(paras[0])
    for p in paras: tc.remove(p)
    for off, p in enumerate(new): tc.insert(idx+off, p)
    return True

def build(sol, outpath):
    tree = etree.parse(SRC)
    root = tree.getroot()
    body = root.find(W+'body')

    # 1. strip the template's own instruction blocks
    for p in list(body.findall(W+'p')):
        t = txt(p)
        # the instruction block sits inside a text box, so its paragraph text
        # begins with drawing coordinates - match on containment, not prefix
        if 'Remove before submitting' in t or t.startswith('Study instructions:'):
            body.remove(p)

    # 2. title line
    for p in body.iter(W+'p'):
        if 'Multi-Partner Feasibility Study' in txt(p):
            np = make_para(p, f'Automatum × OBP — {sol["name"]}: Multi-Partner Feasibility Study')
            if np is not None:
                p.getparent().replace(p, np)
            break

    # 3. fill every table row whose label we recognise
    wanted = {}
    wanted.update({norm(k): [v] for k, v in sol['summary'].items()})
    wanted.update({norm(k): (v if isinstance(v, list) else [v]) for k, v in sol['overview'].items()})
    wanted[norm('Lead Partner')] = ['Automatum — owns the listed software and is seller of record.']
    wanted[norm('Supporting Partners')] = ['Only Best Practices (OBP) — delivers the engagement.']
    wanted[norm('Study Submitter Name/Title')] = ['[Submitter name and title — to supply]']
    wanted[norm('Submitter Phone/Email')] = ['[Submitter phone and email — to supply]']
    wanted[norm('Date Submitted')] = ['[Date — to supply]']
    for k, v in REG_BRACKET.items(): wanted[norm(k)] = [v]
    for k, v in PARTNERSHIP: wanted[norm(k)] = [v]
    wanted[norm('Partner 3 Name (if needed), add Partner 4+ below.')] = ['Not applicable — two partners.']
    wanted[norm('Which Partner is the first line of support? How does the support model work?')] = [sol['team']['first line']]
    wanted[norm('Who generated opportunities for the solution? If multiple, describe how the partners work together?')] = [sol['team']['opportunities']]
    wanted[norm('Have the partners determine if they can work together commercially?')] = [sol['team']['commercial']]

    filled, seen, block = 0, set(), 0
    for tr in body.iter(W+'tr'):
        tcs = tr.findall(W+'tc')
        if len(tcs) < 2: continue
        key = norm(txt(tcs[0]))
        m = re.match(r'partner (\d+) name', key)
        if m: block = int(m.group(1))
        target = tcs[1] if len(tcs) == 3 else tcs[-1]   # 3-cell rows keep a spacer column
        if key in wanted:
            # there is no third partner: leave that block explicitly not applicable
            # rather than bracketed, which would read as a partner we failed to name
            vals = ['Not applicable — two partners.'] if block >= 3 else wanted[key]
            if fill_cell(target, vals):
                filled += 1; seen.add(key)
    tree.write(SRC+'.tmp', xml_declaration=True, encoding='UTF-8', standalone=True)

    shutil.copy('template.docx', outpath)
    with zipfile.ZipFile('template.docx') as zin, zipfile.ZipFile(outpath,'w',zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = open(SRC+'.tmp','rb').read() if item.filename=='word/document.xml' else zin.read(item.filename)
            zout.writestr(item, data)
    os.remove(SRC+'.tmp')
    return filled, set(wanted) - seen

os.makedirs('Automatum-OBP-Feasibility', exist_ok=True)
for sol in SOLUTIONS:
    out = f"Automatum-OBP-Feasibility/{sol['file']}_Feasibility-Study.docx"
    n, missed = build(sol, out)
    print(f"  {sol['name']:38s} {n:2d} fields filled" + (f"  UNMATCHED: {sorted(missed)}" if missed else ""))
