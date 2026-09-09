# NeuroCity launch compliance audit

**Audit date:** 9 September 2026  
**Scope:** NeuroCity web marketplace, merchant dashboard, Selma, WhatsApp messaging, PayToday checkout, and planned Android release  
**Primary market assumed:** Namibia  
**Status:** Conditional no-go for unrestricted paid launch; suitable for a controlled non-payment pilot while the red items below are closed

## Purpose and limits

This is a product, code and regulatory readiness review. It is intended to reduce launch risk and give NeuroCity's Namibian lawyer, accountant, payment provider and operators a concrete sign-off list. It is not a legal opinion, tax opinion, payment-services licence determination or guarantee that a complaint or claim cannot occur.

The assessment assumes that NeuroCity is operated by a Namibian business, independent merchants are the sellers, customers can combine items from several merchants, PayToday processes the customer-facing payment, NeuroCity records allocations and intends to settle merchants at T+2, Selma uses OpenAI for visual/product assistance, and WhatsApp is used for enquiries and order updates. If any of these facts are wrong, the affected finding must be reassessed.

## Executive decision

NeuroCity has a stronger technical baseline than an ordinary pre-launch marketplace. It has versioned terms and privacy acceptance, role checks, administrator MFA, audit logs, hosted-provider payment redirection, consent-controlled analytics, data export and deletion-request entry points, security headers, private upload controls, and an incident/breach register.

It should not yet take unrestricted live marketplace payments. Four launch gates remain:

1. **Payment and settlement authority:** obtain written confirmation from Nedbank/PayToday that the contracted account may accept a combined multi-merchant payment, deduct any platform fee, and settle independent merchants. A Namibian payment-regulatory lawyer should confirm whether the final funds flow is fully covered by the provider arrangement under the Payment System Management Act and Bank of Namibia determinations.
2. **Refund and reconciliation proof:** build or formally document the real provider refund path, prevent an internal `refunded` status until a provider/bank reference is recorded, reconcile every payment/refund/allocation, and test cancellations, partial refunds, failed payments and chargebacks with real approved PayToday flows.
3. **Contract and legal identity:** publish the exact operator legal name, registration number, physical/business address and working support contacts; replace the short merchant acceptance text with a signed/versioned merchant agreement covering seller responsibility, prohibited goods, fees, tax, fulfilment, refunds, chargebacks, settlement, data handling, IP, suspension and termination.
4. **Privacy operations:** approve a retention schedule and make account deletion complete in practice. The current endpoint records a request but does not erase or de-identify the account and related data. Google Play requires actual deletion of associated data except clearly disclosed records retained for legitimate reasons.

Until those gates are closed, keep PayToday live collection disabled or restrict activity to a written, provider-approved test/pilot in which no merchant settlement promise is made beyond the approved arrangement.

## Priority register

