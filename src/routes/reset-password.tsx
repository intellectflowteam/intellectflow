import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — IntellectFlow" },
      { name: "description", content: "Set a new password for your IntellectFlow email login." },
      { property: "og:title", content: "Reset password — IntellectFlow" },
      { property: "og:description", content: "Set a new password for your IntellectFlow email login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const isRecoveryLink = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    return hash.get("type") === "recovery" || query.get("type") === "recovery";
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) || isRecoveryLink);
    });
  }, [isRecoveryLink]);

  const messageFor = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes("weak") || msg.includes("pwned") || msg.includes("easy to guess")) {
      return "This password is blocked for security. Use a stronger password with 10+ characters, numbers and symbols.";
    }
    return message;
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set successfully. Please sign in.");
      await supabase.auth.signOut();
      nav({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? messageFor(err.message) : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10" style={{ backgroundColor: "#fdf6ef" }}>
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-black/10 shadow-sm p-6 md:p-7">
        <h1 className="font-black text-2xl text-center">Set new password</h1>
        <p className="text-center text-sm text-zinc-500 mt-1">
          Use a strong password that has not been used elsewhere.
        </p>

        {!ready && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Open the password reset link from your email, or request a new link from the login page.
          </div>
        )}

        <form onSubmit={updatePassword} className="mt-6 space-y-3">
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-black"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full h-11 rounded-lg bg-black text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}