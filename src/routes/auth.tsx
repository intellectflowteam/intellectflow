import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, ArrowRight, Sparkles, CheckCircle2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InteractiveCharacters } from "@/components/auth/InteractiveCharacters";
import { AnimatedOtpVerification } from "@/components/auth/AnimatedOtpVerification";
import { BrandLogo } from "@/components/BrandLogo";
import { sendOtp, verifyOtp, checkEmailRegistered } from "@/lib/otp.functions";
import { checkDeviceLock, recordFailedDeviceAttempt, clearDeviceAttempts } from "@/lib/rate-limiter";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Auth — IntellectFlow" },
      { name: "description", content: "Sign in or create your IntellectFlow account for Google reviews automation." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    businessType: "shop",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // OTP Verification Step State
  const [showOtpStep, setShowOtpStep] = useState(false);

  // Active input tracking for interactive character mascot mood
  const [activeInput, setActiveInput] = useState<"name" | "email" | "password" | "confirmPassword" | null>(null);

  // Derived mood of characters: 'idle' | 'nosy' | 'shy' | 'exposed'
  const mood = (() => {
    if (showPassword && form.password.length > 0) return "exposed";
    if (activeInput === "password" || activeInput === "confirmPassword") return "shy";
    if (activeInput === "email" || activeInput === "name") return "nosy";
    return "idle";
  })();

  // Live debounced email check via server function
  useEffect(() => {
    const cleanEmail = form.email.trim().toLowerCase();
    if (!cleanEmail || mode === "signin") {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailRegistered({ data: { email: cleanEmail } });
        if (res.registered) {
          setEmailStatus("taken");
        } else {
          setEmailStatus("available");
        }
      } catch {
        setEmailStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.email, mode]);

  // Password Rules (Simple min 6 chars)
  const isPasswordStrong = form.password.length >= 6;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  const normalizeEmail = () => form.email.trim().toLowerCase();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 30) {
      setForm((prev) => ({ ...prev, name: val }));
    }
  };

  const sendPasswordReset = async () => {
    const cleanEmail = normalizeEmail();
    if (!cleanEmail) {
      setAuthError("Enter your email address first, then click Reset password.");
      toast.error("Enter your email address first.");
      return;
    }
    setResetBusy(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send password reset email.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setResetBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google authentication failed.";
      setAuthError(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail();
    setAuthError(null);
    setSuccessMsg(null);

    // 1. Device Lock Checks (Max 5 failed attempts per 30 mins)
    if (mode === "signin") {
      const lock = checkDeviceLock("login", cleanEmail);
      if (lock.isLocked) {
        const msg = `Too many failed login attempts. This device is locked for ${lock.remainingMinutes} minutes. Please try again later.`;
        setAuthError(msg);
        toast.error(msg);
        return;
      }
    } else {
      const lock = checkDeviceLock("signup", cleanEmail);
      if (lock.isLocked) {
        const msg = `Too many registration attempts. This device is locked for ${lock.remainingMinutes} minutes. Please try again later.`;
        setAuthError(msg);
        toast.error(msg);
        return;
      }
    }

    if (mode === "signup") {
      if (!form.name.trim()) {
        setAuthError("Full name is required.");
        return;
      }
      if (emailStatus === "taken") {
        setAuthError("This email is already registered. Please sign in.");
        return;
      }
      if (!isPasswordStrong) {
        setAuthError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setAuthError("Passwords do not match. Please re-enter.");
        return;
      }
    }

    if (!cleanEmail) {
      setAuthError("Please enter your email address.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        // Double check email registration on server before sending OTP
        const checkRes = await checkEmailRegistered({ data: { email: cleanEmail } });
        if (checkRes.registered) {
          setEmailStatus("taken");
          setAuthError("Yeh Email ID pehle se registered hai! Direct Login karein.");
          toast.error("Email is already registered! Please sign in.");
          setBusy(false);
          return;
        }

        // Send Brevo OTP code via server function
        await sendOtp({ data: { email: cleanEmail, purpose: "signup" } });
        setShowOtpStep(true);
        setSuccessMsg(`📩 6-digit OTP code sent to ${cleanEmail}!`);
        toast.success(`6-digit OTP sent to ${cleanEmail}`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome back to IntellectFlow!");
        clearDeviceAttempts("login", cleanEmail);

        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle();
          if (prof?.is_admin) {
            nav({ to: "/admin" });
            return;
          }
        }
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      if (mode === "signin") {
        const lock = recordFailedDeviceAttempt("login", cleanEmail);
        if (lock.isLocked) {
          const lockMsg = `Too many failed login attempts. This device is locked for 30 minutes. Please try again later.`;
          setAuthError(lockMsg);
          toast.error(lockMsg);
          return;
        }
      } else {
        const lock = recordFailedDeviceAttempt("signup", cleanEmail);
        if (lock.isLocked) {
          const lockMsg = `Too many registration attempts. This device is locked for 30 minutes. Please try again later.`;
          setAuthError(lockMsg);
          toast.error(lockMsg);
          return;
        }
      }
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtpCode = async (otpCode: string) => {
    const cleanEmail = normalizeEmail();
    setBusy(true);
    setAuthError(null);

    try {
      // 1. Verify OTP code via server function
      await verifyOtp({ data: { email: cleanEmail, code: otpCode } });

      // 2. Create account in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            business_type: form.businessType,
          },
        },
      });

      if (error) {
        // If already registered, sign in directly
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: form.password,
        });
        if (siErr) throw error;
      }

      clearDeviceAttempts("signup", cleanEmail);
      clearDeviceAttempts("otp_resend", cleanEmail);
      toast.success("Email verified & account created!");
      setTimeout(() => {
        nav({ to: "/onboarding" });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid OTP code.";
      setAuthError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = normalizeEmail();
    const otpLock = checkDeviceLock("otp_resend", cleanEmail);
    if (otpLock.isLocked) {
      const msg = `OTP resend limit reached. Please try again after ${otpLock.remainingMinutes} minutes.`;
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        // Double check email registration on server before sending OTP
        const checkRes = await checkEmailRegistered({ data: { email: cleanEmail } });
        if (checkRes.registered) {
          setEmailStatus("taken");
          setAuthError("Yeh Email ID pehle se registered hai! Direct Login karein.");
          toast.error("Email is already registered! Please sign in.");
          setBusy(false);
          return;
        }

        await sendOtp({ data: { email: cleanEmail, purpose: "signup" } });
      }

      recordFailedDeviceAttempt("otp_resend", cleanEmail);
      setSuccessMsg(`📩 Fresh 6-digit OTP sent to ${cleanEmail}`);
      toast.success(`Fresh OTP code sent!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resend OTP.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center font-sans p-4 sm:p-6 md:p-8 relative selection:bg-[var(--brass)] selection:text-[var(--ink)]">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[var(--brass)]/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <main className="w-full max-w-4xl py-6 flex flex-col items-center my-auto relative z-10">
        {/* Title Header */}
        <div className="text-center mb-6">
          <Link
            to="/"
            title="Go to Home"
            className="inline-flex items-center px-6 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-[rgba(20,17,14,0.12)] shadow-sm hover:scale-105 transition cursor-pointer"
          >
            <BrandLogo size="md" />
          </Link>
        </div>

        {/* Split Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden border border-[rgba(20,17,14,0.12)] shadow-[0_20px_50px_rgba(20,17,14,0.06)] flex flex-col md:flex-row min-h-[520px]"
        >
          {/* LEFT PANEL — INTERACTIVE CHARACTERS (Desktop & Tablet) */}
          <div className="hidden md:block w-full md:w-1/2">
            <InteractiveCharacters mood={mood} />
          </div>

          {/* RIGHT PANEL — LOGIN / SIGNUP FORM OR OTP VERIFICATION STEP */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center bg-white overflow-y-auto">
            <AnimatePresence mode="wait">
              {showOtpStep ? (
                <AnimatedOtpVerification
                  key="otp-step"
                  email={form.email}
                  onVerify={handleVerifyOtpCode}
                  onResend={handleResendOtp}
                  onBack={() => setShowOtpStep(false)}
                  loading={busy}
                  error={authError}
                  successMsg={successMsg}
                />
              ) : (
                <motion.div key="auth-form">
                  {/* Header Icon + Welcome */}
                  <div className="mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[var(--paper)] border border-[rgba(20,17,14,0.12)] flex items-center justify-center mb-3 text-[var(--brass-deep)] font-bold shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>

                    <h2 className="text-2xl font-display font-bold text-[var(--ink)] tracking-tight">
                      {mode === "signin" ? "Welcome back" : "Create account"}
                    </h2>
                  </div>

                  {/* DIRECT GOOGLE AUTHENTICATION BUTTON */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={busy}
                      className="w-full py-3 px-4 bg-white border border-[rgba(20,17,14,0.18)] hover:bg-zinc-50 active:scale-[0.99] font-mono text-xs font-bold text-[#18181B] rounded-full transition shadow-2xs flex items-center justify-center gap-3 cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{mode === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="w-full border-t border-[rgba(20,17,14,0.12)]" />
                      <span className="bg-white px-3 font-mono text-[10px] text-[var(--ink-60)] uppercase tracking-wider absolute">OR EMAIL</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* SIGN UP ONLY: FULL NAME */}
                    {mode === "signup" && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-mono font-bold text-[var(--ink-60)] uppercase tracking-wider">
                            Full Name
                          </label>
                          <span className={`text-[10px] font-mono font-bold ${form.name.length >= 30 ? "text-[var(--caught-coral)]" : "text-[var(--ink-60)]"}`}>
                            {form.name.length}/30
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={30}
                            value={form.name}
                            onFocus={() => setActiveInput("name")}
                            onBlur={() => setActiveInput(null)}
                            onChange={handleNameChange}
                            placeholder="Rakesh Bhai"
                            className="w-full px-3.5 py-2.5 bg-white border-b-2 border-[rgba(20,17,14,0.15)] focus:border-[var(--brass)] text-[var(--ink)] font-medium text-xs focus:outline-none transition placeholder:text-[var(--ink-60)]/40"
                          />
                          <User className="w-4 h-4 text-[var(--ink-60)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                        </div>
                      </div>
                    )}

                    {/* EMAIL FIELD */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-[var(--ink-60)] mb-1 uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={form.email}
                          onFocus={() => setActiveInput("email")}
                          onBlur={() => setActiveInput(null)}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full px-3.5 py-2.5 bg-white border-b-2 border-[rgba(20,17,14,0.15)] focus:border-[var(--brass)] text-[var(--ink)] font-medium text-xs focus:outline-none transition placeholder:text-[var(--ink-60)]/40"
                        />
                        <Mail className="w-4 h-4 text-[var(--ink-60)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                      </div>

                      {/* Live Email Status Badges (Signup Mode) */}
                      {mode === "signup" && form.email.length > 3 && (
                        <div className="mt-1">
                          {emailStatus === "checking" && (
                            <p className="text-[10px] font-mono text-[var(--ink-60)] flex items-center gap-1.5">
                              <span className="w-2 h-2 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
                              Checking email availability...
                            </p>
                          )}
                          {emailStatus === "available" && (
                            <p className="text-[10px] font-mono text-[var(--routed-green)] font-bold flex items-center gap-1">
                              ✓ Email is available
                            </p>
                          )}
                          {emailStatus === "taken" && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2"
                            >
                              <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5 font-mono">
                                ⚠️ Yeh Email ID pehle se registered hai!
                              </p>
                              <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                                Is email address par pehle se account bana hua hai. Direct Sign In karein.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setMode("signin");
                                  setAuthError(null);
                                }}
                                className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                Sign In to this Account <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SIGN UP ONLY: BUSINESS TYPE SELECT */}
                    {mode === "signup" && (
                      <div>
                        <label className="block text-xs font-mono font-bold text-[var(--ink-60)] mb-1 uppercase tracking-wider">
                          Business Type
                        </label>
                        <select
                          value={form.businessType}
                          onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-[rgba(20,17,14,0.15)] rounded-xl text-[var(--ink)] font-medium text-xs focus:outline-none focus:border-[var(--brass)] transition cursor-pointer"
                        >
                          <option value="shop">🛒 Retail / Kirana / Shop</option>
                          <option value="restaurant">🍽️ Restaurant / Tea Stall / Cafe</option>
                          <option value="salon">💇 Salon / Spa / Beauty</option>
                          <option value="clinic">🏥 Clinic / Hospital / Pharmacy</option>
                          <option value="showroom">🚗 Showroom / Jewelry / Services</option>
                        </select>
                      </div>
                    )}

                    {/* PASSWORD FIELD WITH SHOW/HIDE TOGGLE */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-[var(--ink-60)] mb-1 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={8}
                          value={form.password}
                          onFocus={() => setActiveInput("password")}
                          onBlur={() => setActiveInput(null)}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-10 bg-white border-b-2 border-[rgba(20,17,14,0.15)] focus:border-[var(--brass)] text-[var(--ink)] font-medium text-xs focus:outline-none transition placeholder:text-[var(--ink-60)]/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-60)] hover:text-[var(--ink)] p-1 transition"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {/* SIGN UP ONLY: CONFIRM PASSWORD */}
                    {mode === "signup" && (
                      <div>
                        <label className="block text-xs font-mono font-bold text-[var(--ink-60)] mb-1 uppercase tracking-wider">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={form.confirmPassword}
                            onFocus={() => setActiveInput("confirmPassword")}
                            onBlur={() => setActiveInput(null)}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 bg-white border-b-2 border-[rgba(20,17,14,0.15)] focus:border-[var(--brass)] text-[var(--ink)] font-medium text-xs focus:outline-none transition placeholder:text-[var(--ink-60)]/40"
                          />
                        </div>

                        {/* Live Password Match Indicator */}
                        {form.confirmPassword.length > 0 && (
                          form.password === form.confirmPassword ? (
                            <p className="text-[10px] font-mono text-[var(--routed-green)] font-bold mt-1 flex items-center gap-1">
                              ✓ Passwords match
                            </p>
                          ) : (
                            <p className="text-[10px] font-mono text-[var(--caught-coral)] font-bold mt-1 flex items-center gap-1">
                              ⚠️ Passwords do not match
                            </p>
                          )
                        )}
                      </div>
                    )}

                    {/* REMEMBER & FORGOT PASSWORD (Signin Mode) */}
                    {mode === "signin" && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 font-medium text-[var(--ink-60)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="rounded border-[rgba(20,17,14,0.2)] text-[var(--brass)] focus:ring-[var(--brass)] w-3.5 h-3.5 accent-[var(--brass)]"
                          />
                          Remember for 30 days
                        </label>
                        <button
                          type="button"
                          onClick={sendPasswordReset}
                          disabled={resetBusy}
                          className="font-semibold text-[var(--ink-60)] hover:text-[var(--ink)] underline disabled:opacity-50"
                        >
                          {resetBusy ? "Sending..." : "Forgot password?"}
                        </button>
                      </div>
                    )}

                    {/* ERROR ALERT */}
                    {authError && (
                      <div className="p-2.5 bg-rose-950/5 border border-[var(--caught-coral)]/40 rounded-xl text-xs font-bold text-[var(--caught-coral)]">
                        {authError}
                      </div>
                    )}

                    {/* PRIMARY SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={
                        busy ||
                        (mode === "signup" &&
                          (emailStatus === "taken" ||
                            (form.password.length > 0 && !isPasswordStrong) ||
                            (form.confirmPassword.length > 0 && form.password !== form.confirmPassword)))
                      }
                      className="w-full mt-2 py-3 bg-[var(--ink)] text-[var(--paper)] hover:bg-black active:scale-[0.99] font-mono text-xs uppercase tracking-wider font-bold rounded-full transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {busy ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : mode === "signin" ? (
                        <>
                          Sign In <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Send OTP Code <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* SIGN UP / SIGN IN TOGGLE LINK */}
                  <p className="text-center text-xs font-semibold text-[var(--ink-60)] mt-5">
                    {mode === "signin" ? (
                      <>
                        Don't have an account?{" "}
                        <button
                          onClick={() => {
                            setMode("signup");
                            setAuthError(null);
                          }}
                          className="text-[var(--brass-deep)] hover:underline font-bold ml-1"
                        >
                          Sign up for free
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          onClick={() => {
                            setMode("signin");
                            setAuthError(null);
                          }}
                          className="text-[var(--brass-deep)] hover:underline font-bold ml-1"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