| Priority | Area | Current evidence | Gap / required control | Owner | Release rule |
|---|---|---|---|---|---|
| **P0** | Payment-service perimeter | PayToday hosted intent integration; internal multi-merchant allocations and T+2 schedule | Written PayToday/Nedbank approval for marketplace collection and settlement; legal classification under the 2023 Act and PSD-1; identify who holds funds, performs KYC, bears chargebacks and pays merchants | Founder + payment counsel + PayToday | Must close before unrestricted paid launch |
| **P0** | Refunds and chargebacks | Issues can be raised and an admin can mark an order refunded | No verified provider refund instruction/reference; no partial-refund ledger; internal status can overstate money returned | Engineering + finance + PayToday | Must close before unrestricted paid launch |
| **P0** | Merchant agreement | Merchant application captures legal name, registration number, address, return policy and acceptance timestamp | Public terms are not a complete marketplace merchant contract; commission and final settlement terms are not agreed | Namibian lawyer + founder | Must close before onboarding live sellers |
| **P0** | Operator disclosure | Public terms/privacy and support email exist | Exact registered entity, company number and physical/business address are absent | Founder + lawyer | Must close before public paid launch |
| **P1** | Data deletion | Public and in-account request routes; export endpoint; request database table | Request is queued only; no fulfilment workflow, deadline, identity check, deletion/de-identification job or completion evidence | Privacy owner + engineering | Must close before Play production submission |
| **P1** | Retention | Privacy notice explains categories and exceptions | It says a schedule “must” exist; no approved schedule/evidence found | Privacy owner + accountant + lawyer | Approve before launch |
| **P1** | Tax and invoices | Order and payment records exist | Confirm VAT status; define platform-versus-merchant invoice responsibility; produce compliant tax invoices/receipts and preserve accounting records | Accountant + engineering | Must close before paid launch |
| **P1** | Restricted products | Terms prohibit unlawful goods in general | No operational prohibited-products policy, category gates, age controls, takedown/report channel or licence checks | Legal + marketplace operations | Must close before open merchant publishing |
| **P1** | Consumer checkout | Final totals and merchant policies are represented in the product/order model | Verify every checkout shows seller identity, goods, full price, delivery, timing, return/cancellation terms and a downloadable transaction record before payment | Product + legal QA | Must pass release test |
| **P1** | Processor governance | Privacy notice names provider categories and OpenAI visual-search use | Create processor register; execute/review DPAs and international-transfer terms; document access, deletion and incident duties | Privacy owner | Close before scale or EU targeting |
| **P1** | Google Play | Public privacy and account-deletion pages; Android shell/signing foundation | Complete accurate Data safety form, content rating, app access/reviewer credentials and verify real deletion | Android release owner | Must close before production submission |
| **P2** | Marketing and WhatsApp | Analytics is opt-in; WhatsApp order templates exist | Record WhatsApp/marketing opt-in source, scope and withdrawal; separate service messages from promotions; honour STOP/opt-out | Growth + engineering | Close before promotional messaging |
| **P2** | Intellectual property | Uploaders warrant rights in public terms | Add visible listing-report/takedown process, evidence retention and repeat-infringer handling | Marketplace operations | Close before open catalogue scale |
| **P2** | Corporate compliance | Merchant details are collected | Verify NeuroCity's BIPA annual duties, beneficial-ownership filing, registered details, contracts and insurance | Founder + accountant | Confirm before launch |
| **P2** | GDPR scope | Conditional GDPR language and breach workflow exist | Record whether NeuroCity targets or monitors people in the EEA; if yes, complete lawful-basis records, processor contracts, transfer safeguards, rights SLAs and representation/DPO assessment | Privacy counsel | Required before deliberate EEA expansion |

## Detailed findings

### 1. Payments, settlements, AML and financial records — red

The Payment System Management Act 14 of 2023 gives the Bank of Namibia regulatory powers over the national payment system. Bank of Namibia publishes PSD-1 for licensing/authorisation of payment service providers and additional determinations on fees and cyber resilience.[1][2] Whether NeuroCity itself requires approval depends on the exact contractual and funds-flow facts; the source code alone cannot answer that legal classification.

The high-risk fact is that the current terms promise a single combined PayToday invoice followed by NeuroCity merchant allocations and T+2 settlement. The database and admin tools schedule and manually mark allocations as settled. PayToday's public custom-integration guide says reconciliation is outside its integration scope and the integrator is responsible for it; it also requires provider-issued Shop Key, Shop Handle and Private Key credentials.[3]

Required evidence before launch:

- a signed PayToday/Nedbank agreement or written approval describing NeuroCity as a marketplace/platform, not merely a single merchant;
- a funds-flow diagram naming the legal holder of customer funds at every step;
- responsibility for merchant KYC/beneficial-owner checks, sanctions/AML screening, reserves, fraud, chargebacks, refunds and complaints;
- allowed commission/fee deduction and the approved settlement method and timing;
- provider reports/API fields sufficient to reconcile gross payment, order allocations, refunds, fees and payout references;
- written legal advice on whether NeuroCity is a payment service provider, payment intermediary, agent of merchants, or outside authorisation because the licensed provider performs the regulated service.

Do not treat PayToday business-account activation by itself as approval of marketplace settlement. Keep credentials in the production secret store, restrict them to payment-intent scope, rotate on suspected exposure, and never put them in the Android bundle.

### 2. Consumer transactions, product claims and returns — amber/red

Namibia's Electronic Transactions Act 4 of 2019 recognises electronic transactions. Its consolidated text lists the dedicated Chapter 4 consumer-protection provisions as not yet commenced, while other provisions have commenced at different dates.[4] The uncommenced chapter is still a useful design benchmark: it sets out supplier identity/contact disclosure, product characteristics, full pricing, terms access, transaction records and cancellation/refund mechanics. Its uncommenced status must not be represented as removing contract, advertising, sale-of-goods or common-law duties.

