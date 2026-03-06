// src/pages/TermsPage.tsx
// NXXT Futures — Terms of Service & Referral Program Agreement
// Accessible at /terms (public, no auth required)

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function TermsPage() {
  const navigate = useNavigate();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-8">
      <h2 className="text-base font-bold text-white mb-3 pb-2 border-b border-[#1E2128]">{title}</h2>
      <div className="text-sm text-gray-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#0A0B0D]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0B0D]/95 backdrop-blur-xl border-b border-[#1E2128]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1 flex items-center gap-2 justify-center">
            <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center">
              <span className="font-bold text-amber-400 text-[10px]">NF</span>
            </div>
            <span className="font-bold text-white text-sm">NXXT Futures</span>
          </div>
          <div className="w-16" /> {/* spacer */}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Title block */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
              <p className="text-xs text-gray-500">Referral Program Agreement & General Terms</p>
            </div>
          </div>
          <div className="p-4 bg-[#111318] border border-[#1E2128] rounded-xl text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-300">Effective Date:</strong> March 2026 &nbsp;·&nbsp;
            <strong className="text-gray-300">Governing Law:</strong> State of New York, USA &nbsp;·&nbsp;
            <strong className="text-gray-300">Contact:</strong> iconmigs@gmail.com
          </div>
        </div>

        {/* ── SECTION 1 ── */}
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using the NXXT Futures platform, website, or any of its services — including the Referral Program — you
            ("User," "Referrer," "you") agree to be legally bound by these Terms of Service ("Terms"). If you do not agree to
            all of these Terms, you must not use the platform or participate in the Referral Program.
          </p>
          <p>
            NXXT Futures ("Company," "we," "us," "our") reserves the right to update these Terms at any time without prior notice.
            Continued use of the platform after any such update constitutes your acceptance of the revised Terms. The most current
            version is always available at nxxtfutures.com/terms.
          </p>
        </Section>

        {/* ── SECTION 2 ── */}
        <Section title="2. Referral Program Eligibility">
          <p>To participate in the NXXT Futures Referral Program and receive commission payments, you must:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Be at least <strong className="text-white">18 years of age</strong>, or the minimum legal age required to enter binding contracts and receive payments in your country or jurisdiction — whichever is higher.</li>
            <li>Have a valid, active NXXT Futures account in good standing.</li>
            <li>Have provided accurate and current payout information via your account settings.</li>
            <li>Have affirmatively agreed to these Terms and completed the age verification acknowledgment in your Referral dashboard.</li>
            <li>Not be prohibited from receiving payments under applicable law, including but not limited to sanctions lists or other legal restrictions in your country.</li>
          </ul>
          <p>
            By self-certifying your age during Referral setup, you represent that you meet the eligibility requirements above.
            NXXT Futures reserves the right to request verification at any time and to deny, suspend, or terminate your participation
            if eligibility cannot be confirmed. Fraudulent age certification may result in immediate account termination and
            forfeiture of all pending commissions.
          </p>
        </Section>

        {/* ── SECTION 3 ── */}
        <Section title="3. Referral Program Mechanics">
          <p>
            The NXXT Futures Referral Program allows eligible users to earn commissions by referring new users who subsequently
            subscribe to an Elite membership.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Each eligible user is assigned a unique referral code and may create a custom referral slug.</li>
            <li>A referral is tracked when a new user registers via your unique referral link.</li>
            <li>A commission is triggered only when the referred user successfully completes a paid Elite subscription.</li>
            <li>Commissions continue monthly for as long as the referred user remains an active, paying Elite subscriber.</li>
            <li>Self-referrals are prohibited. Referring your own accounts or accounts you control is grounds for immediate disqualification and forfeiture.</li>
            <li>NXXT Futures reserves the right to modify, suspend, or terminate the Referral Program at any time with or without notice.</li>
          </ul>
        </Section>

        {/* ── SECTION 4 ── */}
        <Section title="4. Commission Structure">
          <p>
            The current referral commission rate is <strong className="text-white">$25.00 USD per month</strong> for each
            referred user who remains an active Elite subscriber. This rate is subject to change at NXXT Futures' sole discretion.
            Any rate changes will apply to new commissions only; commissions already due at the time of the change will be
            honored at the rate in effect when they were generated.
          </p>
          <p>
            Commissions are generated on a per-billing-cycle basis, corresponding to each month the referred user's Elite
            subscription payment is successfully received by NXXT Futures. A commission is not generated for any month in which
            the referred user's subscription is lapsed, cancelled, refunded, charged back, or otherwise non-active.
          </p>
        </Section>

        {/* ── SECTION 5 ── */}
        <Section title="5. Payout Schedule & Transfer Fees">
          <p>
            Commissions are processed and paid out <strong className="text-white">30 days after the referred user's qualifying
            payment is received</strong> by NXXT Futures. This waiting period exists to account for potential refund windows,
            payment disputes, and processing delays.
          </p>
          <p>
            All payouts are subject to deduction of <strong className="text-white">applicable transfer fees</strong> charged by
            the selected payment processor or network. These fees vary by method and are outside NXXT Futures' control.
            Common examples include but are not limited to: PayPal transaction fees, Wise transfer fees, blockchain gas fees,
            or bank wire fees. NXXT Futures does not cover, reimburse, or guarantee any specific net payout amount after fees.
          </p>
          <p>
            NXXT Futures pays out commissions manually. You will be contacted via your registered account email when a payout
            is processed. You are responsible for ensuring your account email is accurate and accessible.
          </p>
        </Section>

        {/* ── SECTION 6 ── */}
        <Section title="6. Claim Window & Forfeiture Policy">
          <p>
            Commissions must be acknowledged and claimable within <strong className="text-white">90 days from the payout date</strong>
            (which is 120 days from the date the commission was created). This means:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Day 0: Commission created (referred user's payment received).</li>
            <li>Day 30: Commission becomes due for payout.</li>
            <li>Day 120: Commission is permanently forfeited if unpaid and unclaimed.</li>
          </ul>
          <p>
            <strong className="text-red-400">Any commission that remains unpaid after 120 days from its creation date is
            automatically and permanently forfeited.</strong> No extensions, exceptions, or reinstatements will be granted
            under any circumstances, regardless of reason.
          </p>
          <p>
            The primary reasons commissions go unclaimed include: outdated or missing payout information, failure to respond
            to payout notifications, or the referrer's account being inactive or deleted. It is your sole responsibility to
            maintain current, accurate, and reachable contact and payment information.
          </p>
        </Section>

        {/* ── SECTION 7 ── */}
        <Section title="7. Payout Information Accuracy & Lost Payments">
          <p>
            You are <strong className="text-white">solely and exclusively responsible</strong> for providing accurate, complete,
            and up-to-date payout information in your account settings. This includes, but is not limited to, email addresses
            for PayPal or Wise, wallet addresses for cryptocurrency, and banking details for wire transfers.
          </p>
          <p>
            <strong className="text-red-400">NXXT Futures is not responsible for, and will not reimburse or reissue payments
            for:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Payments sent to an incorrect address, account, or wallet provided by you.</li>
            <li>Payments lost due to errors, typos, or outdated information in your payout settings.</li>
            <li>Delays or failures caused by third-party payment processors.</li>
            <li>Cryptocurrency transactions that are irreversible once broadcast to the network.</li>
            <li>Funds sent to a closed, frozen, or inaccessible account.</li>
          </ul>
          <p>
            Once a payment has been dispatched to the payout details you have provided, NXXT Futures' obligation is fulfilled
            regardless of whether you actually receive the funds. You release NXXT Futures from all liability related to
            payment errors arising from inaccurate information provided by you.
          </p>
        </Section>

        {/* ── SECTION 8 ── */}
        <Section title="8. No Refund Policy — Memberships">
          <p>
            <strong className="text-red-400">ALL MEMBERSHIP FEES, SUBSCRIPTION CHARGES, AND PAYMENTS MADE TO NXXT FUTURES
            ARE STRICTLY NON-REFUNDABLE.</strong> This applies without exception to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Elite subscription fees, whether monthly or for any other billing period.</li>
            <li>Upgrade fees from Free to Elite tier.</li>
            <li>Any promotional or discounted subscription rates.</li>
            <li>Partial months or unused portions of a subscription period.</li>
          </ul>
          <p>
            By completing a purchase on NXXT Futures, you acknowledge and agree that no refunds will be issued under any
            circumstances, including but not limited to: dissatisfaction with the service, technical issues, account
            cancellation, failure to use the service, or any other reason. Chargebacks or payment disputes initiated in
            violation of this policy may result in immediate, permanent account termination and forfeiture of all pending
            commissions.
          </p>
        </Section>

        {/* ── SECTION 9 ── */}
        <Section title="9. Tax Obligations">
          <p>
            You are solely responsible for reporting and paying all taxes applicable to any commissions or payments you receive
            from NXXT Futures, in accordance with the laws of your jurisdiction. NXXT Futures does not withhold taxes from
            commission payments. We may be required by law to collect tax identification information or to report payments
            above applicable thresholds to relevant tax authorities. By participating in the Referral Program, you agree to
            provide any tax information reasonably requested by NXXT Futures.
          </p>
        </Section>

        {/* ── SECTION 10 ── */}
        <Section title="10. Prohibited Activities">
          <p>You agree not to engage in any of the following:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Using false, misleading, deceptive, or spam-based methods to generate referrals.</li>
            <li>Impersonating NXXT Futures or making unauthorized representations about the platform.</li>
            <li>Manipulating or attempting to manipulate the referral tracking system.</li>
            <li>Creating fake accounts to generate fraudulent referral commissions.</li>
            <li>Using paid advertising that references NXXT Futures without written approval.</li>
          </ul>
          <p>
            Violations may result in immediate disqualification, account termination, and forfeiture of all outstanding
            commissions. NXXT Futures reserves the right to pursue legal remedies for fraudulent activity.
          </p>
        </Section>

        {/* ── SECTION 11 ── */}
        <Section title="11. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NXXT FUTURES, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS
            SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOST PROFITS, LOST DATA, LOSS OF GOODWILL, OR SERVICE INTERRUPTION, ARISING OUT OF OR IN CONNECTION
            WITH YOUR USE OF THE REFERRAL PROGRAM OR THESE TERMS.
          </p>
          <p>
            IN NO EVENT SHALL NXXT FUTURES' TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE REFERRAL
            PROGRAM EXCEED THE TOTAL AMOUNT OF COMMISSIONS ACTUALLY PAID TO YOU IN THE THREE (3) MONTHS PRECEDING THE CLAIM.
          </p>
        </Section>

        {/* ── SECTION 12 ── */}
        <Section title="12. Program Modification & Termination">
          <p>
            NXXT Futures reserves the right, at its sole discretion, to modify, suspend, or permanently terminate the Referral
            Program at any time, with or without notice. In the event of program termination, all commissions already due
            (past the 30-day waiting period) at the time of termination will be honored, subject to the standard forfeiture
            policy. Commissions not yet due at the time of termination may be forfeited at NXXT Futures' discretion.
          </p>
        </Section>

        {/* ── SECTION 13 ── */}
        <Section title="13. Governing Law & Dispute Resolution">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the <strong className="text-white">State
            of New York, United States of America</strong>, without regard to its conflict of law provisions.
          </p>
          <p>
            Any dispute, claim, or controversy arising out of or relating to these Terms or the Referral Program shall be
            resolved exclusively in the state or federal courts located in <strong className="text-white">New York County, New
            York</strong>. By agreeing to these Terms, you consent to personal jurisdiction in those courts and waive any
            objection to venue therein.
          </p>
        </Section>

        {/* ── SECTION 14 ── */}
        <Section title="14. Severability">
          <p>
            If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision shall
            be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in
            full force and effect.
          </p>
        </Section>

        {/* ── SECTION 15 ── */}
        <Section title="15. Entire Agreement">
          <p>
            These Terms constitute the entire agreement between you and NXXT Futures with respect to the Referral Program and
            supersede all prior or contemporaneous agreements, representations, warranties, and understandings. Any waiver by
            NXXT Futures of a breach of these Terms shall not constitute a waiver of any subsequent breach.
          </p>
        </Section>

        {/* ── SECTION 16 ── */}
        <Section title="16. Contact Information">
          <p>
            For questions about these Terms or the Referral Program, please contact:
          </p>
          <div className="p-3 bg-[#111318] border border-[#1E2128] rounded-xl">
            <p className="text-gray-300 font-medium">NXXT Futures</p>
            <p>New York City, New York, USA</p>
            <p>Email: <a href="mailto:iconmigs@gmail.com" className="text-amber-400 underline">iconmigs@gmail.com</a></p>
            <p>Website: <a href="https://www.nxxtfutures.com" className="text-amber-400 underline">nxxtfutures.com</a></p>
          </div>
        </Section>

        {/* Footer note */}
        <div className="mt-10 pt-6 border-t border-[#1E2128] text-center text-xs text-gray-700">
          © 2026 NXXT Futures. All rights reserved. · <a href="/terms" className="hover:text-gray-500">Terms of Service</a>
        </div>
      </main>
    </div>
  );
}
