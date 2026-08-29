import { createFileRoute } from "@tanstack/react-router";
import { LegalPageShell } from "@/components/PublicPageShell";

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: "About Us — IntellectFlow" },
      { name: "description", content: "IntellectFlow helps small Indian businesses turn every customer into a 5-star Google review, automatically." },
    ],
  }),
  component: AboutUs,
});

function AboutUs() {
  return (
    <LegalPageShell eyebrow="Our story" title="About IntellectFlow">
      <h2>Why we started</h2>
      <p>
        Most small businesses in India — tea stalls, salons, clinics, kirana stores — get asked for Google reviews
        every day, but rarely get them. Customers forget, don't know where to search, or simply walk away. Meanwhile,
        the one bad experience someone does bother to write about ends up on Google forever.
      </p>
      <p>
        IntellectFlow was built to fix that gap with a single QR code: happy customers are guided straight to Google
        in a few taps, while unhappy ones get a private channel to tell you directly — so you can fix it before it
        becomes a public 1-star review.
      </p>
      <h2>What we believe</h2>
      <p>
        Every business deserves the same review-management tools that large chains pay agencies lakhs of rupees for
        — without the agency, the contract, or the price tag. We built IntellectFlow to bring AI-powered reply
        writing, local SEO tracking, and competitor intelligence to a shop owner for the price of a few cups of chai
        a day.
      </p>
      <h2>Where we operate</h2>
      <p>
        IntellectFlow is built and run in India, for Indian small businesses — with support for Hindi, Gujarati and
        English, and pricing designed for local budgets, not global SaaS budgets.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions, feedback, or partnership ideas? Visit our <a href="/contact-us">Contact Us</a> page.
      </p>
    </LegalPageShell>
  );
}
