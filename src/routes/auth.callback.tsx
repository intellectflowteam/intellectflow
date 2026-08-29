import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  const nav = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        // If profile has no business yet, go onboarding
        const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", data.session.user.id).limit(1);
        nav({ to: biz && biz.length > 0 ? "/dashboard" : "/onboarding" });
      } else {
        setTimeout(check, 300);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [nav]);

  return (
    <div className="min-h-screen grid place-items-center" style={{ backgroundColor: "#fdf6ef" }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-black/10 border-t-black animate-spin mx-auto" />
        <p className="mt-4 text-sm text-zinc-600">Signing you in…</p>
      </div>
    </div>
  );
}
