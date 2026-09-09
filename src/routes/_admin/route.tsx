import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, X, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/admin-login" });

    const [roleRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle(),
    ]);
    const isAdmin = roleRes.data?.role === "admin" || profRes.data?.is_admin === true;
    // Not an admin — this panel is admin-only. Send a signed-in non-admin
    // back to their own merchant dashboard; an anonymous visitor to login.
    if (!isAdmin) throw redirect({ to: "/dashboard" });

    return { user: u.user };
  },
  component: AdminShell,
});

const nav = [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }];

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin-login", replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar — deliberately distinct dark "control panel" identity, never
          shares visual language with the merchant panel so it's unmistakably
          a different, admin-only surface. */}
      <aside
        className={[
          "fixed md:sticky md:top-0 md:h-screen top-0 left-0 z-40 h-full w-64 bg-slate-900 border-r border-white/10 transition-transform",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-900" />
            </span>
            <div>
              <div className="font-black text-white text-sm leading-tight tracking-tight">IntellectFlow</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Admin Panel</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden p-1 text-white/60"><X className="w-5 h-5" /></button>
        </div>

        <nav className="p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition",
                  active ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-white/10">
          <div className="px-2 text-[11px] text-slate-400 truncate font-mono mb-2">{email}</div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 bg-slate-100 min-h-screen">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-6 gap-3">
          <button onClick={() => setOpen(true)} className="md:hidden p-1 text-slate-600"><Menu className="w-5 h-5" /></button>
          <div>
            <div className="text-sm font-black text-slate-900">Admin Control Panel</div>
            <div className="text-[11px] text-slate-400 font-medium">Platform-wide management — visible only to admins</div>
          </div>
        </header>
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