The Trade Practices Act restricts false or misleading price indications, and the Industrial Property Act treats misleading commercial indications and certain unfair-competition conduct as unlawful.[5][6] Merchant-authored product names, images, discounts, stock, delivery promises and health/quality claims therefore need review and correction controls.

The current platform shows prices and merchant return policies, but launch QA must prove for every cart/checkout variant that the customer sees:

- the independent seller's legal/trading identity and working contact details;
- accurate essential characteristics, variant, stock/preorder status and merchant;
- subtotal, tax treatment, delivery/service charge and final NAD amount before commitment;
- delivery/collection method, expected timing, cancellation and return conditions;
- a durable order confirmation/receipt and route to raise a complaint;
- which party supplies the product, issues the invoice, approves the return and returns the money.

NeuroCity needs a minimum marketplace return/refund standard. A merchant policy cannot remove mandatory rights. Refund decisions, items, amounts, reason, provider reference, dates, approver and customer notification should remain auditable. A database label alone is not proof of a refund.

### 3. Privacy and security — amber

No comprehensive Namibian Data Protection Act was located in the official parliamentary legislation register as at the audit date. Government reporting states that a Data Protection Bill had been finalised and submitted into the Cabinet process.[7][8] NeuroCity must still respect constitutional/common-law privacy, confidentiality, contract, communications, payment and sector-specific obligations. The register should be checked again before each major release because this area is changing.

The GDPR applies outside the EU only in the Article 3 circumstances, including offering goods/services to people in the Union or monitoring their behaviour there; global website accessibility alone should not be treated as automatic proof of applicability.[9] If NeuroCity deliberately targets EEA customers or monitors them, its current conditional GDPR wording must be backed by operational records and contracts.

Strong controls found:

- privacy and terms versions plus acceptance timestamps;
- optional analytics blocked until consent, with a reject option;
- password hashing, secure sessions, role checks, administrator MFA and audit events;
- private, type/size-limited document upload flow;
- customer data export;
- incident register, risk field, affected-user notification and authority-notification evidence;
- public and in-account account-deletion request entry points.

Gaps requiring closure:

- identify the controller with exact legal name, registration number, business address and contact;
- replace aspirational retention text with an approved record-by-record schedule, deletion method, owner and review date;
- add a real deletion fulfilment process that closes or de-identifies the account, addresses merchant/order/message copies, preserves only justified records, and records completion;
- maintain a processor/subprocessor register covering hosting/database, object storage, email, Google sign-in/Analytics, OpenAI, Cloudflare, PayToday and WhatsApp/Meta;
- record contract/DPA, processing location, data types, purpose, retention/deletion, access, subprocessor and breach terms for each;
- document access reviews, backup restoration/deletion limits and incident exercises;
- define a minimum customer age or a clear guardian flow rather than relying on “able to enter a valid transaction.”

The breach tool is useful but does not decide whether a regulator exists or must be notified. The incident lead must make a jurisdiction-specific legal assessment, preserve that decision, and use the 72-hour GDPR workflow only where GDPR applies.

### 4. Tax, invoices and corporate records — amber/red

NamRA states that VAT registration is mandatory once annual taxable turnover exceeds N$500,000. Official VAT material describes the 15% standard rate and required tax-invoice particulars.[10][11] NeuroCity needs an accountant-approved position on whether it is principal or agent for each supply, which entity's turnover includes the sale, who issues the merchant sale invoice, how platform fees are invoiced, and how refunds/credit notes alter tax records.

Before paid launch:

- confirm NeuroCity's income-tax and VAT registration status and each merchant's VAT status;
- store seller legal identity and VAT number where applicable;
- issue a compliant receipt/tax invoice for the correct supplier and a separate platform-fee invoice where required;
- prevent UI text from implying that every price contains VAT when the seller is not VAT registered;
- reconcile order, payment, refund, settlement and bank/provider records;
- set accountant-approved retention periods for invoices, statements, contracts and supporting records.

BIPA requires beneficial-ownership information and ongoing corporate filings; its guidance states that changes in beneficial ownership must be reported and annual duties/returns remain part of entity maintenance.[12][13] The founder should place current BIPA registration, beneficial-owner filing, annual-return/duty evidence and tax registrations in the compliance evidence folder.

