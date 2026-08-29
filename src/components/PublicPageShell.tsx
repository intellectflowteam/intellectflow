import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--paper)]/90 border-b border-black/5 py-2.5">
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 flex items-center justify-between gap-2">
        <Link to="/" className="hover:opacity-90 transition shrink-0">
          <BrandLogo size="md" />
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link to="/contact-us" className="inline-flex items-center rounded-full bg-white border border-black/15 shadow-2xs px-3 sm:px-4 py-1.5 text-xs font-mono font-bold hover:bg-[var(--paper)] transition whitespace-nowrap">
            Contact
          </Link>
          <Link to="/auth" className="inline-flex items-center rounded-full bg-[var(--ink)] text-white shadow-sm px-3.5 sm:px-5 py-1.5 text-xs font-mono font-bold hover:bg-black transition whitespace-nowrap">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-black/10 mt-8">
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-10 flex flex-col items-center gap-4 text-center">
        <Link to="/" className="hover:opacity-90 transition">
          <BrandLogo size="sm" />
        </Link>
        <div className="eyebrow text-zinc-400">© {new Date().getFullYear()} IntellectFlow.in — All rights reserved</div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-zinc-500">
          <Link to="/about-us" className="hover:text-[var(--ink)]">About Us</Link>
          <Link to="/contact-us" className="hover:text-[var(--ink)]">Contact Us</Link>
          <Link to="/privacy-policy" className="hover:text-[var(--ink)]">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-[var(--ink)]">Terms of Service</Link>
          <Link to="/refund-policy" className="hover:text-[var(--ink)]">Refund &amp; Cancellation</Link>
        </div>
      </div>
    </footer>
  );
}

/** Shared shell for legal/info pages — ticket-card container on paper background. */
export function LegalPageShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-[900px] w-full mx-auto px-4 md:px-6 py-10">
        <article className="ticket-card rounded-[24px] p-6 md:p-10 bg-white border border-black/10 shadow-sm">
          <header className="border-b border-black/10 pb-6 mb-8">
            <div className="eyebrow text-[var(--brass-deep)] mb-1 font-mono text-xs tracking-wider uppercase font-bold">{eyebrow}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[var(--ink)]">{title}</h1>
            {updated && <div className="text-xs text-zinc-400 font-mono mt-2">Last updated: {updated}</div>}
          </header>
          <div className="prose prose-stone max-w-none text-zinc-700 leading-relaxed text-sm md:text-base">
            {children}
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
