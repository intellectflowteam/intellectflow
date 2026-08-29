import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/PublicPageShell";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — IntellectFlow" },
      { name: "description", content: "The terms that govern your use of IntellectFlow." },
    ],
  }),
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <LegalPageShell eyebrow="Legal" title="Terms of Service" updated="August 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of IntellectFlow (the "Service"). By creating
        an account, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        IntellectFlow provides tools to collect Google reviews via QR code, generate AI-assisted replies and
        content, track local competitors, and manage related business operations. Some features rely on third-party
        services (Google, Razorpay, WhatsApp) and are subject to those providers' availability.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate business information when connecting your Google Business Profile.</li>
        <li>You are responsible for activity that happens under your account.</li>
        <li>One account is intended for one business; contact us if you need multiple locations under one account.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to solicit fake, incentivized, or fraudulent reviews in violation of Google's policies.</li>
        <li>Attempt to circumvent, scrape, or reverse-engineer any part of the Service.</li>
        <li>Use AI-generated content in a way that is deceptive or misrepresents your business.</li>
        <li>Use the Service for any unlawful purpose.</li>
      </ul>
      <p>
        Review gating in IntellectFlow is designed to route customers to their honest, appropriate feedback channel
        (public or private) based on the rating they already chose — it does not alter or fabricate review content.
      </p>

      <h2>4. Subscriptions and billing</h2>
      <p>
        Paid plans are billed monthly via Razorpay. Your trial period, plan price, and included features are shown
        on our <a href="/#pricing">pricing page</a> and inside your dashboard. See our{" "}
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a> for details on cancelling or requesting a refund.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        IntellectFlow and its original content, features, and branding are owned by us. Your business data, reviews,
        and content you create remain yours — we only use them to provide the Service to you.
      </p>

      <h2>6. Service availability</h2>
      <p>
        We aim for high availability but do not guarantee the Service will be uninterrupted or error-free,
        particularly where it depends on third-party APIs (e.g. Google Places, WhatsApp).
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        IntellectFlow is provided "as is." To the maximum extent permitted by law, we are not liable for indirect,
        incidental, or consequential damages arising from your use of the Service, including changes in your Google
        rating or ranking that result from factors outside our control.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may cancel your account at any time from Settings or Billing. We may suspend or terminate accounts that
        violate these Terms.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Continued use of the Service after changes means you accept the updated Terms.</p>

      <h2>10. Contact</h2>
      <p>Questions about these Terms? Reach out via our <a href="/contact-us">Contact Us</a> page.</p>
    </LegalPageShell>
  );
}