### 5. Merchants, prohibited goods and marketplace liability — red for open publishing

The merchant application captures useful KYC data, documents, contact details, address and return policy, but accepting the public platform terms is not enough for live marketplace settlement. A lawyer-reviewed, versioned merchant agreement should cover at least:

- independent seller status and authority to bind the business;
- accurate listings, prices, stock, claims, licences, safety, warranties and recalls;
- prohibited/restricted products and evidence required for regulated categories;
- customer service, fulfilment, delivery, cancellations and minimum returns;
- fees, VAT/tax responsibility, settlement timing, reserves, adjustments and statements;
- refund, fraud and chargeback allocation and set-off rights;
- customer-data use limits, confidentiality, security and incident notice;
- IP licence, non-infringement warranty, complaints and takedowns;
- audit/cooperation rights, suspension, termination and treatment of open transactions;
- proportionate liability/indemnity clauses that do not exclude non-excludable rights;
- governing law, notices and dispute process.

Create and enforce a prohibited-products policy before self-service publishing. The first release should exclude medicines, weapons, tobacco/nicotine, alcohol, illegal/counterfeit/stolen items, unsafe/recalled products, financial/virtual-asset offers, adult goods and any category requiring a licence that NeuroCity has not specifically approved. Medicines and their advertisements are separately regulated, and second-hand dealing can trigger dealer/record obligations.[14][15]

Add a visible “report this listing/store” path, an internal review queue, evidence preservation, emergency delisting, recall/customer-notification steps, and appeal/reinstatement records.

### 6. Intellectual property and content — amber

Namibia's Copyright and Neighbouring Rights Protection Act protects photographs, artistic works, text and software and provides infringement remedies.[16] Current terms make uploaders warrant their rights, which is useful but insufficient as the catalogue grows.

Add a published IP/listing complaint route requiring claimant identity, work/right details, listing URL, basis and good-faith statement. Record notices, merchant responses, decisions, removal/reinstatement and repeat infringement. Operators should avoid copying competitor imagery or descriptions and should retain merchant upload/authorisation evidence.

### 7. WhatsApp, email and analytics — amber

Order and service updates should be separated from promotions. For each marketing channel, retain who consented, the wording/version, channel, purpose, source and time, plus withdrawal time. Every promotional email or WhatsApp flow should provide a simple opt-out and suppress future promotions promptly. Do not convert a phone number supplied for fulfilment into general marketing permission.

WhatsApp templates and automation must also comply with the current Meta/WhatsApp Business terms tied to the NeuroConnect business account. Record the approved template, category, opt-in source and webhook delivery/status evidence. Human product enquiries opened by the customer can use the customer-initiated conversation path; outbound campaigns require the applicable permission and approved template.

Google Analytics is correctly gated behind an explicit choice in the inspected implementation. Re-test consent on a clean browser, after rejection, after acceptance and after reopening Privacy choices; ensure the published notice and Play Data safety answer match production network behaviour.

### 8. Google Play and Android — amber

Google Play requires all apps to provide an accurate privacy policy and Data safety declaration. If an app permits account creation, it must provide both an in-app path and an external web resource for account deletion and must delete associated data rather than merely freeze the account, subject to clearly disclosed legitimate retention.[17][18][19]

The public deletion page and in-account request are present. Production submission still depends on proving completion of a request, accurately declaring every SDK/provider data flow, completing content rating and app-access instructions, keeping developer identity/contact details current, and using Play App Signing with protected key backups.[20]

Do not submit a Data safety form from the privacy notice alone. Capture production traffic and map each collected/shared data type to its purpose, optionality, encryption, retention and deletion behaviour, including the Capacitor shell, Google authentication/Analytics, OpenAI image processing, Cloudflare security, PayToday and Meta/WhatsApp.

### 9. PCI and payment security — amber

NeuroCity redirects to the PayToday-hosted service and does not claim to store card/wallet credentials. This can substantially reduce PCI DSS scope, but the applicable validation must be confirmed with PayToday/acquirer. PCI SSC guidance distinguishes fully outsourced redirects from embedded payment forms and still requires the merchant to satisfy the relevant eligibility criteria and protect its own environment.[21]

Keep payment pages free of card-entry fields, never log credentials or authorization headers, validate provider return/webhook authenticity, prevent replay and amount/order substitution, and obtain PayToday's PCI/attestation and incident-contact details.

