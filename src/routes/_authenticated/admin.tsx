import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { adminOnboardUser } from "@/lib/admin.functions";
import { getPlaceDetails } from "@/lib/places.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Building2,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Search,
  Shield,
  QrCode,
  Star,
  Package,
  Copy,
  ExternalLink,
  Clock,
  Crown,
  CheckCircle2,
  Zap,
  Eye,
  X,
  Activity,
  Filter,
  Gauge,
  Trophy,
  Bot,
  Download,
  ArrowLeft,
  ChevronRight,
  MapPin,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Master Console — IntellectFlow" },
      { name: "description", content: "Platform admin panel to track users, inspect full user dashboards, and grant free lifetime access." },
    ],
  }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });

    const [roleRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle(),
    ]);

    const isAdmin = roleRes.data?.role === "admin" || profRes.data?.is_admin === true;
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminCRM,
});

const PLAN_OPTIONS = ["starter", "growth", "pro"] as const;
const STANDEE_STATUSES = ["pending", "printing", "shipped", "delivered", "cancelled"] as const;

function AdminCRM() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sinceFilter, setSinceFilter] = useState<string>("all");
  const [tab, setTab] = useState<"crm" | "overview" | "businesses" | "onboard" | "standees" | "reviews">("crm");

  // Selected user for FULL INTERACTIVE DASHBOARD INSPECTION
  const [inspectUser, setInspectUser] = useState<any | null>(null);

  // Platform Stats Query
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, biz, reviews, subs, scans, standees, profs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("price, status, is_lifetime"),
        supabase.from("businesses").select("total_scans"),
        supabase.from("standees").select("status"),
        supabase.from("profiles").select("plan, plan_price, lifetime_free, subscription_status, trial_ends_at, last_active_at"),
      ]);
      const activeSubs = (subs.data ?? []).filter((s) => s.status === "active" && !s.is_lifetime);
      const mrr = activeSubs.reduce((s, r) => s + (r.price ?? 0), 0);
      const p = profs.data ?? [];
      const nowMs = Date.now();
      const trialing = p.filter((r) => !r.lifetime_free && r.subscription_status === "trialing" && r.trial_ends_at && new Date(r.trial_ends_at).getTime() > nowMs).length;
      const churned = p.filter((r) => !r.lifetime_free && r.subscription_status === "trialing" && r.trial_ends_at && new Date(r.trial_ends_at).getTime() <= nowMs).length;
      const lifetime = p.filter((r) => r.lifetime_free).length;
      const active30 = p.filter((r) => r.last_active_at && nowMs - new Date(r.last_active_at).getTime() <= 30 * 86400000).length;
      return {
        users: users.count ?? 0,
        biz: biz.count ?? 0,
        reviews: reviews.count ?? 0,
        mrr,
        activeSubs: activeSubs.length,
        trialing,
        churned,
        lifetime,
        active30,
        total_scans: (scans.data ?? []).reduce((s, b) => s + (b.total_scans ?? 0), 0),
        pending_standees: (standees.data ?? []).filter((s) => s.status === "pending" || s.status === "printing").length,
      };
    },
  });

  // Users CRM Matrix Query
  const { data: users } = useQuery({
    queryKey: ["admin-users", q, planFilter, statusFilter, sinceFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, email, business_name, phone, city, plan, plan_price, is_admin, is_founder_free, lifetime_free, subscription_status, trial_ends_at, last_active_at, created_at, businesses(*)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (q) query = query.or(`email.ilike.%${q}%,business_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`);
      if (planFilter !== "all") query = query.eq("plan", planFilter);
      if (statusFilter === "lifetime") query = query.eq("lifetime_free", true);
      else if (statusFilter !== "all") query = query.eq("subscription_status", statusFilter);
      if (sinceFilter !== "all") {
        const days = Number(sinceFilter);
        query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      return (await query).data ?? [];
    },
  });

  // Businesses Query
  const { data: businesses } = useQuery({
    queryKey: ["admin-biz", q],
    enabled: tab === "businesses" || tab === "overview",
    queryFn: async () => {
      let query = supabase
        .from("businesses")
        .select("id, user_id, name, slug, city, address, phone, gmb_link, rating, total_reviews, total_scans, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,city.ilike.%${q}%`);
      return (await query).data ?? [];
    },
  });

  // Standees Query
  const { data: standees } = useQuery({
    queryKey: ["admin-standees"],
    enabled: tab === "standees" || tab === "overview",
    queryFn: async () => {
      const { data } = await supabase
        .from("standees")
        .select("id, type, status, qr_data, created_at, business_id, businesses(name, address, city, phone, slug, user_id)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  // Reviews Query
  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews"],
    enabled: tab === "reviews",
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, business_id, customer_name, rating, review_text, status, created_at").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // Admin Actions
  const updateProfile = async (
    id: string,
    patch: { plan?: string; plan_price?: number; is_founder_free?: boolean; is_admin?: boolean; lifetime_free?: boolean; subscription_status?: string },
  ) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("User profile updated!");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });

    if (inspectUser && inspectUser.id === id) {
      setInspectUser((prev: any) => ({ ...prev, ...patch }));
    }
  };

  const grantFreeFullAccess = async (userRecord: any) => {
    const isFreeNow = !userRecord.lifetime_free;
    await updateProfile(userRecord.id, {
      plan: "pro",
      plan_price: 1299,
      lifetime_free: isFreeNow,
      is_founder_free: isFreeNow,
      subscription_status: isFreeNow ? "lifetime" : "trialing",
    });
    if (isFreeNow) {
      toast.success(`🎉 Granted Lifetime Free Full Access (Pro Plan) to ${userRecord.email}`);
    } else {
      toast.info(`Revoked Lifetime Free Access for ${userRecord.email}`);
    }
  };

  const updateStandee = async (id: string, status: string) => {
    const { error } = await supabase.from("standees").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Standee status updated to ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-standees"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  // IF ADMIN IS INSPECTING A USER'S FULL DASHBOARD:
  if (inspectUser) {
    return (
      <UserFullDashboardView
        user={inspectUser}
        allUsers={users ?? []}
        onSelectUser={(u) => setInspectUser(u)}
        onBack={() => setInspectUser(null)}
        onGrantFree={grantFreeFullAccess}
        onUpdateProfile={updateProfile}
      />
    );
  }

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--ink)] via-[#241F1A] to-[#14110E] text-[var(--paper)] p-6 rounded-3xl border border-[var(--brass)]/30 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--brass)] text-[var(--ink)] font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5" /> IntellectFlow Enterprise CRM Console
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-2 text-white">
            User Tracking & CRM Control Center
          </h1>
          <p className="text-xs text-[var(--paper)]/70 mt-1 max-w-xl">
            Click on any user in the table below to inspect their <strong>Full Interactive Dashboard</strong>. All score cards and review counters are clickable with live detail drill-downs!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono hidden sm:block">
            <div className="text-xs text-[var(--brass)] font-bold">LIFETIME FREE USERS</div>
            <div className="text-2xl font-bold text-white">{stats?.lifetime ?? 0} Accounts</div>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total CRM Accounts" value={stats?.users ?? 0} color="border-blue-500/20 bg-blue-50/50 text-blue-900" />
        <StatCard icon={Building2} label="Registered Shops" value={stats?.biz ?? 0} color="border-emerald-500/20 bg-emerald-50/50 text-emerald-900" />
        <StatCard icon={Crown} label="Free Lifetime Full Access" value={stats?.lifetime ?? 0} color="border-amber-500/20 bg-amber-50/50 text-amber-900" />
        <StatCard icon={DollarSign} label="Monthly Revenue (MRR)" value={`₹${stats?.mrr ?? 0}`} color="border-purple-500/20 bg-purple-50/50 text-purple-900" />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-[rgba(20,17,14,0.12)] rounded-3xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-black/10 p-3 gap-3 flex-wrap bg-[var(--paper)]/40">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: "crm", label: "Users CRM Matrix", icon: Users },
              { id: "overview", label: "Overview", icon: Activity },
              { id: "businesses", label: "Shops & GMB", icon: Building2 },
              { id: "onboard", label: "Onboard User", icon: Zap },
              { id: "standees", label: "Standee Pipeline", icon: Package },
              { id: "reviews", label: "Reviews Stream", icon: MessageSquare },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as any)}
                  className={[
                    "px-3.5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2",
                    tab === item.id ? "bg-[var(--ink)] text-white shadow-xs" : "text-[var(--ink-60)] hover:bg-white",
                  ].join(" ")}
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--brass)]" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {(tab === "crm" || tab === "businesses") && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email, phone, shop, city..."
                className="pl-9 pr-3 h-9 rounded-xl border border-black/15 text-xs w-64 focus:outline-none focus:border-[var(--brass)] bg-white font-medium shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* USERS CRM MATRIX */}
        {tab === "crm" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-black/5 bg-zinc-50/60">
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <span className="font-bold text-[var(--ink-60)] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filters:
                </span>
                <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-8 rounded-lg border border-black/12 px-2 font-bold bg-white text-xs">
                  <option value="all">All Plans</option>
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-lg border border-black/12 px-2 font-bold bg-white text-xs">
                  <option value="all">All Statuses</option>
                  <option value="trialing">Trialing</option>
                  <option value="active">Active Paid</option>
                  <option value="lifetime">Lifetime Free</option>
                </select>
                <select value={sinceFilter} onChange={(e) => setSinceFilter(e.target.value)} className="h-8 rounded-lg border border-black/12 px-2 font-bold bg-white text-xs">
                  <option value="all">Any Signup Date</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              <div className="text-xs font-mono font-bold text-[var(--ink-60)]">
                Click any user row to open their <strong className="text-[var(--ink)]">Interactive Dashboard</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead className="bg-zinc-100 font-mono text-[11px] uppercase text-[var(--ink-60)] font-bold border-b border-black/10">
                  <tr>
                    <th className="text-left p-3">User & Contact</th>
                    <th className="text-left p-3">Shop / Business</th>
                    <th className="text-left p-3">Current Plan</th>
                    <th className="text-left p-3">Authority: Full Free Access</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Inspect Dashboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-sans">
                  {(users ?? []).map((u) => {
                    const b = Array.isArray(u.businesses) ? u.businesses[0] : null;

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setInspectUser(u)}
                        className="align-middle hover:bg-amber-50/60 transition cursor-pointer group"
                      >
                        {/* User Email & Phone */}
                        <td className="p-3">
                          <div className="font-semibold text-sm text-[var(--ink)] truncate max-w-[220px] group-hover:text-[var(--brass-deep)] transition">
                            {u.email}
                          </div>
                          <div className="text-[11px] text-[var(--ink-60)] font-mono">{u.phone ?? "No phone"} · {u.city ?? "—"}</div>
                        </td>

                        {/* Shop Name & Slug */}
                        <td className="p-3">
                          <div className="font-bold text-[var(--ink)]">{b?.name ?? u.business_name ?? "—"}</div>
                          {b?.slug && <div className="font-mono text-[10px] text-[var(--brass-deep)] font-bold">/r/{b.slug}</div>}
                        </td>

                        {/* Active Plan */}
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={u.plan ?? "starter"}
                            onChange={(e) => updateProfile(u.id, { plan: e.target.value, plan_price: e.target.value === "pro" ? 1299 : e.target.value === "growth" ? 599 : 299 })}
                            className="h-8 rounded-lg border border-black/15 px-2 text-xs font-mono font-bold bg-white focus:outline-none focus:border-[var(--brass)]"
                          >
                            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p.toUpperCase()} (₹{p === "pro" ? 1299 : p === "growth" ? 599 : 299})</option>)}
                          </select>
                          <div className="text-[10px] font-mono mt-1">
                            {u.lifetime_free ? (
                              <span className="font-bold text-[var(--routed-green)]">₹0 (Lifetime Free)</span>
                            ) : (
                              <span className="text-[var(--ink-60)]">₹{u.plan_price ?? 299}/mo</span>
                            )}
                          </div>
                        </td>

                        {/* Grant Lifetime Free Access Button */}
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => grantFreeFullAccess(u)}
                            className={[
                              "px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-2xs",
                              u.lifetime_free
                                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                                : "bg-[var(--brass)] text-[var(--ink)] hover:brightness-105 border border-[var(--brass-deep)]/30",
                            ].join(" ")}
                          >
                            {u.lifetime_free ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                Lifetime Free Active
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-[var(--ink)]" />
                                Grant Lifetime Free Access (Pro Plan)
                              </>
                            )}
                          </button>
                        </td>

                        {/* Make Admin Button */}
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => updateProfile(u.id, { is_admin: !u.is_admin })}
                            className={[
                              "px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition",
                              u.is_admin ? "bg-black text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                            ].join(" ")}
                          >
                            {u.is_admin ? "Admin ✓" : "Make Admin"}
                          </button>
                        </td>

                        {/* View Full User Dashboard Button */}
                        <td className="p-3">
                          <button
                            onClick={() => setInspectUser(u)}
                            className="px-3.5 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] font-mono text-xs font-bold hover:bg-black transition inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--brass)]" /> Inspect Dashboard <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(users ?? []).length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-sm text-zinc-500 font-mono">No accounts matched filter criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="font-display font-bold text-base mb-2 text-[var(--ink)]">Recent Registered Shops</h3>
              <BizTable rows={businesses ?? []} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base mb-2 text-[var(--ink)]">Standees Requiring Shipping</h3>
              <StandeeTable
                rows={(standees ?? []).filter((s) => s.status === "pending" || s.status === "printing")}
                onStatus={updateStandee}
              />
            </div>
          </div>
        )}

        {/* BUSINESSES */}
        {tab === "businesses" && <BizTable rows={businesses ?? []} />}

        {/* ONBOARD USER */}
        {tab === "onboard" && <AdminOnboard />}

        {/* STANDEES PIPELINE */}
        {tab === "standees" && (
          <div className="p-2">
            <StandeeTable rows={standees ?? []} onStatus={updateStandee} />
          </div>
        )}

        {/* REVIEWS STREAM */}
        {tab === "reviews" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-zinc-100 font-mono text-[11px] uppercase text-[var(--ink-60)] font-bold border-b border-black/10">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Rating</th>
                  <th className="text-left p-3">Review Text</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(reviews ?? []).map((r) => (
                  <tr key={r.id} className="align-top hover:bg-zinc-50/80 transition">
                    <td className="p-3 font-semibold text-[var(--ink)]">{r.customer_name || "Anonymous"}</td>
                    <td className="p-3"><span className="inline-flex items-center gap-1 font-bold font-mono text-[var(--brass-deep)]"><Star className="w-3.5 h-3.5 fill-[var(--brass)] text-[var(--brass)]" />{r.rating}</span></td>
                    <td className="p-3 max-w-[380px] text-zinc-700 leading-normal">{r.review_text || "—"}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${r.rating >= 4 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {r.status || (r.rating >= 4 ? "Public 5★ Route" : "Private Shield Route")}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-zinc-500 font-mono">{new Date(r.created_at ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
                {(reviews ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-sm text-zinc-500">No customer reviews yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

{/* FULL USER DASHBOARD INSPECTION VIEW (Fully Interactive & Clickable!) */}
function UserFullDashboardView({
  user,
  allUsers,
  onSelectUser,
  onBack,
  onGrantFree,
  onUpdateProfile,
}: {
  user: any;
  allUsers: any[];
  onSelectUser: (u: any) => void;
  onBack: () => void;
  onGrantFree: (u: any) => void;
  onUpdateProfile: (id: string, patch: any) => void;
}) {
  const b = Array.isArray(user.businesses) ? user.businesses[0] : null;
  const [activeModal, setActiveModal] = useState<"reviews" | "competitors" | "faqs" | "gmb" | "qr" | "location" | null>(null);

  // Fetch reviews for this inspected user's shop
  const { data: userReviews } = useQuery({
    queryKey: ["admin-inspect-reviews", b?.id],
    enabled: !!b?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, status, review_text, customer_name, ai_generated, created_at")
        .eq("business_id", b!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch competitors for this inspected user's shop
  const { data: userCompetitors } = useQuery({
    queryKey: ["admin-inspect-competitors", b?.id],
    enabled: !!b?.id,
    queryFn: async () => {
      const { data } = await supabase.from("competitors").select("*").eq("business_id", b!.id);
      return data ?? [];
    },
  });

  // Fetch FAQs for this inspected user's shop
  const { data: userFaqs } = useQuery({
    queryKey: ["admin-inspect-faqs", b?.id],
    enabled: !!b?.id,
    queryFn: async () => {
      const { data } = await supabase.from("faqs").select("*").eq("business_id", b!.id);
      return data ?? [];
    },
  });

  // Fetch GMB Posts for this inspected user's shop
  const { data: userGmbPosts } = useQuery({
    queryKey: ["admin-inspect-gmb", b?.id],
    enabled: !!b?.id,
    queryFn: async () => {
      const { data } = await supabase.from("gmb_posts").select("*").eq("business_id", b!.id);
      return data ?? [];
    },
  });

  // Fetch Standees for this inspected user's shop
  const { data: userStandees } = useQuery({
    queryKey: ["admin-inspect-standees", b?.id],
    enabled: !!b?.id,
    queryFn: async () => {
      const { data } = await supabase.from("standees").select("*").eq("business_id", b!.id);
      return data ?? [];
    },
  });

  const list = userReviews ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = b?.slug ? `${origin}/r/${b.slug}` : "";

  // Compute 8-week volume chart data
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * 7 * 86400000;
    const start = end - 7 * 86400000;
    const rows = list.filter((r) => {
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      return t > start && t <= end;
    });
    return {
      label: i === 0 ? "This wk" : `-${i}w`,
      count: rows.length,
      avg: rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0,
    };
  }).reverse();

  const maxW = Math.max(1, ...weeks.map((w) => w.count));

  // Compute score cards
  const totalReviews = list.length;
  const avgRating30 = list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : "5.0";

  // SEO Health calculation
  const checks = [
    { label: "Google Business Profile linked", points: 25, done: !!b?.place_id, modal: "location" },
    { label: "Business description added", points: 10, done: !!b?.description, modal: "location" },
    { label: "Phone number on profile", points: 10, done: !!b?.phone, modal: "location" },
    { label: "Address & city complete", points: 10, done: !!b?.address && !!b?.city, modal: "location" },
    { label: "Website linked", points: 10, done: !!b?.website, modal: "location" },
    { label: "Cover photo uploaded", points: 5, done: !!b?.photo_url, modal: "location" },
    { label: "10+ reviews collected", points: 10, done: totalReviews >= 10, altMsg: `Missing ${Math.max(0, 10 - totalReviews)}`, modal: "reviews" },
    { label: "Rating above 4.0", points: 10, done: Number(avgRating30) >= 4.0, modal: "reviews" },
    { label: "Published GMB posts", points: 10, done: (userGmbPosts?.length ?? 0) > 0, altMsg: (userGmbPosts?.length ?? 0) > 0 ? "Done" : "Missing 5", modal: "gmb" },
  ];

  const seoScore = checks.reduce((sum, c) => sum + (c.done ? c.points : 0), 0);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Admin Sticky User Switcher Bar */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[var(--ink)] to-[#241F1A] text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-[var(--brass)]/30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users List
          </button>

          <div className="h-6 w-px bg-white/20 hidden sm:block" />

          {/* User Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--brass)] font-bold uppercase">Inspecting:</span>
            <select
              value={user.id}
              onChange={(e) => {
                const target = allUsers.find((u) => u.id === e.target.value);
                if (target) onSelectUser(target);
              }}
              className="h-9 rounded-xl bg-white/90 text-[var(--ink)] text-xs font-mono font-bold px-3 focus:outline-none shadow-xs border border-white cursor-pointer"
            >
              {allUsers.map((u) => {
                const shopName = Array.isArray(u.businesses) && u.businesses[0] ? u.businesses[0].name : u.business_name || u.email;
                return (
                  <option key={u.id} value={u.id}>
                    {shopName} ({u.email})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Admin Overrides */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onGrantFree(user)}
            className={[
              "px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-2xs",
              user.lifetime_free ? "bg-emerald-700 text-white" : "bg-[var(--brass)] text-[var(--ink)] hover:brightness-105",
            ].join(" ")}
          >
            <Zap className="w-3.5 h-3.5" />
            {user.lifetime_free ? "Lifetime Free Active" : "Grant Lifetime Free (Pro)"}
          </button>
        </div>
      </div>

      {/* DASHBOARD HEADER */}
      <div className="space-y-4">
        {/* Subscription Status Bar */}
        <div className="ticket-card p-3.5 rounded-2xl bg-[#fefbf6] border border-[#f5e6d3] flex items-center justify-between flex-wrap gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--ink)]">
            <Crown className="w-4 h-4 text-[var(--brass-deep)]" />
            {user.lifetime_free ? (
              <span>Lifetime Free Access — all features unlocked, no billing.</span>
            ) : (
              <span>Trial / Active Subscription — Plan: {user.plan?.toUpperCase() || "STARTER"}</span>
            )}
          </div>

          <div className="text-[11px] font-mono font-bold text-[var(--brass-deep)] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Click any card below to view detailed logs!
          </div>
        </div>

        {/* Business Title & Slugs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-[var(--ink)]">
              {b?.name || user.business_name || "Business Profile"}
            </h1>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[var(--ink-60)]">
              <span>{b?.slug || "no-slug"}</span>
              <button onClick={() => { navigator.clipboard.writeText(b?.slug || ""); toast.success("Slug copied"); }} className="hover:text-black">
                <Copy className="w-3.5 h-3.5" />
              </button>
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="inline-flex items-center gap-1 font-bold text-xs bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-full shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              {b?.rating ?? "4.8"}
            </span>
            <span className="bg-[var(--ink)] text-[var(--paper)] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-2xs">
              {user.lifetime_free ? "LIFETIME" : user.plan?.toUpperCase() || "STARTER"}
            </span>
          </div>
        </div>
      </div>

      {/* 5 CORE INTERACTIVE DASHBOARD SCORE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* SEO SCORE CARD */}
        <div
          onClick={() => setActiveModal("location")}
          className="ticket-card p-5 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs cursor-pointer hover:scale-[1.01] transition group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-60)]">
            <span className="group-hover:text-[var(--brass-deep)] transition flex items-center gap-1">
              SEO SCORE <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center"><Gauge className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 font-mono font-black text-4xl text-[var(--ink)]">
            {seoScore}<span className="text-sm font-normal text-[var(--ink-60)]">/100</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-[var(--brass-deep)] h-full rounded-full transition-all" style={{ width: `${seoScore}%` }} />
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-60)] font-medium flex items-center justify-between">
            <span>Excellent profile health</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Details</span>
          </p>
        </div>

        {/* LOCAL RANK SCORE CARD */}
        <div
          onClick={() => setActiveModal("competitors")}
          className="ticket-card p-5 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs cursor-pointer hover:scale-[1.01] transition group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-60)]">
            <span className="group-hover:text-[var(--brass-deep)] transition flex items-center gap-1">
              LOCAL RANK SCORE <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center"><Trophy className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 font-mono font-black text-4xl text-[var(--ink)]">
            {userCompetitors?.length ? "75" : "0"}<span className="text-sm font-normal text-[var(--ink-60)]">/100</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-[var(--brass-deep)] h-full rounded-full transition-all" style={{ width: userCompetitors?.length ? "75%" : "0%" }} />
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-60)] font-medium flex items-center justify-between">
            <span>{userCompetitors?.length ? `#1 of ${userCompetitors.length + 1} tracked nearby` : "No tracked competitors nearby"}</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Competitors</span>
          </p>
        </div>

        {/* RESPONSE RATE CARD */}
        <div
          onClick={() => setActiveModal("reviews")}
          className="ticket-card p-5 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs cursor-pointer hover:scale-[1.01] transition group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-60)]">
            <span className="group-hover:text-[var(--brass-deep)] transition flex items-center gap-1">
              RESPONSE RATE <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center"><MessageSquare className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 font-mono font-black text-4xl text-[var(--ink)]">100%</div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-[var(--brass-deep)] h-full rounded-full transition-all w-full" />
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-60)] font-medium flex items-center justify-between">
            <span>{totalReviews} of {totalReviews} reviews handled</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Reviews</span>
          </p>
        </div>
      </div>

      {/* SECOND ROW SCORE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* GEO SCORE CARD */}
        <div
          onClick={() => setActiveModal("location")}
          className="ticket-card p-5 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs cursor-pointer hover:scale-[1.01] transition group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-60)]">
            <span className="group-hover:text-[var(--brass-deep)] transition flex items-center gap-1">
              GEO SCORE <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center"><MapPin className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 font-mono font-black text-4xl text-[var(--ink)]">85<span className="text-sm font-normal text-[var(--ink-60)]">/100</span></div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-[var(--brass-deep)] h-full rounded-full transition-all w-[85%]" />
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-60)] font-medium flex items-center justify-between">
            <span>Strong local-pack setup ({b?.city || "Location set"})</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Address</span>
          </p>
        </div>

        {/* AEO SCORE CARD */}
        <div
          onClick={() => setActiveModal("faqs")}
          className="ticket-card p-5 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs cursor-pointer hover:scale-[1.01] transition group"
        >
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-60)]">
            <span className="group-hover:text-[var(--brass-deep)] transition flex items-center gap-1">
              AEO SCORE <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center"><Bot className="w-4 h-4" /></span>
          </div>
          <div className="mt-3 font-mono font-black text-4xl text-[var(--ink)]">70<span className="text-sm font-normal text-[var(--ink-60)]">/100</span></div>
          <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-[var(--brass-deep)] h-full rounded-full transition-all w-[70%]" />
          </div>
          <p className="mt-2.5 text-xs text-[var(--ink-60)] font-medium flex items-center justify-between">
            <span>{userFaqs?.length ?? 0} FAQs generated for AI Search</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View FAQs</span>
          </p>
        </div>
      </div>

      {/* 4 COUNTER CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveModal("reviews")}
          className="ticket-card p-4 bg-white border border-[rgba(20,17,14,0.1)] hover:border-[var(--brass)] rounded-2xl cursor-pointer hover:scale-[1.02] transition group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--ink-60)] font-semibold">
            <span className="group-hover:text-black">Total reviews</span>
            <MessageSquare className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 font-mono font-bold text-2xl text-[var(--ink)] flex items-center justify-between">
            <span>{totalReviews}</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Log</span>
          </div>
        </div>

        <div
          onClick={() => setActiveModal("reviews")}
          className="ticket-card p-4 bg-white border border-[rgba(20,17,14,0.1)] hover:border-[var(--brass)] rounded-2xl cursor-pointer hover:scale-[1.02] transition group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--ink-60)] font-semibold">
            <span className="group-hover:text-black">Avg rating (30d)</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div className="mt-2 font-mono font-bold text-2xl text-[var(--ink)] flex items-center justify-between">
            <span>{avgRating30}</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Rating</span>
          </div>
        </div>

        <div
          onClick={() => setActiveModal("qr")}
          className="ticket-card p-4 bg-white border border-[rgba(20,17,14,0.1)] hover:border-[var(--brass)] rounded-2xl cursor-pointer hover:scale-[1.02] transition group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--ink-60)] font-semibold">
            <span className="group-hover:text-black">QR scans</span>
            <QrCode className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 font-mono font-bold text-2xl text-[var(--ink)] flex items-center justify-between">
            <span>{b?.total_scans ?? 1}</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View QR</span>
          </div>
        </div>

        <div
          onClick={() => setActiveModal("reviews")}
          className="ticket-card p-4 bg-white border border-[rgba(20,17,14,0.1)] hover:border-[var(--brass)] rounded-2xl cursor-pointer hover:scale-[1.02] transition group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--ink-60)] font-semibold">
            <span className="group-hover:text-black">Reviews (30d)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono font-bold text-2xl text-[var(--ink)] flex items-center justify-between">
            <span>{totalReviews}</span>
            <span className="text-[10px] font-mono font-bold text-blue-600 underline">View Details</span>
          </div>
        </div>
      </div>

      {/* REVIEW VOLUME GRAPH — LAST 8 WEEKS */}
      <div
        onClick={() => setActiveModal("reviews")}
        className="ticket-card p-6 bg-white border border-[rgba(20,17,14,0.12)] hover:border-[var(--brass)] rounded-3xl shadow-xs space-y-4 cursor-pointer hover:scale-[1.005] transition group"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-[var(--ink)] group-hover:text-[var(--brass-deep)] transition flex items-center gap-2">
            Review volume — last 8 weeks <ChevronRight className="w-4 h-4" />
          </h3>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2.5 py-1 rounded-full">
            Rating trend +5.00
          </span>
        </div>

        <div className="h-44 pt-6 flex items-end justify-between gap-2 border-b border-black/10 pb-2">
          {weeks.map((w, idx) => {
            const hPct = maxW > 0 ? (w.count / maxW) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end">
                <span className="text-[11px] font-mono font-bold text-[var(--ink)] opacity-0 group-hover/bar:opacity-100 transition">
                  {w.count}
                </span>
                <div
                  className="w-full max-w-[42px] bg-zinc-900 rounded-t-lg transition-all duration-300 min-h-[4px]"
                  style={{ height: `${Math.max(6, hPct)}%` }}
                />
                <span className="text-[10px] font-mono text-[var(--ink-60)] font-bold">{w.label}</span>
              </div>
            );
          })}
        </div>

        {/* Rating Breakdown Pill Counters */}
        <div className="grid grid-cols-5 gap-2 pt-2 text-center font-mono text-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = list.filter((r) => r.rating === star).length;
            return (
              <div key={star} className="p-2 bg-[var(--paper)] rounded-xl border border-black/5 hover:border-[var(--brass)] transition">
                <div className="text-[11px] text-[var(--ink-60)] font-bold">{star} ★</div>
                <div className="font-bold text-sm text-[var(--ink)] mt-0.5">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REVIEW QR CODE SECTION */}
      {publicUrl && (
        <div className="ticket-card p-6 bg-white border border-[rgba(20,17,14,0.12)] rounded-3xl shadow-xs text-center space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-[var(--ink)]">Your review QR</h3>
            <p className="text-xs text-[var(--ink-60)] mt-0.5">Print it, stick it, collect reviews.</p>
          </div>

          <div
            onClick={() => setActiveModal("qr")}
            className="bg-white p-4 border border-black/10 hover:border-[var(--brass)] rounded-2xl inline-block shadow-2xs cursor-pointer hover:scale-105 transition"
          >
            <QRCodeSVG value={publicUrl} size={180} />
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <button
              onClick={() => setActiveModal("qr")}
              className="w-full h-11 bg-[var(--ink)] text-[var(--paper)] rounded-xl font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:bg-black transition shadow-xs cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-[var(--brass)]" /> View QR Options & Standee
            </button>
          </div>
        </div>
      )}

      {/* SEO HEALTH BREAKDOWN CHECKLIST */}
      <div className="ticket-card p-6 bg-white border border-[rgba(20,17,14,0.12)] rounded-3xl shadow-xs space-y-4">
        <h3 className="font-display font-bold text-lg text-[var(--ink)]">SEO health breakdown</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
          {checks.map((c) => (
            <div
              key={c.label}
              onClick={() => setActiveModal(c.modal as any)}
              className="p-3.5 rounded-2xl bg-[var(--paper)]/60 border border-black/5 hover:border-[var(--brass)] cursor-pointer transition flex items-center justify-between gap-2 group"
            >
              <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--brass-deep)] transition flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                {c.label}
              </span>
              {c.done ? (
                <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{c.points}
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {c.altMsg || "Missing"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* INTERACTIVE DRILL-DOWN MODALS FOR ALL CARDS */}

      {/* 1. REVIEWS DRILL-DOWN MODAL */}
      {activeModal === "reviews" && (
        <DrillDownModal title={`All Customer Reviews (${totalReviews})`} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="text-xs font-mono text-zinc-500">
              Listing all positive 5★ public Google reviews and 1-3★ private owner complaints for <strong>{b?.name}</strong>.
            </div>
            {list.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 rounded-2xl">
                No customer reviews recorded yet for this shop.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {list.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-black/10 bg-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--ink)]">{r.customer_name || "Anonymous Customer"}</span>
                      <span className="font-mono text-xs font-bold text-amber-600 inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> {r.rating} ★
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-sans">{r.review_text || "No written review text provided."}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-black/5">
                      <span>Status: {r.status || (r.rating >= 4 ? "Public 5★ Route" : "Private Shield Route")}</span>
                      <span>{new Date(r.created_at ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrillDownModal>
      )}

      {/* 2. COMPETITORS DRILL-DOWN MODAL */}
      {activeModal === "competitors" && (
        <DrillDownModal title={`Tracked Competitors (${userCompetitors?.length ?? 0})`} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="text-xs font-mono text-zinc-500">
              Nearby competitors monitored by Gemini AI for <strong>{b?.name}</strong>.
            </div>
            {(userCompetitors?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 rounded-2xl">
                No nearby competitors fetched yet for this shop.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {userCompetitors?.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl border border-black/10 bg-white space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--ink)]">{c.competitor_name}</span>
                      <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {c.competitor_rating ?? "4.5"} ★ ({c.competitor_reviews ?? 0} reviews)
                      </span>
                    </div>
                    {(c as any).swot_summary && <p className="text-xs text-zinc-600 font-sans leading-relaxed">{(c as any).swot_summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrillDownModal>
      )}

      {/* 3. FAQS DRILL-DOWN MODAL */}
      {activeModal === "faqs" && (
        <DrillDownModal title={`Generated Shop FAQs (${userFaqs?.length ?? 0})`} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="text-xs font-mono text-zinc-500">
              AI-generated FAQs for ChatGPT, Gemini, and Google Voice Search for <strong>{b?.name}</strong>.
            </div>
            {(userFaqs?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 rounded-2xl">
                No FAQs generated yet for this shop.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {userFaqs?.map((f) => (
                  <div key={f.id} className="p-4 rounded-2xl border border-black/10 bg-white space-y-1 shadow-2xs">
                    <div className="font-bold text-xs text-[var(--ink)]">Q: {f.question}</div>
                    <div className="text-xs text-zinc-600 leading-relaxed font-sans">A: {f.answer}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrillDownModal>
      )}

      {/* 4. GMB POSTS DRILL-DOWN MODAL */}
      {activeModal === "gmb" && (
        <DrillDownModal title={`Published GMB Posts (${userGmbPosts?.length ?? 0})`} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="text-xs font-mono text-zinc-500">
              Google Business Profile posts created for <strong>{b?.name}</strong>.
            </div>
            {(userGmbPosts?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 bg-zinc-50 rounded-2xl">
                No GMB posts published yet for this shop.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {userGmbPosts?.map((g) => (
                  <div key={g.id} className="p-4 rounded-2xl border border-black/10 bg-white space-y-1.5 shadow-2xs">
                    <div className="font-bold text-xs text-[var(--ink)]">{(g as any).topic || "GMB Update"}</div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-sans">{g.content}</p>
                    <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-black/5">
                      {new Date(g.created_at ?? 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrillDownModal>
      )}

      {/* 5. LOCATION & GOOGLE MAPS DRILL-DOWN MODAL */}
      {activeModal === "location" && (
        <DrillDownModal title={`Google Business Profile Location Details`} onClose={() => setActiveModal(null)}>
          <div className="space-y-3 font-sans text-xs">
            <div className="p-4 rounded-2xl border border-black/10 bg-white space-y-2">
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Shop Name</span>
                <span className="font-bold text-sm text-[var(--ink)]">{b?.name || "Not set"}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Address & City</span>
                <span>{b?.address || "No street address"} · {b?.city || "No city"}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Contact Phone</span>
                <span className="font-mono font-bold text-[var(--ink)]">{b?.phone || user.phone || "No phone number"}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Google Place ID</span>
                <span className="font-mono text-[11px] text-zinc-600">{b?.place_id || "Not linked"}</span>
              </div>
              {b?.gmb_link && (
                <div>
                  <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Google Maps Review Link</span>
                  <a href={b.gmb_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-xs font-bold inline-flex items-center gap-1">
                    Open GMB Link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </DrillDownModal>
      )}

      {/* 6. QR CODE & STANDEE DRILL-DOWN MODAL */}
      {activeModal === "qr" && (
        <DrillDownModal title={`Review QR Code & Standee Order Status`} onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-center">
            {publicUrl && (
              <div className="bg-white p-4 border border-black/10 rounded-2xl inline-block shadow-2xs">
                <QRCodeSVG value={publicUrl} size={200} />
              </div>
            )}
            <div className="font-mono text-xs font-bold text-[var(--brass-deep)]">{publicUrl}</div>

            <div className="text-left p-4 rounded-2xl border border-black/10 bg-white space-y-2 text-xs font-sans">
              <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase block">Counter Standee Shipments</span>
              {(userStandees?.length ?? 0) === 0 ? (
                <div className="text-zinc-500 font-mono">No standee order requested yet.</div>
              ) : (
                userStandees?.map((st) => (
                  <div key={st.id} className="flex items-center justify-between font-mono">
                    <span>{st.type}</span>
                    <span className="font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {st.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DrillDownModal>
      )}
    </div>
  );
}

{/* REUSABLE DRILL-DOWN MODAL COMPONENT */}
function DrillDownModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-black/10 flex items-center justify-between bg-[var(--paper)]">
          <h3 className="font-display font-bold text-base text-[var(--ink)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--brass-deep)]" /> {title}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 text-zinc-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className={`p-4 rounded-2xl border ${color} shadow-2xs`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="mt-2 font-mono font-bold text-2xl tracking-tight">{value.toLocaleString()}</div>
    </div>
  );
}

type StandeeRow = {
  id: string;
  type: string | null;
  status: string | null;
  qr_data: string | null;
  created_at: string | null;
  businesses?: {
    name: string | null;
    slug: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
  } | null;
};

function StandeeTable({ rows, onStatus }: { rows: StandeeRow[]; onStatus: (id: string, status: string) => void }) {
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[900px]">
        <thead className="bg-zinc-100 font-mono text-[11px] uppercase text-[var(--ink-60)] font-bold border-b border-black/10">
          <tr>
            <th className="text-left p-3">Business</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Ship to Address</th>
            <th className="text-left p-3">Phone</th>
            <th className="text-left p-3">QR Link</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((s) => (
            <tr key={s.id} className="align-top hover:bg-zinc-50/80 transition">
              <td className="p-3">
                <div className="font-semibold text-[var(--ink)]">{s.businesses?.name ?? "—"}</div>
                <div className="text-[10px] text-[var(--brass-deep)] font-mono font-bold">/r/{s.businesses?.slug}</div>
              </td>
              <td className="p-3 whitespace-nowrap font-mono text-xs">{s.type}</td>
              <td className="p-3 max-w-[280px]">
                <div className="text-zinc-700">{s.businesses?.address ?? <span className="text-rose-600 font-bold">No address on file</span>}</div>
                <div className="text-xs text-zinc-500">{s.businesses?.city ?? ""}</div>
              </td>
              <td className="p-3">
                {s.businesses?.phone ? (
                  <button onClick={() => s.businesses?.phone && copy(s.businesses.phone)} className="inline-flex items-center gap-1 text-xs font-mono font-semibold hover:text-black">
                    {s.businesses.phone}<Copy className="w-3 h-3" />
                  </button>
                ) : <span className="text-xs text-zinc-400">—</span>}
              </td>
              <td className="p-3">
                {s.qr_data ? (
                  <a href={s.qr_data} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 hover:underline max-w-[180px] truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" />{s.qr_data}
                  </a>
                ) : "—"}
              </td>
              <td className="p-3">
                <select
                  value={s.status ?? "pending"}
                  onChange={(e) => onStatus(s.id, e.target.value)}
                  className={[
                    "h-8 rounded-md px-2 text-xs font-mono font-bold border focus:outline-none",
                    s.status === "delivered" ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
                    s.status === "shipped" ? "bg-blue-50 border-blue-300 text-blue-800" :
                    s.status === "printing" ? "bg-amber-50 border-amber-300 text-amber-800" :
                    s.status === "cancelled" ? "bg-zinc-100 border-zinc-300 text-zinc-500" :
                    "bg-rose-50 border-rose-300 text-rose-800",
                  ].join(" ")}
                >
                  {STANDEE_STATUSES.map((st) => <option key={st} value={st}>{st.toUpperCase()}</option>)}
                </select>
              </td>
              <td className="p-3 text-xs text-zinc-500 font-mono whitespace-nowrap">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-sm text-zinc-500">No standee orders.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BizTable({ rows }: { rows: Array<{ id: string; name: string; slug: string; city: string | null; address?: string | null; phone?: string | null; gmb_link?: string | null; rating: number | null; total_reviews: number | null; total_scans: number | null; created_at: string | null }> }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[900px]">
        <thead className="bg-zinc-100 font-mono text-[11px] uppercase text-[var(--ink-60)] font-bold border-b border-black/10">
          <tr>
            <th className="text-left p-3">Shop / Business</th>
            <th className="text-left p-3">Address & City</th>
            <th className="text-left p-3">Contact Phone</th>
            <th className="text-left p-3">Public QR Link</th>
            <th className="text-left p-3">Google Maps Link</th>
            <th className="text-left p-3">Total Reviews</th>
            <th className="text-left p-3">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((b) => (
            <tr key={b.id} className="align-top hover:bg-zinc-50/80 transition">
              <td className="p-3">
                <div className="font-semibold text-[var(--ink)]">{b.name}</div>
                <div className="text-[10px] font-mono text-[var(--brass-deep)] font-bold">/r/{b.slug}</div>
              </td>
              <td className="p-3 max-w-[240px]">
                <div className="text-zinc-700">{b.address ?? "—"}</div>
                <div className="text-xs text-zinc-500">{b.city ?? ""}</div>
              </td>
              <td className="p-3 whitespace-nowrap font-mono text-xs">{b.phone ?? "—"}</td>
              <td className="p-3 font-mono">
                <a href={`${origin}/r/${b.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">Open <ExternalLink className="w-3 h-3" /></a>
              </td>
              <td className="p-3 font-mono">
                {b.gmb_link ? <a href={b.gmb_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">GMB Link <ExternalLink className="w-3 h-3" /></a> : "—"}
              </td>
              <td className="p-3 font-mono font-bold">{b.total_reviews ?? 0}</td>
              <td className="p-3 font-mono font-bold text-[var(--brass-deep)]">{b.rating ?? "—"} ★</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-sm text-zinc-500">No businesses registered yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function slugify(v: string) {
  if (!v) return "shop-" + Math.floor(1000 + Math.random() * 9000);
  const clean = v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (clean.length >= 2) return clean;
  return "biz-" + Math.floor(10000 + Math.random() * 90000);
}

function AdminOnboard() {
  const qc = useQueryClient();
  const onboard = useServerFn(adminOnboardUser);
  const details = useServerFn(getPlaceDetails);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userQ, setUserQ] = useState("");
  const [form, setForm] = useState({
    user_id: "", name: "", slug: "", phone: "", city: "", address: "",
    place_id: "", gmb_link: "", photo_url: "", website: "", business_type: "", description: "",
    plan: "pro" as "starter" | "growth" | "pro",
  });

  const { data: candidates } = useQuery({
    queryKey: ["admin-onboard-users", userQ],
    queryFn: async () => {
      const [{ data: profs }, { data: biz }] = await Promise.all([
        supabase.from("profiles").select("id, email, business_name, phone, city, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("businesses").select("user_id"),
      ]);
      const taken = new Set((biz ?? []).map((b) => b.user_id));
      const term = userQ.trim().toLowerCase();
      return (profs ?? [])
        .filter((p) => !taken.has(p.id))
        .filter((p) => !term || (p.email ?? "").toLowerCase().includes(term) || (p.business_name ?? "").toLowerCase().includes(term));
    },
  });

  const pickPlace = async (place_id: string) => {
    setBusy(true);
    setErr(null);
    try {
      const d = await details({ data: { place_id } });
      setForm((f) => ({
        ...f,
        name: d.name,
        slug: f.slug || slugify(d.name),
        phone: d.phone ?? f.phone,
        city: d.city ?? f.city,
        address: d.address,
        place_id: d.place_id,
        gmb_link: `https://search.google.com/local/writereview?placeid=${d.place_id}`,
        photo_url: d.photo_url ?? "",
        website: d.website ?? "",
        business_type: d.business_type ?? "",
      }));
      toast.success("Google details loaded");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load place");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setErr(null);
    if (!form.user_id) return setErr("Select the user account you are onboarding.");
    if (!form.name.trim()) return setErr("Business name is required.");
    if (!form.slug.trim()) return setErr("Public URL slug is required.");
    setBusy(true);
    try {
      await onboard({ data: { ...form, slug: slugify(form.slug) } });
      toast.success("User onboarded");
      setForm({ user_id: "", name: "", slug: "", phone: "", city: "", address: "", place_id: "", gmb_link: "", photo_url: "", website: "", business_type: "", description: "", plan: "pro" });
      qc.invalidateQueries({ queryKey: ["admin-biz"] });
      qc.invalidateQueries({ queryKey: ["admin-onboard-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Onboarding failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-3xl font-sans">
      <div>
        <h2 className="font-display font-bold text-lg text-[var(--ink)]">Onboard User on Google Maps</h2>
        <p className="text-xs text-[var(--ink-60)]">Connect a Google business profile on behalf of any account that has not completed setup.</p>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-900">{err}</div>}

      <div>
        <label className="text-xs font-mono font-bold uppercase tracking-wide text-zinc-500">1. Select Target User Account</label>
        <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search user by email or business name…" className="mt-1 w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)] bg-white" />
        <div className="mt-2 max-h-52 overflow-auto space-y-1.5">
          {(candidates ?? []).length === 0 && <div className="text-xs text-zinc-500 p-2 font-mono">No accounts pending onboarding.</div>}
          {(candidates ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setForm((f) => ({ ...f, user_id: p.id, phone: f.phone || (p.phone ?? ""), city: f.city || (p.city ?? "") }))}
              className={"w-full text-left p-2.5 rounded-xl border-2 text-xs transition " + (form.user_id === p.id ? "border-[var(--brass)] bg-amber-50/50 font-bold" : "border-zinc-200 hover:border-zinc-400 bg-white")}
            >
              <div className="font-semibold text-sm text-[var(--ink)]">{p.email}</div>
              <div className="text-xs text-zinc-500 font-mono">{p.business_name || "No business name"} · joined {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono font-bold uppercase tracking-wide text-zinc-500">2. Find Business on Google Maps</label>
        <div className="mt-1">
          <PlaceSearchInput disabled={busy} onSelect={(s) => pickPlace(s.place_id)} placeholder="Start typing the business name…" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Business Name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: slugify(v) })} />
        <Field label="Public URL Slug (/r/slug)" value={form.slug} onChange={(v) => setForm({ ...form, slug: slugify(v) })} />
        <Field label="WhatsApp Phone Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <div>
          <label className="text-xs font-semibold text-zinc-600">Assign Plan</label>
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as typeof form.plan })} className="mt-1 w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-mono font-bold bg-white focus:outline-none focus:border-[var(--brass)]">
            <option value="starter">Starter — ₹299/mo</option>
            <option value="growth">Growth — ₹599/mo</option>
            <option value="pro">Business Pro — ₹1299/mo</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-600">Description for AI Generator</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-xs font-medium focus:outline-none focus:border-[var(--brass)]" />
      </div>

      <button onClick={save} disabled={busy} className="h-11 px-6 rounded-xl bg-[var(--ink)] text-white font-mono uppercase tracking-wider text-xs font-bold hover:bg-black transition disabled:opacity-60">
        {busy ? "Saving…" : "Onboard This User"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-black/15 px-3 text-xs font-medium focus:outline-none focus:border-[var(--brass)]" />
    </div>
  );
}
