import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/PublicPageShell";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — IntellectFlow" },
      { name: "description", content: "How IntellectFlow collects, uses, and protects your business and customer data." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <LegalPageShell eyebrow="Legal" title="Privacy Policy" updated="August 2026">
      <p>
        This Privacy Policy explains how IntellectFlow ("we", "us", "our") collects, uses, and protects information
        when you use our website and dashboard (the "Service").
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your name, email, and phone number when you sign up via Google login.</li>
        <li><strong>Business information</strong> — details you connect from your Google Business Profile (address, phone, website, rating, reviews) and anything you add yourself (description, business type).</li>
        <li><strong>Customer review data</strong> — reviews, ratings, and optional contact details submitted by your customers through your QR review page.</li>
        <li><strong>Usage data</strong> — QR scans, page visits, and feature usage within the dashboard, used to show you analytics.</li>
        <li><strong>Payment information</strong> — handled entirely by Razorpay; we do not store your card or UPI details on our servers.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To operate the Service — collecting reviews, generating AI replies, tracking competitors, and showing your dashboard analytics.</li>
        <li>To communicate with you — service updates, billing reminders, and support responses.</li>
        <li>To improve the Service — understanding which features are used and where things break.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Some features (AI reply suggestions, FAQ generation, SWOT analysis, GMB post drafts) send relevant text —
        such as review content and business details — to an AI model to generate suggestions. This content is used
        only to generate your output and is not used to train models on our behalf.
      </p>

      <h2>4. Sharing of information</h2>
      <p>We do not sell your data. We share information only with:</p>
      <ul>
        <li>Service providers who help us run the platform (hosting, database, payments, AI processing).</li>
        <li>Google, when you connect your Business Profile or when customers are redirected to leave a Google review.</li>
        <li>Law enforcement or regulators, only if legally required.</li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        We retain your account and business data for as long as your account is active. If you close your account,
        we delete or anonymize your data within a reasonable period, except where we're required to keep records for
        legal or accounting purposes.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can request a copy of your data, ask us to correct it, or request deletion at any time by writing to{" "}
        <a href="mailto:intellectflowteam@gmail.com">intellectflowteam@gmail.com</a>.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>We may update this Privacy Policy from time to time. We'll post the updated version here with a new "Last updated" date.</p>

      <h2>8. Contact us</h2>
      <p>Questions about this policy? Reach out via our <a href="/contact-us">Contact Us</a> page.</p>
    </LegalPageShell>
  );
}