## Release gates and evidence needed

### Gate A — provider and legal sign-off

- PayToday/Nedbank marketplace approval and signed commercial terms
- legal memo on payment perimeter and agency/principal model
- approved funds-flow, KYC/AML, refund, chargeback and settlement responsibilities
- exact NeuroCity entity and operator disclosures
- signed merchant agreement template

### Gate B — money movement acceptance test

Run provider-approved end-to-end cases and retain screenshots/references without secrets:

1. successful single-merchant payment;
2. successful multi-merchant payment if expressly approved;
3. abandoned/expired and failed payment;
4. duplicated/callback replay attempt;
5. whole and partial cancellation before settlement;
6. full and partial refund with provider/bank reference;
7. chargeback/dispute and settlement adjustment;
8. merchant payout/settlement and statement reconciliation;
9. mismatch exception and finance resolution;
10. customer receipt and merchant/tax records.

Every case must reconcile provider amount, internal checkout, merchant orders, allocation, fees, refund and final bank movement.

### Gate C — privacy and store acceptance test

- deletion request completes and user receives confirmation;
- justified retained records are separated/restricted and disclosed;
- export is complete enough to answer an access request;
- retention schedule is approved and assigned;
- processor register/contracts are complete;
- incident drill records detection, assessment, notices and failed-delivery follow-up;
- clean-device analytics and Selma image tests match the privacy notice;
- Play Data safety responses match observed production data flows.

### Gate D — consumer and merchant acceptance test

- seller and platform identities visible and consistent;
- final price, delivery, availability and return terms visible before payment;
- receipt/order record is downloadable or persistently accessible;
- listing report, complaint, cancellation and refund routes work;
- prohibited listing is stopped or quickly removed;
- merchant acceptance is tied to the exact agreement version;
- support owner and response targets are assigned.

## Recommended 30-day closure plan

**Days 1–3:** obtain PayToday written answers; engage a Namibian commercial/payment lawyer and accountant; provide exact operator identity and VAT status; freeze unapproved live settlement promises.

**Days 4–10:** finalise merchant agreement, prohibited-products policy, consumer return/refund standard, seller/operator disclosures, tax-invoice design, retention schedule and processor register.

**Days 8–18:** implement verified refunds and partial-refund records, reconciliation exceptions, deletion fulfilment, listing reports/takedowns and versioned merchant agreement acceptance.

**Days 15–24:** run payment/refund/settlement, checkout-disclosure, privacy, breach and restricted-listing acceptance tests; correct all P0/P1 failures.

**Days 22–30:** lawyer/accountant/provider sign-off; complete Play declarations from the data-flow register; run a small named-merchant pilot with daily finance/support review before wider launch.

## Questions for professional sign-off

1. Does the signed PayToday/Nedbank arrangement expressly permit collection for independent merchants, commission deduction and later settlement?
2. Under the Payment System Management Act and PSD-1, does the final arrangement require NeuroCity to be licensed/authorised, appointed as an agent, or otherwise registered?
3. Who is merchant of record, who supplies each product, and who bears refunds, chargebacks and customer claims?
4. Does the agreement require merchant KYC/beneficial-owner, sanctions or transaction-monitoring controls from NeuroCity?
5. Is NeuroCity principal or agent for VAT/income recognition, and who issues each tax invoice and credit note?
6. Which statutory/accounting retention periods apply to orders, invoices, payments, KYC, disputes and merchant contracts?
7. What minimum return/cancellation terms and disclosures should apply pending commencement of the ETA consumer chapter?
8. Does NeuroCity's intended geography trigger GDPR, POPIA or another foreign regime through targeted offering or monitoring?
9. Are the liability, indemnity, suspension and dispute clauses enforceable and proportionate under Namibian law?
10. Which goods/services should be prohibited outright and which require merchant licence verification?

## Evidence reviewed in the repository

- `app/terms/page.tsx` and `app/privacy/page.tsx`
- `app/account-deletion/page.tsx` and `app/api/account/privacy/route.ts`
- `app/components/CookieConsent.tsx`
- `app/api/admin/data-breaches/route.ts` and `app/components/AdminOperationsOverview.tsx`
- `app/api/applications/route.ts`, merchant application UI and application document upload routes
- `app/api/orders/route.ts`, payment/refund/issue routes and merchant/admin finance routes
- `lib/paytoday.ts`, `lib/settlements.ts`, `lib/admin-mfa.ts`, request/security controls
- database schema for users, merchants, applications, orders, payment transactions, allocations, privacy requests, incidents and audit events
- deployment, incident-response, Android-release, product-blueprint and prior technical-audit documents

