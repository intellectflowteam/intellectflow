export type PlanId = "starter" | "growth" | "pro";

export type Plan = {
  id: PlanId;
  label: string;
  price: number;
  market: string;
  popular?: boolean;
  razorpayPlanId: string;
  paymentLink: string;
  features: string[];
};

export type FeatureRow = {
  /** Base feature name (no duplicates across tiers). */
  name: string;
  /** Per-plan value: false = locked, true = included, string = tier-specific limit. */
  starter: boolean | string;
  growth: boolean | string;
  pro: boolean | string;
};

/** Single source of truth — one row per feature, tier limits shown inline (no duplicates). */
export const FEATURE_MATRIX: FeatureRow[] = [
  { name: "QR + Public Review Page", starter: true, growth: true, pro: true },
  { name: "Unlimited review collection", starter: true, growth: true, pro: true },
  { name: "Smart QR (5★ → Google, 1–3★ private)", starter: true, growth: true, pro: true },
  { name: "AI Review Writer (2 SEO keywords)", starter: true, growth: true, pro: true },
  { name: "Negative Review Filter → Private", starter: true, growth: true, pro: true },
  { name: "Reviews Inbox + Counter", starter: true, growth: true, pro: true },
  { name: "1 FREE printed standee", starter: true, growth: true, pro: true },
  { name: "Basic review analytics", starter: true, growth: true, pro: true },
  { name: "Staff Training Tips (AI)", starter: true, growth: true, pro: true },
  { name: "AI Reply", starter: "5 / month", growth: "50 / month", pro: "Unlimited" },
  { name: "GMB Post Generator", starter: "1 / month", growth: "5 / month", pro: "15 / month" },
  { name: "Auto FAQ Generator", starter: "3", growth: "10", pro: "Unlimited" },
  { name: "Live Google Reviews Import", starter: false, growth: true, pro: true },
  { name: "WhatsApp review reminder (24hr)", starter: false, growth: true, pro: true },
  { name: "Sentiment Analysis + Summary", starter: false, growth: true, pro: true },
  { name: "SEO Health Score + breakdown", starter: false, growth: true, pro: true },
  { name: "Review volume & rating trend", starter: false, growth: true, pro: true },
  { name: "Best Time to Ask + Post", starter: false, growth: true, pro: true },
  { name: "Weekly Smart PDF Report", starter: false, growth: true, pro: true },
  { name: "WhatsApp Broadcast Pack", starter: false, growth: "5", pro: "20" },
  { name: "Competitor Tracking (SWOT)", starter: false, growth: false, pro: "2 competitors" },
  { name: "Local Rank Tracker vs competitors", starter: false, growth: false, pro: true },
  { name: "Rating Drop Alert", starter: false, growth: false, pro: true },
  { name: "Hyperlocal Opportunity Alert", starter: false, growth: false, pro: true },
  { name: "Multi-standee & custom print designs", starter: false, growth: false, pro: true },
  { name: "1 FREE Business Website (built by us)", starter: false, growth: false, pro: true },
  { name: "Support", starter: "Email", growth: "Priority email", pro: "Priority WhatsApp + phone" },
];

/** Master feature list — order used for the pricing matrix (locked items shown greyed). */
export const ALL_FEATURES: string[] = FEATURE_MATRIX.map((r) => r.name);

export function featureLabel(row: FeatureRow, plan: PlanId): string {
  const v = row[plan];
  return typeof v === "string" ? `${row.name} — ${v}` : row.name;
}

function featuresFor(plan: PlanId): string[] {
  if (plan === "pro") return ALL_FEATURES;
  return FEATURE_MATRIX.filter((r) => r[plan] !== false).map((r) => r.name);
}

const STARTER_FEATURES = featuresFor("starter");
const GROWTH_FEATURES = featuresFor("growth");
const PRO_FEATURES = featuresFor("pro");



// TODO: these razorpayPlanId / paymentLink values are placeholders.
// Create your own plans + payment links in your own Razorpay dashboard
// (Razorpay → Payment Pages or Subscriptions) and paste them in here —
// the original values were tied to someone else's Razorpay account.
export const PLANS: Plan[] = [
  {
    id: "starter",
    label: "Starter",
    price: 299,
    market: "₹8,000/mo",
    razorpayPlanId: "REPLACE_WITH_YOUR_RAZORPAY_PLAN_ID",
    paymentLink: "REPLACE_WITH_YOUR_RAZORPAY_PAYMENT_LINK",
    features: STARTER_FEATURES,
  },
  {
    id: "growth",
    label: "Growth",
    price: 599,
    market: "₹25,000/mo",
    popular: true,
    razorpayPlanId: "REPLACE_WITH_YOUR_RAZORPAY_PLAN_ID",
    paymentLink: "REPLACE_WITH_YOUR_RAZORPAY_PAYMENT_LINK",
    features: GROWTH_FEATURES,
  },
  {
    id: "pro",
    label: "Business Pro",
    price: 1299,
    market: "₹1,08,000/mo",
    razorpayPlanId: "REPLACE_WITH_YOUR_RAZORPAY_PLAN_ID",
    paymentLink: "REPLACE_WITH_YOUR_RAZORPAY_PAYMENT_LINK",
    features: PRO_FEATURES,
  },
];

/** Feature-gating helper: is this feature unlocked on the given plan? */
export function planHasFeature(plan: PlanId, feature: string): boolean {
  const p = PLANS.find((x) => x.id === plan);
  return !!p?.features.includes(feature);
}


export const TRIAL_DAYS = 3;

export type AccessState = {
  lifetimeFree: boolean;
  onTrial: boolean;
  trialDaysLeft: number;
  expired: boolean;
  isPaid: boolean;
  plan: PlanId;
};

export function computeAccess(profile: {
  plan?: string | null;
  lifetime_free?: boolean | null;
  is_founder_free?: boolean | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
} | null | undefined): AccessState {
  const plan = ((profile?.plan as PlanId) ?? "starter") as PlanId;
  const lifetimeFree = !!(profile?.lifetime_free || profile?.is_founder_free);
  const status = profile?.subscription_status ?? "trialing";
  const isPaid = !lifetimeFree && status === "active";
  const endsAt = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at)
    : new Date(new Date(profile?.created_at ?? Date.now()).getTime() + TRIAL_DAYS * 86400000);
  const msLeft = endsAt.getTime() - Date.now();
  const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const onTrial = !lifetimeFree && !isPaid && msLeft > 0;
  const expired = !lifetimeFree && !isPaid && msLeft <= 0;
  return { lifetimeFree, onTrial, trialDaysLeft, expired, isPaid, plan };
}
