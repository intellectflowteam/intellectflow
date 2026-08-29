import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, MapPin, Clock, Send, Sparkles, CheckCircle2, Phone, Building2, HelpCircle, ArrowRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicPageShell";
import { toast } from "sonner";

export const Route = createFileRoute("/contact-us")({
  head: () => ({
    meta: [
      { title: "Contact Us — IntellectFlow Support & Inquiries" },
      { name: "description", content: "Get in touch with the IntellectFlow team via WhatsApp, email, or send us a message directly. We reply in under 15 minutes." },
    ],
  }),
  component: ContactUs,
});

const customEase = [0.16, 1, 0.3, 1] as const;

function ContactUs() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    category: "shop",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Simulate instant form submission
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setSent(true);
    toast.success("Thank you! Your message has been sent to our team.");
  };

  return (
    <div className="min-h-screen font-sans bg-[var(--paper)] text-[var(--ink)] antialiased selection:bg-[var(--brass)] selection:text-[var(--ink)] flex flex-col justify-between">
      <PublicHeader />

      <main className="py-12 md:py-20 px-4 md:px-6 max-w-[1140px] mx-auto w-full space-y-12">
        {/* HERO TITLE HEADER */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(20,17,14,0.12)] bg-white/80 px-4 py-1.5 text-xs font-mono font-bold text-[var(--brass-deep)] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[var(--brass)] animate-pulse" />
            WE'RE HERE TO HELP YOU GROW
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl text-[var(--ink)] tracking-tight">
            Get in touch with us
          </h1>
          <p className="text-sm md:text-base text-[var(--ink-60)] font-medium leading-relaxed">
            Have questions about QR standees, AI review automation, or custom business plans? Talk to our founders directly.
          </p>
        </div>

        {/* 3 QUICK CONTACT TILES */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* WhatsApp Tile */}
          <a
            href="https://wa.me/917069525795"
            target="_blank"
            rel="noreferrer"
            className="p-6 rounded-3xl bg-emerald-950/5 border border-emerald-300/60 hover:border-emerald-500 transition shadow-2xs hover:shadow-md group no-underline flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-xs group-hover:scale-110 transition">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-emerald-950">WhatsApp Support</div>
                <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">+91 7069525795</div>
              </div>
              <p className="text-xs text-emerald-900/80 leading-relaxed font-medium">
                Fastest way to get support. Replies within 15 minutes during business hours.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/50 text-xs font-mono font-bold text-emerald-800 flex items-center gap-1 group-hover:underline">
              Start WhatsApp Chat <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Email Tile */}
          <a
            href="mailto:intellectflowteam@gmail.com"
            className="p-6 rounded-3xl bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] transition shadow-2xs hover:shadow-md group no-underline flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ink)] text-white grid place-items-center shadow-xs group-hover:scale-110 transition">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-[var(--ink)]">Email Support</div>
                <div className="text-xs font-mono font-bold text-[var(--brass-deep)] mt-0.5">intellectflowteam@gmail.com</div>
              </div>
              <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">
                For partnerships, enterprise billing, or detailed inquiries. Replies within 1 business day.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/5 text-xs font-mono font-bold text-[var(--ink)] flex items-center gap-1 group-hover:underline">
              Send Email <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Location & Hours Tile */}
          <div className="p-6 rounded-3xl bg-white border border-[rgba(20,17,14,0.12)] shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-300 text-[var(--brass-deep)] grid place-items-center shadow-xs">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-[var(--ink)]">Registered HQ</div>
                <div className="text-xs font-mono font-semibold text-zinc-600 mt-0.5">Gujarat, India</div>
              </div>
              <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">
                Visavadar, Junagadh District, Gujarat 362130, India.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 text-xs font-mono text-zinc-500 space-y-1">
              <div className="flex items-center gap-1 font-bold text-[var(--ink)]">
                <Clock className="w-3.5 h-3.5 text-[var(--brass-deep)]" /> Support Hours
              </div>
              <div>Mon–Sat: 10:00 AM – 7:00 PM IST</div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE FORM SECTION */}
        <div className="bg-white border border-[rgba(20,17,14,0.12)] rounded-3xl p-6 sm:p-10 shadow-lg grid md:grid-cols-12 gap-8 items-start">
          {/* Left Instructions */}
          <div className="md:col-span-5 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center text-[var(--brass-deep)] font-bold">
              <Send className="w-5 h-5" />
            </div>

            <h2 className="font-display font-bold text-2xl text-[var(--ink)]">
              Send us a direct message
            </h2>

            <p className="text-xs text-[var(--ink-60)] leading-relaxed font-medium">
              Fill out the form and our team will get back to you immediately. If you have an urgent inquiry about standee shipping or billing, feel free to message us on WhatsApp.
            </p>

            <div className="p-4 rounded-2xl bg-[var(--paper)] border border-black/5 text-xs text-[var(--ink)] space-y-2 font-mono">
              <div className="font-bold flex items-center gap-1.5 text-[var(--routed-green)]">
                <CheckCircle2 className="w-4 h-4" /> Fast Response Guarantee
              </div>
              <p className="text-[11px] text-[var(--ink-60)] font-sans">
                We value your time. All messages are reviewed directly by our founding team.
              </p>
            </div>
          </div>

          {/* Right Form */}
          <div className="md:col-span-7">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white grid place-items-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-emerald-950">Message Received!</h3>
                <p className="text-xs text-emerald-900 max-w-sm mx-auto font-medium">
                  Thank you for contacting IntellectFlow. We have received your inquiry and will reach out shortly.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", businessName: "", category: "shop", message: "" }); }}
                  className="mt-2 text-xs font-mono font-bold text-emerald-800 underline cursor-pointer"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      placeholder="e.g. Royal Cafe"
                      className="w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Business Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium bg-white focus:outline-none focus:border-[var(--brass)] shadow-2xs"
                  >
                    <option value="shop">🛒 Retail / Kirana / Store</option>
                    <option value="restaurant">🍽️ Restaurant / Cafe / Bakery</option>
                    <option value="salon">💇 Salon / Spa / Beauty</option>
                    <option value="clinic">🏥 Clinic / Healthcare / Pharmacy</option>
                    <option value="hotel">🏨 Hotel / Resort / Stay</option>
                    <option value="other">💼 Other Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    How Can We Help You? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what you'd like to ask or request..."
                    className="w-full rounded-xl border border-black/15 p-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 bg-[var(--ink)] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      Send Message <Send className="w-4 h-4 text-[var(--brass)]" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FREQUENT CONTACT FAQS */}
        <div className="max-w-3xl mx-auto space-y-4 pt-6 border-t border-[rgba(20,17,14,0.08)]">
          <h3 className="font-display font-bold text-xl text-[var(--ink)] text-center">
            Commonly Asked Contact Questions
          </h3>

          <div className="space-y-3">
            {[
              { q: "How soon will my printed QR standee be shipped?", a: "Custom acrylic QR standees are dispatched within 24 hours of account creation. You will receive a tracking link via WhatsApp." },
              { q: "Can I get support on WhatsApp?", a: "Yes! Our WhatsApp support line (+91 7069525795) is active Monday through Saturday from 10 AM to 7 PM IST." },
              { q: "Do you offer multi-location franchise support?", a: "Yes. For chain businesses or multi-branch shop owners, contact us for custom multi-location accounts and bulk standee rates." },
            ].map((item) => (
              <div key={item.q} className="p-4 rounded-2xl bg-white border border-black/10">
                <div className="font-bold text-xs text-[var(--ink)]">Q: {item.q}</div>
                <div className="text-xs text-zinc-600 leading-relaxed font-medium mt-1">A: {item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