This was a static code/document review. It did not inspect production databases, cloud access policies, executed vendor contracts, BIPA/NamRA filings, Play Console answers, PayToday account permissions, bank statements, insurance policies, staff procedures or production traffic. Those are evidence items, not assumptions.

## Primary sources

1. Bank of Namibia, [Payment System Management Act legal framework](https://www.bon.com.na/Bank/Payments-and-Settlements/Legal-Framework/Payment-System-Management-Act.aspx) and [Payment System Management Act 14 of 2023](https://www.bon.com.na/CMSTemplates/Bon/Files/bon.com.na/ce/cec38755-bb96-4bec-b2a7-8dab988a1037.pdf).
2. Bank of Namibia, [National Payment System determinations](https://www.bon.com.na/Bank/National-Payment-System/Legal-Framework/Determinations.aspx) and [licensing overview](https://www.bon.com.na/Publications/Annual-Reports/PART-A.aspx).
3. PayToday, [Custom Web Integrations](https://site.paytoday.com.na/help-center/custom-web-integrations/) and [Business feedback and support](https://site.paytoday.com.na/help-center/business-feedback-and-support/).
4. NamibLII, [Electronic Transactions Act 4 of 2019](https://namiblii.org/akn/na/act/2019/4/eng%402019-11-29).
5. NamibLII, [Trade Practices Act 76 of 1975](https://namiblii.org/akn/na/act/1976/76/eng%401976-06-09).
6. NamibLII, [Industrial Property Act 1 of 2012](https://namiblii.org/akn/na/act/2012/1/eng%402017-01-16).
7. Government of Namibia, [Government Accountability Report 2025/26](https://mfpe.gov.na/documents/76368/6934918/2025-26%2BGovernment%2BAccountability%2BReport%2Bof%2B21October%2B2025.pdf/cfa30fc6-c0db-9b4f-ff19-dc38e82882cc?download=true&t=1761301287580&version=1.0).
8. Parliament of Namibia, [Acts of Parliament](https://www.parliament.na/acts-of-parliament/) and [legislation tracking](https://laws.parliament.na/).
9. EUR-Lex, [General Data Protection Regulation, Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
10. Namibia Revenue Agency, [Integrated Tax Administration System — taxes](https://www.itas.namra.org.na/taxes).
11. Namibia Revenue Agency, [Value Added Tax Act 10 of 2000](https://www.namra.org.na/documents/cms/uploaded/valueadded-tax-act-10-of-2000-0d8c7ed7fc.pdf) and [VAT brochure](https://www.itas.namra.org.na/assets/documents/other-forms/Value_Added_Tax_Brochure.pdf).
12. BIPA, [Beneficial ownership](https://www.bipa.na/beneficial-ownership/) and [beneficial-ownership submission guide](https://www.bipa.na/wp-content/uploads/2025/03/BO-SUBMISSION-GUIDE-3.pdf).
13. BIPA, [Annual duty and returns](https://www.bipa.na/annual-duty/).
14. NamibLII, [Medicines and Related Substances Control Act 13 of 2003](https://namiblii.org/akn/na/act/2003/13/eng%402008-08-01).
15. NamibLII, [Second Hand Goods Act 23 of 1998](https://namiblii.org/akn/na/act/1998/23/eng%402005-12-28).
16. NamibLII, [Copyright and Neighbouring Rights Protection Act 6 of 1994](https://namiblii.org/akn/na/act/1994/6/eng%402017-01-16).
17. Google Play, [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-GB).
18. Google Play, [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN).
19. Google Play, [Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
20. Google Play, [Developer account protection](https://support.google.com/googleplay/android-developer/answer/2543765?hl=en) and [developer identity details](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en).
21. PCI Security Standards Council, [SAQ A e-commerce redirect clarification](https://www.pcisecuritystandards.org/faqs/1588/) and [PCI DSS v4.0 SAQ e-commerce methods](https://www.pcisecuritystandards.org/wp-content/uploads/2023/09/03.What-is-New-for-the-PCI-DSS-v4.0-SAQs.pdf).

