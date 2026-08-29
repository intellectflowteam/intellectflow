import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, RefreshCw, Mail, ShieldCheck } from "lucide-react";

interface Props {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error?: string | null;
  successMsg?: string | null;
}

export function AnimatedOtpVerification({
  email,
  onVerify,
  onResend,
  onBack,
  loading,
  error,
  successMsg,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 30-second Countdown Timer
  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    // Take the last entered character if multiple typed
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !loading) {
      handleComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;

    const newDigits = pasted.split("");
    setDigits(newDigits);
    inputRefs.current[5]?.focus();
    handleComplete(pasted);
  };

  const handleComplete = async (code: string) => {
    try {
      await onVerify(code);
      setIsSuccess(true);
    } catch {
      setIsSuccess(false);
    }
  };

  const handleResendClick = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimer(30);
    await onResend();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-white rounded-3xl border border-[rgba(20,17,14,0.12)] p-6 sm:p-8 shadow-xl text-center relative overflow-hidden"
    >
      {/* Header Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-xs font-mono text-[var(--ink-60)] hover:text-[var(--ink)] flex items-center gap-1 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Top Icon Badge */}
      <div className="w-12 h-12 rounded-2xl bg-[var(--paper)] border border-[rgba(20,17,14,0.12)] flex items-center justify-center mx-auto mb-4 text-[var(--brass-deep)] shadow-2xs">
        {isSuccess ? (
          <CheckCircle2 className="w-6 h-6 text-[var(--routed-green)]" />
        ) : (
          <ShieldCheck className="w-6 h-6 text-[var(--brass-deep)]" />
        )}
      </div>

      <h3 className="font-display font-bold text-2xl text-[var(--ink)] tracking-tight">
        {isSuccess ? "Email Verified!" : "Enter 6-Digit OTP"}
      </h3>

      <p className="text-xs text-[var(--ink-60)] mt-1.5 leading-relaxed max-w-xs mx-auto">
        We've sent a 6-digit verification code to: <br />
        <strong className="text-[var(--ink)] font-mono font-bold">{email}</strong>
      </p>

      {/* Success Animation Banner */}
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="my-6 p-4 rounded-2xl bg-emerald-950/5 border border-[var(--routed-green)]/30 text-emerald-800 text-xs font-bold font-mono flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[var(--routed-green)]" />
          Verification complete! Redirecting...
        </motion.div>
      ) : (
        <>
          {/* 6-Digit Pin Input Grid */}
          <div className="my-6 flex justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading || isSuccess}
                className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-mono font-bold rounded-xl border-2 transition outline-none bg-white ${
                  digit
                    ? "border-[var(--brass)] text-[var(--ink)] shadow-2xs"
                    : "border-[rgba(20,17,14,0.15)] text-[var(--ink)] focus:border-[var(--brass)]"
                }`}
              />
            ))}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-2.5 bg-rose-950/5 border border-[var(--caught-coral)]/30 rounded-xl text-xs font-bold text-[var(--caught-coral)]">
              {error}
            </div>
          )}

          {successMsg && !error && (
            <div className="mb-4 p-2.5 bg-emerald-950/5 border border-[var(--routed-green)]/30 rounded-xl text-xs font-bold text-[var(--routed-green)]">
              {successMsg}
            </div>
          )}

          {/* Resend Timer & Button */}
          <div className="mt-4 pt-4 border-t border-[rgba(20,17,14,0.08)] flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--ink-60)]">
              Didn't receive code?
            </span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResendClick}
                className="font-bold text-[var(--brass-deep)] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Resend OTP
              </button>
            ) : (
              <span className="text-[var(--ink-60)] font-bold">
                Resend in {timer}s
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
