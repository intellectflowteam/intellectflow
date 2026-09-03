import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, MessageSquare, Sparkles, TrendingUp, MessageCircle, Users, Image, QrCode, Settings, CreditCard, Shield, LogOut, Menu, X, HelpCircle, Search } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  ),
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/ai-reply", label: "AI Reply", icon: Sparkles },
  { to: "/gmb", label: "GMB Posts", icon: TrendingUp },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/competitors", label: "Competitors", icon: Users },
  { to: "/faq", label: "FAQs", icon: HelpCircle },
  { to: "/standees", label: "Standees", icon: Image },
  { to: "/qr", label: "QR & Page", icon: QrCode },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/billing", label: "Billing", icon: CreditCard },
];

function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    ]).then(([r, p]) => {
      setIsAdmin(r.data?.role === "admin" || p.data?.is_admin === true);
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#fdf6ef" }}>
      {/* Sidebar */}
      <aside className={[
        "fixed md:sticky md:top-0 md:h-screen top-0 left-0 z-40 h-full w-64 bg-white border-r border-black/10 transition-transform",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}>
        <div className="p-4 flex items-center justify-between border-b border-black/5">
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="hover:opacity-90 transition">
            <BrandLogo size="sm" />
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-64px)]">
          {/* Admin Priority Console */}
          {isAdmin && (
            <div className="mb-3 pb-3 border-b border-black/5 space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--brass-deep)]">
                MASTER ADMIN
              </div>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-mono font-bold transition shadow-2xs",
                  pathname === "/admin"
                    ? "bg-[var(--ink)] text-white"
                    : "bg-amber-500/10 text-amber-900 border border-amber-500/20 hover:bg-amber-500/20",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--brass)]" /> Admin CRM
                </span>
                <span className="text-[10px] bg-[var(--brass)] text-[var(--ink)] font-extrabold px-1.5 py-0.5 rounded">
                  CONSOLE
                </span>
              </Link>
            </div>
          )}

          {/* Shop Owner Navigation */}
          {isAdmin && (
            <div className="px-3 pt-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              SHOP OWNER VIEW
            </div>
          )}

          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition",
                  active ? "bg-black text-white" : "text-zinc-700 hover:bg-zinc-100",
                ].join(" ")}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}

          <div className="border-t border-black/5 mt-3 pt-3 px-1">
            <div className="text-[11px] text-zinc-500 px-2 truncate font-mono">{user?.email}</div>
            {isAdmin && (
              <div className="px-2 mt-0.5">
                <span className="inline-block text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Admin Active
                </span>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-black/5 h-14 flex items-center px-4 gap-3">
          <button onClick={() => setOpen(true)} className="md:hidden p-1"><Menu className="w-5 h-5" /></button>
          <div className="text-sm font-semibold text-zinc-500">IntellectFlow Console</div>
        </header>
        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
