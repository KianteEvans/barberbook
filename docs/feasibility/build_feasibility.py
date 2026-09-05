import copy, os, re, zipfile
from lxml import etree
from PIL import Image

W="{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R="{http://schemas.openxmlformats.org/package/2006/relationships}"
SRC="unpacked/word/document.xml"
RELS="word/_rels/document.xml.rels"
DIAGRAMS=os.path.join(os.path.dirname(os.path.abspath(__file__)),"diagrams")

# the Draft Reference Architecture cell is 8509 twips wide; 5.70 in clears the
# table's 85-twip overhang into the right margin without forcing the column open
IMG_CX = 5212080
IMG_REL, IMG_PART = "rId12", "word/media/image2.png"

def txt(el): return "".join(el.itertext()).strip()


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
  "Customer Use Case":"An ISV is pursuing enterprise deals that require procurement through AWS Marketplace. The engagement makes the product transactable on AWS — Well-Architected review, remediation, Foundational Technical Review and a published listing.",
  "AWS Services":"AWS Marketplace; AWS Marketplace Management Portal (AMMP); AWS Well-Architected Framework Review; AWS Foundational Technical Review (FTR); AWS Partner Central / ACE.",
  "Expected Launch Date":"[Launch date — to confirm]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is the CRO, co-sponsored by the CISO, and the outcome is top-line. Enterprise buyers increasingly procure software through AWS Marketplace, and this engagement is for reaching them. The ISV can transact the enterprise pipeline it already holds once the listing is published, and from the same listing the ISV pursues net new revenue from net new customers. Each of those deals transacts on AWS Marketplace, where the enterprise buyer settles against AWS spend it has already committed, so procurement clears for the ISV. FTR acceptance grants AWS Qualified Software status and Solutions Finder placement, and the ISV looks to that standing for reach among buyers already spending on AWS. The listing is also what lets the ISV register its own deals in ACE, and from there the ISV works towards AWS co-sell, the account-team relationships that come with it, and a wider top of funnel. The solution combines AWS components (Marketplace, the Well-Architected Framework Review, the Foundational Technical Review), Automatum's listing and seller-of-record position, and OBP's delivery.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CRO] — the revenue owner whose enterprise deals depend on a Marketplace listing. [CISO] co-sponsors where the Well-Architected and FTR evidence is what the enterprise buyer is asking for. Both to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose the Marketplace Compliance Accelerator: a fixed-fee project that makes an ISV's product transactable on AWS Marketplace, in 14 to 18 business days of delivery, for $10,000.",
   "What the ISV pursues is net new: the enterprise buyer who procures through AWS Marketplace, a customer within the ISV's reach once its listing is published, and the revenue those deals bring the ISV.",
   "Automatum leads the solution, owns the listed software and is seller of record; OBP delivers the engagement. The customer signs one agreement and transacts through AWS Marketplace on Automatum's listing, with software on one line and professional services on the other.",
   "For the CRO the outcome is enterprise deals the ISV holds today and can close on AWS Marketplace, on the procurement route the enterprise buyer already uses. For the CISO it is Well-Architected and FTR evidence an enterprise buyer will accept, produced inside the same engagement. Well-Architected data collection and remediation are automated by OBP's own tooling.",
  ],
  "Description of Solution":[
   "Final delivery is a published, transactable AWS Marketplace listing, with the compliance evidence an enterprise buyer and AWS both require.",
   "The engagement covers: a Well-Architected Framework Review conducted and its findings remediated in the product; the AWS Foundational Technical Review prepared and submitted; the Marketplace listing built, configured and taken through publication; architecture diagrams maintained in AMMP to evidence the \"Deployed on AWS\" badge; and seller registration completed.",
   "Marketplace access is a precondition for a growing share of enterprise software procurement, and FTR acceptance grants AWS Qualified Software status and Solutions Finder placement, valid two years. Demand is evidenced by [pipeline figure — to supply from OBP's closed and in-flight deals].",
  ],
  "Technology considerations":[
   "Delivery is professional services against AWS-operated systems; every software component the engagement uses is already built and in service.",
   "Components: OBP operates automated Well-Architected data collection that suggests answers to the questionnaire and generates CloudFormation and AWS CLI templates resolving findings. Automatum supplies the Marketplace listing the product publishes to, and is seller of record. AWS supplies Marketplace, AMMP, the Well-Architected tool and the FTR process.",
   "Labour: OBP compliance engineering, plus [N] hours of the customer's own engineering availability for remediation. The customer supplies tax, bank and legal data for seller registration. The components listed above are the complete set for the engagement. Licence cost recovery sits inside the engagement fee.",
  ],
  "Market Fit":[
   "Target market: ISVs whose enterprise deals require Marketplace procurement, at the pre-listing or pre-FTR stage. A second segment buys on trust evidence: the AWS standing and directory presence that follow FTR acceptance are what the enterprise security review asks for, and the CISO sponsors the work.",
   "Demand: enterprise buyers require Marketplace transactability, and ISVs pursue AWS co-sell, which depends on it. Past the first deal, what an ISV targets from a published listing compounds: further enterprise deals clearing procurement on the same route, its own deals entering AWS co-sell through ACE, AWS account teams working alongside its sellers, and more prospects entering the funnel.",
   "Competitors: AWS systems integrators offering listing services, ISVs attempting it in-house, and AWS's own self-service path. The offer is a fixed fee, a stated delivery window, and an automated Well-Architected component.",
  ],
  "Marketing strategy":[
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed by the partners for this solution; and joint outbound from both partners.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP delivers with existing compliance engineering staff. Automatum contributes the listing and the seller-of-record position.",
   "The delivery window is a staffing commitment. [Concurrent engagement capacity — to confirm.]",
   "The volumes currently forecast sit within the capacity of the team already in place.",
  ],
  "Schedule":[
   "Per engagement: 14 to 18 business days of delivery, counted as business days worked on the engagement; [the clock start — to define] and it runs from the customer's inputs being met.",
   "Constraints: the publication date is governed by AWS's FTR review queue, which AWS schedules; the twelve-month listing deadline applies from entry [clock basis — per Solution ID from entry, or programme-level — to confirm with AWS].",
  ],
  "Initial  Financial projections":[
   "List price $10,000 fixed, 50% on signature and 50% on completion. Twenty hours of remediation are included; further blocks of ten hours are $1,000 each.",
   "[Volume forecast and margin — to supply.]",
  ],
  "Draft Reference Architecture":[{"image":"01_Marketplace-Compliance-Accelerator_architecture.png",
   "alt":"Four lanes — ISV customer, OBP, Automatum and AWS. The ISV's product and the customer's remediation hours feed OBP's automated Well-Architected data collection and remediation, then the FTR submission and the listing build. Automatum completes seller registration and holds the listing and seller-of-record account in AMMP. AWS supplies the Well-Architected Tool, the Foundational Technical Review — dashed, because AWS's queue governs the date — and AWS Marketplace, where the enterprise buyer procures."}],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding.",
   "Findings: the CRO is the buyer and the outcome sought is top-line. The work is repeatable, the delivery window is provable, the effort is largely automated and the commercial structure is simple.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the engagement and for the compliance work. Automatum is first line for anything touching the listing itself, private offers or the seller-of-record position, since those sit in its account. Escalation between the partners is [named path — to define], and the customer sees a single named OBP owner throughout.",
  "opportunities":"Both partners source. OBP sources from its own compliance and AWS practice pipeline; Automatum sources from its listing and ISV relationships; AWS sources through ACE, where five opportunity submissions are committed for this solution. An opportunity is registered against this Solution ID.",
  "commercial":"Not yet. Both partners have seen the engagement structure — one customer agreement per Solution ID, with the software and the professional services carried on separate lines of Automatum's listing. The commercial terms between the partners cover the revenue split on each line, the flow of funds and payment trigger, Marketplace fee treatment and milestone apportionment.",
 },
},
{
 "file":"02_Managed-AWS-Alliances",
 "name":"Managed AWS Alliances",
 "summary":{
  "Customer Use Case":"An ISV with an AWS listing and an AWS revenue target of its own needs a named Director of Alliances to run the AWS partnership and drive its AWS programme progression — ISV Accelerate, Competency acceptance, MDF, and its own BOX Program listings.",
  "AWS Services":"AWS Partner Central / ACE; AWS Marketplace; ISV Accelerate Program; AWS Competency Programs; AWS Marketing Development Funds (MDF); AWS Business Outcomes Xcelerator.",
  "Expected Launch Date":"[Launch date — to confirm]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is the CRO, with the CEO co-sponsoring at smaller ISVs, and the outcome is top-line: net new revenue and net new customers the ISV sources through AWS. The AWS-sourced pipeline and co-sell revenue the ISV works toward come from the programme benefits it qualifies for and the co-sell opportunities AWS originates. The retainer prepares and files those applications, and from Growth holds weekly ACE hygiene checks; what the ISV pursues on that footing is standing with the AWS field — at Professional, introductions to Account Executives, Partner Sales Managers and a Segment Leader — MDF and sponsored-campaign leads at the top of its funnel, and the co-sell deals AWS routes to it. Each co-sell deal the ISV closes counts on its own books as revenue and a customer won through AWS; where that deal transacts on the ISV's listing, it registers there as a Marketplace transaction and in ACE as an entry of the ISV's own. The solution combines components from AWS (Partner Central, ACE, ISV Accelerate, Competency, MDF), from Automatum (the listing and seller-of-record position) and from OBP (the alliance function itself). What it supplies is the Director of Alliances seat, staffed as a retained service.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CRO] — the revenue owner who carries the ISV's AWS-sourced pipeline and co-sell revenue. [CEO] co-sponsors at ISVs where the CEO carries the revenue number. Both to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed AWS Alliances: OBP acts as the ISV's Director of Alliances for twelve months across three strictly additive tiers, priced $2,500 / $5,000 / $7,500 a month.",
   "The solution puts a named owner on the AWS partnership and drives the ISV's own AWS programme progression. What the partners commit to is the machinery — a named owner with a named backup, partnership reviews held and minuted, quarterly AWS plans, and every ISV Accelerate, Competency, MDF and BOX Program listing application prepared and filed. What they target is what AWS decides: acceptance, MDF availability, listings approved and AWS-sourced leads.",
   "For the CRO the outcome is the top line: net new revenue and net new customers the ISV pursues through AWS — the programme benefits it qualifies for, and the co-sell opportunities that originate with AWS. For the CEO, who co-sponsors at the smaller end of that market, it is a staffed AWS partnership and the AWS programme funding the ISV goes after.",
  ],
  "Description of Solution":[
   "Final delivery is twelve months of a staffed AWS partnership: a named Director of Alliances, a fixed cadence of partnership reviews and quarterly AWS plans, and a filed application trail against every AWS programme the ISV qualifies for.",
   "Tier outcomes the ISV pursues: at Essentials, ISV Accelerate acceptance (unlocking up to 25k in MDF), one Competency acceptance (up to 50k in MDF), one BOX Program listing (unlocking 35k in AWS credits, 35k in cash and 55 leads via a sponsored AWS marketing campaign), and AWS-facing marketing collateral. At Growth, up to three Competency acceptances and three BOX Program listings, quarterly events, weekly ACE hygiene checks and funding application support. At Professional, all applicable Competency programmes, uncapped BOX Program listings, and introductions to four Account Executives, two Partner Sales Managers and one Segment Leader.",
   "The BOX Program listings referenced above are the ISV customer's own participation, which this retainer drives them toward.",
  ],
  "Technology considerations":[
   "Delivery is a staffed alliance function: the engagement supplies people, cadence and a filed application trail, and runs entirely on systems AWS already operates.",
   "AWS supplies Partner Central, ACE, the programme applications and the funding mechanisms. Automatum supplies the listing and the seller-of-record position, and files the partners' ACE opportunities from [whose Partner Central instance — to confirm]. OBP supplies the alliance function: the named owner, the reviews, the plans, the application preparation and the reporting.",
   "The components listed above are the complete set for the engagement. Licence cost recovery sits inside the engagement fee.",
  ],
  "Market Fit":[
   "Target market: ISVs with an AWS listing and AWS revenue ambition, typically below the size at which a full-time Director of Alliances is affordable.",
   "Demand: AWS programmes carry benefits an ISV qualifies for through its listing, and AWS awards them on the applications an ISV files and the co-sell records it keeps current. ISVs at this size buy that work to become known to the AWS field, to bring MDF and sponsored campaigns to the top of their funnel, and to win the co-sell deals AWS routes to them. Each such deal is net new revenue and a net new customer for the ISV, and where it transacts on the ISV's listing it lands there as a transaction and in ACE as an entry of the ISV's own — the track record the next round of applications and co-sell is argued from. Building that record cycle after cycle is what the ISV works toward, and AWS decides each further round of benefits and co-sell.",
   "Competitors: a direct Director of Alliances hire, and AWS consulting partners offering alliance advisory. The offer is a named owner at a stated cadence with a filed application trail.",
  ],
  "Marketing strategy":[
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed by the partners for this solution; and joint outbound from both partners.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs each engagement with a named alliance lead and a named backup, so the cadence holds through absence.",
   "The staffing model sets named-owner hours per rung and how many accounts one owner can hold. [Staffing model — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Per engagement: a twelve-month term, with the review and planning cadence running from kickoff. [Cadence counts and the action-log service level — to confirm with the staffing model.]",
   "Constraints: every programme outcome runs to AWS decision timelines, which AWS sets; the twelve-month listing deadline applies from entry [clock basis — to confirm with AWS].",
  ],
  "Initial  Financial projections":[
   "List price $2,500 / $5,000 / $7,500 a month across three strictly additive tiers, on a twelve-month term. Priced on the seniority of the person on the account.",
   "Each rung carries its own included volumes and overflow rates. [Volume forecast, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":[{"image":"02_Managed-AWS-Alliances_architecture.png",
   "alt":"Four lanes — ISV customer, OBP, Automatum and AWS. OBP's Director of Alliances runs the reviews, plans and reporting the ISV's CRO and CEO receive, and prepares and files programme applications into AWS Partner Central, which holds the ISV's own ACE opportunities, ISV Accelerate, Competency, MDF and BOX Program listing. Automatum supplies the listing and seller-of-record position; the Partner Central instance the partners' own ACE opportunity submissions are filed from is dashed, pending confirmation. The benefits the ISV captures return on a dashed arrow, because AWS decides them."}],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding.",
   "Findings: the buyer is the CRO, and the CEO co-sponsors; the outcome is top-line — AWS-sourced pipeline the ISV converts into net new customers and revenue of its own — with a commercial model sound at list price. Every commitment here is a staffing commitment, and delivery capacity is the open risk.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support and owns the customer relationship through a named alliance lead with a named backup. Automatum is first line for the listing, private offers, selling authorizations and the seller-of-record position. Escalation between the partners is [named path — to define].",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution — Automatum and OBP registering their own sales of it. An opportunity is registered against this Solution ID. The ISV customer's co-sell deals are the customer's own opportunities, raised on the customer's own deals and running through the customer's own opportunity flow.",
  "commercial":"Not yet. The commercial terms between the partners cover the revenue split on each line, the flow of funds and payment trigger, Marketplace fee treatment and milestone apportionment.",
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
  "Expected Launch Date":"[Launch date — to confirm]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is the CRO, co-sponsored by the COO, and the outcome is directly top-line: the listing is the mechanism through which the ISV transacts on AWS, and the offer desk converts demand the ISV already has into offers drafted and issued. The net new the ISV is after is revenue and customers won on Marketplace — deals that close because the offer reaches the buyer fast enough, and channel deals reachable through a CPPO. The rung sets the included offer band the desk operates, up to 50, 100 or 200 offers a year, and what the ISV pursues through each offer its buyer accepts is revenue booked on a subscription running through its own listing, an opportunity it can register in ACE, a customer relationship it holds on AWS, and its name in front of the AWS sellers working that account, at the top of its own funnel. It combines AWS components (Marketplace, AMMP, FTR, CPPO), Automatum's listing and seller-of-record position, and OBP's operations function. What it supplies is the offer desk and the compliance engineering behind the listing, staffed as a retainer.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CRO] — the revenue owner whose private offers and Marketplace revenue run through the listing. [COO] co-sponsors where the listing is carried as an operational function. Both to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed Marketplace Operations: a twelve-month retainer that gets a listing live and then operates it at volume, priced $1,500 / $3,000 / $6,000 a month.",
   "For the CRO the outcome is what the ISV pursues on its own AWS Marketplace listing: net new revenue and net new customers, from offers issued at the volume the rung provides for and from channel deals a CPPO opens. For the COO it is the listing carried as an operating function, with a named owner behind it and a monthly view of offers, Marketplace revenue and listing health.",
   "All nine services are delivered at every rung — compliance engineering, listing engineering, and the offer desk and reporting. Volume, turnaround and review cadence set the rung. Pricing is on throughput: the rungs track the included offer band, at the same rate per included offer at each.",
  ],
  "Description of Solution":[
   "Final delivery is a live AWS Marketplace listing operated at the rung's volume, with a written service level issued at onboarding, twelve monthly operating packs and an annual state-of-the-listing review.",
   "Nine services at every rung: a Well-Architected Framework Review conducted and findings remediated — the FTR takes a completed WAFR as its input, so compliance engineering runs before the listing is built; the FTR prepared and submitted; the listing built, configured and taken through publication; architecture diagrams maintained in AMMP to evidence the \"Deployed on AWS\" badge; CRM integration configured for Marketplace offers and subscriptions; a private offer desk operating direct offers and CPPOs; listing configuration changes inside the rung's turnaround; and monthly reporting on offers, Marketplace revenue and listing health.",
   "Rung depth: one, two or four Well-Architected reviews; up to 50, 100 or 200 offers operated per year; listing configuration changes in five, three or one business days.",
  ],
  "Technology considerations":[
   "Delivery is professional services against AWS-operated systems; every software component the engagement uses is already built and in service.",
   "AWS supplies Marketplace, AMMP, the Well-Architected tool, the FTR process and the CPPO mechanism. Automatum supplies the listing, issues every private offer as seller of record, and provides the CRM and Partner Central integrations. OBP supplies compliance engineering, the offer desk, listing configuration and reporting.",
   "OBP drafts and submits offers; Automatum issues them. Each issue turnaround here rests on a matching internal turnaround at Automatum. [CRM platforms Automatum's integration supports — to confirm.] The components listed above are the complete set for the engagement. Licence cost recovery sits inside the engagement fee.",
  ],
  "Market Fit":[
   "Target market: ISVs transacting on AWS Marketplace at volume, or intending to, where the desk behind the listing is the piece the revenue owner buys in.",
   "Demand: driven by private offer volume. An ISV issuing offers at any material rate needs a desk. Volume is what an ISV compounds on: renewals and expansions it pursues on its own listing, a co-sell record it can build in ACE, and AWS customer relationships it can carry into next year's pipeline.",
   "Competitors: a Marketplace operations hire, AWS consulting partners offering listing management, and ISVs operating the desk in-house. The offer is a stated offer band with a stated turnaround, priced linearly against the band.",
  ],
  "Marketing strategy":[
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed by the partners for this solution; and joint outbound from both partners.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs a named operations owner and a named backup, with the desk open across a stated coverage window. The top rung's increment is coverage and response band.",
   "Every turnaround at a rung is a staffing commitment. [Desk coverage window and time zone, and accounts per owner — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Per engagement: a twelve-month term. The listing work runs at the start of the term; the operating cadence runs across all twelve months.",
   "Constraints: AWS's FTR review queue governs the publication date; AWS-mandated catalog and policy changes arrive on AWS's schedule and are assessed within the rung's turnaround, though landing them before an AWS deadline may require the customer's own engineering.",
  ],
  "Initial  Financial projections":[
   "List price $1,500 / $3,000 / $6,000 a month on a twelve-month term — $18,000, $36,000 and $72,000 across the term, against included offer bands of 50, 100 and 200 offers a year. The rate per included offer is identical at all three rungs.",
   "[Overflow rates above the included band — to set.] [Volume forecast, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":[{"image":"03_Managed-Marketplace-Operations_architecture.png",
   "alt":"Four lanes — ISV customer, OBP, Automatum and AWS — drawn as a loop. An offer requested by the ISV's CRO is drafted by OBP's offer desk, issued by Automatum as seller of record, and carried by AWS Marketplace as a private offer or CPPO to the buyer or channel partner. Marketplace and subscription data returns through Automatum's CRM and Partner Central integration into OBP's monthly operating pack."}],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding.",
   "Findings: the buyer is the CRO, co-sponsored by the COO, and the outcome is a top-line one — the net new revenue and net new customers the ISV pursues on its own listing. The solution is repeatable, and its pricing tracks its own included band.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the desk, compliance engineering and reporting, through a named operations owner with a named backup. Automatum is first line for the listing itself, offer issuance and the seller-of-record position. The handoff between the two on an offer, and its turnaround, are [to agree].",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution. An opportunity is registered against this Solution ID. The ISV's own deals reaching AWS co-sell are registered by the ISV under its own opportunity flow.",
  "commercial":"Not yet. The commercial terms between the partners cover the revenue split on each line, the flow of funds and payment trigger, Marketplace fee treatment and milestone apportionment. OBP publishes an offer-issue or listing-configuration turnaround once Automatum agrees a matching internal turnaround behind it.",
 },
},
{
 "file":"04_Managed-Partner-Development",
 "name":"Managed Partner Development",
 "summary":{
  "Customer Use Case":"An ISV needs a reseller channel on AWS built and run — partners recruited and managed, a CPPO deal desk, selling authorizations, enablement, a partner system of record and attribution reporting.",
  "AWS Services":"AWS Marketplace; Channel Partner Private Offers (CPPO); selling authorizations; AWS Partner Central / ACE; AWS Marketplace seller reporting.",
  "Expected Launch Date":"[Launch date — to confirm]",
  "Is this a Public Sector solution?":"No.",
  "Is this a Business Outcomes Solution?":"Yes. The buyer is the CRO, co-sponsored by the VP Channel where that role exists, and the outcome is top-line: net new customers reached through resellers, and partner-sourced revenue added to what the ISV's own sellers close. Both are targets the ISV pursues through the channel, and the end customer's decision to buy settles them. A partner deal transacts as a CPPO on the ISV's AWS Marketplace listing, attributed through Partner Revenue Measurement so the ISV can see what its channel sources; that deal is the ISV's own to register in ACE for AWS co-sell; and the AWS relationships and accounts a reseller holds are the top of funnel the ISV is reaching for. The solution combines AWS components (Marketplace, CPPO, selling authorizations, attribution), Automatum's listing and seller-of-record position, and OBP's channel function, with OBP's partner system of record, included in the fee.",
  "Target Industry for solution?":"Independent software vendors, horizontal across industries. [Priority verticals — to confirm.]",
  "Target Customer Persona for solution?":"[CRO] — the revenue owner accountable for partner-sourced revenue. [VP Channel] co-sponsors where the channel function already exists. Both to be validated against OBP's closed and in-flight deals.",
 },
 "overview":{
  "Executive summary":[
   "Automatum and OBP propose Managed Partner Development: a twelve-month retainer that stands up and runs an ISV's reseller channel on AWS, priced $2,500 / $5,000 / $7,500 a month.",
   "What the partners commit to is the roster under management and the machinery around it — up to six, up to twelve, or an uncapped roster of net new partners recruited and managed, a CPPO deal desk at the rung's turnaround, training on cadence, channel reviews with sourced-pipeline and attribution reporting, and OBP's partner system of record operated inside the fee. What they report and target is partners issuing offers, because that depends on the partners themselves.",
   "For the CRO the outcome is top-line: customers a reseller opens for the ISV, and revenue the channel sources alongside its own sellers, both of which the ISV targets and the end customer decides. For the VP Channel it is the channel itself running: agreements executed, a roster under management, and a deal desk answering partner registrations inside its stated turnaround, which OBP staffs and operates. Ramp from first outreach to a first partner transaction models at eight months, which sets the twelve-month term.",
  ],
  "Description of Solution":[
   "Final delivery is a working reseller channel: executed partner agreements and a margin schedule, a live partner portal carrying onboarding, deal registration and commission tracking, recruitment and enablement running on a named cadence, a deal desk answering registrations, and a monthly report whose headline number is partners issuing offers.",
   "Rung depth: up to six, twelve or an uncapped roster of net new partners recruited and under management; twice-yearly, quarterly or monthly training and enablement sessions; a CPPO deal desk at one business day, eight business hours or four business hours; quarterly, monthly or fortnightly channel reviews with sourced-pipeline and attribution reporting.",
   "At every rung: recurring selling authorizations drafted, issued and tracked in AWS Marketplace; OBP's partner system of record stood up and operated inside the engagement fee; and Partner Revenue Measurement attribution configured for the channel.",
   "AWS permits only one partner identifier per resource, so partner attribution runs on user agent string.",
  ],
  "Technology considerations":[
   "Delivery is a staffed channel function against AWS-operated systems, plus one licensed component.",
   "AWS supplies Marketplace, the CPPO mechanism, selling authorizations and attribution. Automatum supplies the listing, the seller-of-record position and the offer issuance. OBP supplies recruitment, agreements, enablement, training, the deal desk and the reviews.",
   "OBP's partner system of record — portal, onboarding, deal registration and commission tracking, with CRM sync — is stood up and operated inside the engagement fee, and it is the auditable source behind the partners-issuing-offers count. [Seats per rung — to confirm.] The components listed above are the complete set for the engagement. Licence cost recovery sits inside that fee.",
   "One mechanism requires AWS and Automatum confirmation before the outcome model is final: whether, and by what mechanism, a third-party reseller can issue offers against Automatum's listing while Automatum is seller of record. The reported metric depends on it.",
  ],
  "Market Fit":[
   "Target market: ISVs with a live AWS listing and an intention to sell through resellers, at the point where the channel function is still to be built.",
   "Demand: driven by ISVs discovering that Marketplace channel revenue requires partners who are themselves registered, authorized and enabled, work that requires an owner. What draws them is the compounding they are after: a partner sale transacts as a CPPO on the ISV's AWS Marketplace listing, with Partner Revenue Measurement attribution behind it, and the AWS relationships and accounts a reseller already holds are where an ISV looks to widen the top of its funnel.",
   "Competitors: a channel manager hire plus a PRM subscription, and channel consultancies. The offer is a committed roster under management, a stated deal-desk turnaround, and a count held in a system of record.",
  ],
  "Marketing strategy":[
   "Reach: AWS co-sell through ACE, with five ACE opportunity submissions committed by the partners for this solution; and joint outbound from both partners.",
   "[Sponsored AWS marketing campaign participation — to confirm.]",
  ],
  "Organization/ Teaming Structure":[
   "OBP staffs a named channel manager with a named backup, and at the top rung a named deal-desk owner with a stated coverage window.",
   "The deal-desk turnarounds and the review cadence are staffing commitments. [Named-owner hours per rung and accounts per owner — to confirm.]",
   "Hiring is anticipated at [volume threshold — to model].",
  ],
  "Schedule":[
   "Per engagement: a twelve-month term, set by the eight-month ramp from first outreach to a first partner transaction.",
   "Constraints: each recruited partner must clear its own AWS gate — paid seller registration, tax interview, USD disbursement and service-linked role — which is the partner's own act, taken on the partner's own timing.",
  ],
  "Initial  Financial projections":[
   "List price $2,500 / $5,000 / $7,500 a month across three rungs, on a twelve-month term. Priced on the seniority of the person on the account.",
   "The partner system of record is carried inside the engagement fee. [Volume forecast, seats per rung, retainer payment terms and margin — to supply.]",
  ],
  "Draft Reference Architecture":[{"image":"04_Managed-Partner-Development_architecture.png",
   "alt":"Four lanes — ISV customer, OBP, Automatum and AWS. OBP recruits, contracts and enables reseller partners and runs the partner system of record covering deal registration, commissions and CRM sync. Automatum issues selling authorizations and CPPOs as seller of record — dashed, because the mechanism awaits AWS and Automatum confirmation. AWS Marketplace carries them, the end customer transacts, and Partner Revenue Measurement attribution feeds OBP's monthly report on partners issuing offers."}],
  "First Customer Targets":["[Initial customers involved in solution design, with ACE opportunity links where entered — to supply.]"],
  "Findings and recommendations":[
   "Both partners recommend proceeding.",
   "Findings: the buyer is the CRO, and the outcome type is top-line — the customers and revenue an ISV targets from a reseller channel. The ramp to a first partner transaction is eight months, which sets the term, and the reported metric sits in a system of record where a customer can audit it. The material risk is a mechanism question: the outcome model depends on a third-party reseller being able to issue offers against Automatum's listing while Automatum is seller of record. Confirm before build.",
   "Open before build: the reseller offer-issuance mechanism, and ownership of the partner agreements and the channel record at end of term or on non-renewal.",
  ],
 },
 "team":{
  "first line":"OBP is first line of support for the channel, the deal desk and the partner system of record, through a named channel manager with a named backup. Automatum is first line for the listing, offer issuance and selling authorizations. Recruited partners are supported by OBP; the ISV's own customers remain the ISV's.",
  "opportunities":"Both partners source, and AWS sources through ACE, where five opportunity submissions are committed for this solution — each one covering an engagement of Managed Partner Development the partners are pursuing. An opportunity is registered against this Solution ID. Deals the ISV's channel sources are filed to AWS co-sell by OBP as the ISV's own opportunities.",
  "commercial":"Not yet. The commercial terms between the partners cover the revenue split on each line, the flow of funds and payment trigger, Marketplace fee treatment and milestone apportionment.",
 },
},
]

