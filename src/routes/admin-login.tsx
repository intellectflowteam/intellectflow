import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login — IntellectFlow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      const user = data.user;
      if (!user) throw new Error("Sign-in failed");

      const [roleRes, profRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
      ]);
      const isAdmin = roleRes.data?.role === "admin" || profRes.data?.is_admin === true;

      if (!isAdmin) {
        // Correct credentials but not an admin account — sign out
        // immediately rather than leaving an authenticated non-admin
        // session sitting on the admin login page.
        await supabase.auth.signOut();
        throw new Error("This account does not have admin access.");
      }

      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center mb-3">
            <ShieldCheck className="w-7 h-7 text-slate-900" />
          </span>
          <h1 className="text-white font-black text-xl tracking-tight">IntellectFlow Admin</h1>
          <p className="text-slate-400 text-xs mt-1">Restricted access — platform administrators only</p>
        </div>

        <form onSubmit={submit} className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full h-11 rounded-lg bg-slate-800 border border-white/10 px-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="admin@intellectflow.in"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg bg-slate-800 border border-white/10 px-3 pr-10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 font-black text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in to Admin Panel
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-5">
          Business owner? Use the <a href="/auth" className="text-amber-400 hover:underline">regular login</a> instead.
        </p>
      </div>
    </div>
  );
}
