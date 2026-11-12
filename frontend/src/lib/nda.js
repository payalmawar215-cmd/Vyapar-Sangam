export const NDA_VERSION = "VS-NDA v1.0 (2026-10-11)";

/**
 * Builds the full purchase-request NDA document text for a specific
 * buyer / seller / business.
 */
export function buildNdaDocument({ buyerName, buyerEmail, sellerName, businessName, city, acceptedAtIso }) {
  return `MUTUAL NON-DISCLOSURE ACKNOWLEDGEMENT — PURCHASE REQUEST
Document version: ${NDA_VERSION}
Recorded on: ${acceptedAtIso}

1. PARTIES
Disclosing Party: ${sellerName || "The Seller"} — owner of the business described below, via the Vyapar Sangam platform.
Receiving Party: ${buyerName || "The Buyer"} (${buyerEmail || "registered buyer"}) — prospective purchaser.

2. SUBJECT BUSINESS
Business: ${businessName || "As listed on Vyapar Sangam"}${city ? `, located in ${city}` : ""}.
The Receiving Party is evaluating a possible acquisition of this business through a purchase request submitted on Vyapar Sangam.

3. CONFIDENTIAL INFORMATION
"Confidential Information" means all non-public business information disclosed in connection with this evaluation — financials, customer and supplier data, operations, pricing, contracts and strategy — in any form.

4. PURPOSE AND PERMITTED USE
Confidential Information may be used solely to evaluate the proposed acquisition. It may not be used to compete with, or solicit customers, suppliers or employees of, the business.

5. OBLIGATIONS
The Receiving Party will protect Confidential Information with reasonable care, use it only for the permitted purpose, and limit access to advisers who need it and are bound by similar confidentiality.

6. EXCEPTIONS
Obligations do not apply to information that is or becomes public without breach, was already lawfully known, is independently developed, or must be disclosed by law or court order (with prompt notice where lawful).

7. DURATION
These obligations apply for two (2) years from the date recorded above, and continue for any Confidential Information that remains a trade secret.

8. RETURN OR DELETION
Upon conclusion of discussions, or on written request, the Receiving Party will return or securely destroy all Confidential Information and confirm the same on request.

9. NO LICENCE; NO WARRANTY
No licence or other rights in the business or its information are granted. All Confidential Information is provided "as is", without warranty of accuracy or completeness.

10. GOVERNING LAW
This acknowledgement is governed by the laws of India.

11. DISPUTE RESOLUTION
Disputes will first be addressed in good-faith negotiation. Unresolved disputes will be referred to arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator; proceedings in English; the tribunal's award is final. Subject to the above, courts in India have jurisdiction.

12. SIGNATURE AND ACCEPTANCE RECORD
Accepted by: ${buyerName || "The Buyer"} (Buyer) and ${sellerName || "The Seller"} (Seller), via the Vyapar Sangam platform.
Acceptance recorded: ${acceptedAtIso}. Version: ${NDA_VERSION}. A PNG/JPG signature image supplied by the buyer is stored with this request and viewable only by the parties to this request and authorised platform administrators.

NOTE: This acknowledgement records acceptance of the NDA terms within the platform workflow. The signature image and checkbox are workflow records — they are not represented as a certified, legally-compliant electronic signature. The parties should execute definitive legal documentation for binding effect. This template is subject to legal review and may be updated; the version recorded above identifies the exact text accepted.`;
}