# ---------- machinery ----------
def norm(s):
    s = re.sub(r'\s+',' ',s).strip().lower()
    s = re.sub(r'\s*/\s*','/',s)
    return s.rstrip('?.').strip()

# The template declares neither the drawingml nor the picture namespace on its root,
# so the fragment carries both itself — which is how the template's own text boxes do it.
DRAWING = (
 '<w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
 ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
 ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
 ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
 ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
 '<wp:inline distT="0" distB="0" distL="0" distR="0">'
 '<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
 '<wp:docPr id="{pid}" name="{name}" descr="{alt}"/>'
 '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
 '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
 '<pic:pic><pic:nvPicPr><pic:cNvPr id="{pid}" name="{name}" descr="{alt}"/>'
 '<pic:cNvPicPr/></pic:nvPicPr>'
 '<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
 '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
 '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
 '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>')


def xesc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')


def make_image_para(model_p, spec):
    """Clone the cell's paragraph, drop its runs, and hang an inline picture off it."""
    p = copy.deepcopy(model_p)
    for r in p.findall(W+'r'):
        p.remove(r)
    pPr = p.find(W+'pPr')
    if pPr is None:
        pPr = etree.Element(W+'pPr'); p.insert(0, pPr)
    if pPr.find(W+'jc') is None:
        jc = etree.Element(W+'jc'); jc.set(W+'val','center')
        rPr = pPr.find(W+'rPr')                 # w:rPr is last in pPr; jc goes before it
        pPr.insert(list(pPr).index(rPr) if rPr is not None else len(pPr), jc)
    run = etree.SubElement(p, W+'r')
    run.append(etree.fromstring(DRAWING.format(
        cx=spec['cx'], cy=spec['cy'], pid=spec['pid'], rid=spec['rid'],
        name=xesc(spec['image']), alt=xesc(spec['alt']))))
    return p


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
    """Replace a value cell's paragraphs with one per value: text, or an inline picture."""
    paras = tc.findall(W+'p')
    if not paras: return False
    model = paras[0]
    new = [make_image_para(model, v) if isinstance(v, dict) else make_para(model, v)
           for v in values]
    new = [n for n in new if n is not None]
    if not new: return False
    idx = list(tc).index(paras[0])
    for p in paras: tc.remove(p)
    for off, p in enumerate(new): tc.insert(idx+off, p)
    return True

