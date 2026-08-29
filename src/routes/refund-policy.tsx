import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/PublicPageShell";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — IntellectFlow" },
      { name: "description", content: "How free trials, cancellations, and refunds work on IntellectFlow." },
    ],
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <LegalPageShell eyebrow="Legal" title="Refund & Cancellation Policy" updated="August 2026">
      <h2>Free trial</h2>
      <p>
        Every new account starts with a 3-day free trial with full access to your plan's features. No payment is
        collected during the trial, and no card is required to sign up.
      </p>

      <h2>Cancellation</h2>
      <p>
        You can cancel your subscription at any time from <strong>Dashboard → Billing</strong>. There is no lock-in
        period and no cancellation fee. When you cancel:
      </p>
      <ul>
        <li>You keep access until the end of your current billing cycle.</li>
        <li>You will not be charged again after that cycle ends.</li>
        <li>Your review data and dashboard remain accessible in a read-only state for a limited period after cancellation, in case you want to reactivate.</li>
      </ul>

      <h2>Refunds</h2>
      <p>Because plans are billed monthly with no long-term contract, we generally do not offer pro-rated refunds for partial months. Exceptions we do consider:</p>
      <ul>
        <li><strong>Duplicate or failed charge</strong> — full refund if you were charged in error or charged more than once for the same cycle.</li>
        <li><strong>Service issue on our end</strong> — if a core feature you're paying for was broken or unavailable for a significant part of your billing cycle, contact us and we'll review a partial refund.</li>
        <li><strong>Charged after cancellation</strong> — if you cancelled before renewal but were still charged, this will be refunded in full.</li>
      </ul>
      <p>
        To request a refund, email <a href="mailto:intellectflowteam@gmail.com">intellectflowteam@gmail.com</a> with
        your registered email and the reason. We aim to respond within 2 business days and, where approved, process
        refunds to your original payment method via Razorpay within 5–7 business days.
      </p>

      <h2>Standee orders</h2>
      <p>
        The printed QR standee included with your plan is provided at no extra cost. If a standee arrives damaged or
        is lost in transit, contact us for a free replacement rather than a refund.
      </p>

      <h2>Questions</h2>
      <p>Reach out via our <a href="/contact-us">Contact Us</a> page for anything not covered here.</p>
    </LegalPageShell>
  );
}