def add_image_rel(rels_xml, rid, target):
    root = etree.fromstring(rels_xml)
    assert not any(r.get('Id') == rid for r in root), f'{rid} is already taken'
    etree.SubElement(root, R+'Relationship', Id=rid, Target=target,
                     Type='http://schemas.openxmlformats.org/officeDocument/2006/'
                          'relationships/image')
    return etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)


def build(sol, outpath):
    arch = dict(sol['overview']['Draft Reference Architecture'][0])
    png = os.path.join(DIAGRAMS, arch['image'])
    with Image.open(png) as im:
        pw, ph = im.size
    arch.update(rid=IMG_REL, pid=1001, cx=IMG_CX, cy=int(round(IMG_CX * ph / pw)))

    with zipfile.ZipFile('template.docx') as zin:      # parts the picture adds to the package
        assert b'Extension="png"' in zin.read('[Content_Types].xml'), \
            'the package does not declare PNG; a new Default would be needed'
        extra = {IMG_PART: open(png, 'rb').read(),
                 RELS: add_image_rel(zin.read(RELS), IMG_REL, 'media/image2.png')}

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
    wanted[norm('Draft Reference Architecture')] = [arch]
    wanted[norm('Partner 3 Name (if needed), add Partner 4+ below.')] = ['Not applicable — two partners.']
    wanted[norm('Which Partner is the first line of support? How does the support model work?')] = [sol['team']['first line']]
    wanted[norm('Who generated opportunities for the solution? If multiple, describe how the partners work together?')] = [sol['team']['opportunities']]
    wanted[norm('Have the partners determine if they can work together commercially?')] = [sol['team']['commercial']]

    filled, seen = 0, set()
    for tbl in body.iter(W+'tbl'):
        # partner-block tracking is scoped to the Partnership Overview table only;
        # letting it leak past this table overwrites every later section
        block = 0
        for tr in tbl.iter(W+'tr'):
            tcs = tr.findall(W+'tc')
            if len(tcs) < 2: continue
            key = norm(txt(tcs[0]))
            m = re.match(r'partner (\d+) name', key)
            if m: block = int(m.group(1))
            target = tcs[1] if len(tcs) == 3 else tcs[-1]   # 3-cell rows keep a spacer column
            if key in wanted:
                # there is no third partner: mark that block not applicable rather than
                # bracketed, which would read as a partner we failed to name
                vals = ['Not applicable — two partners.'] if block >= 3 else wanted[key]
                if fill_cell(target, vals):
                    filled += 1; seen.add(key)
    tree.write(SRC+'.tmp', xml_declaration=True, encoding='UTF-8', standalone=True)

    with zipfile.ZipFile('template.docx') as zin, \
         zipfile.ZipFile(outpath,'w',zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename == 'word/document.xml':
                data = open(SRC+'.tmp','rb').read()
            elif item.filename in extra:
                data = extra.pop(item.filename)
            else:
                data = zin.read(item.filename)
            zout.writestr(item, data)
        for name, data in extra.items():          # parts the template does not have
            zout.writestr(name, data)
    os.remove(SRC+'.tmp')
    return filled, set(wanted) - seen

os.makedirs('OBP-Auto-SaaS-Feas', exist_ok=True)
for sol in SOLUTIONS:
    out = f"OBP-Auto-SaaS-Feas/{sol['file']}_Feasibility-Study.docx"
    n, missed = build(sol, out)
    print(f"  {sol['name']:38s} {n:2d} fields filled" + (f"  UNMATCHED: {sorted(missed)}" if missed else ""))
