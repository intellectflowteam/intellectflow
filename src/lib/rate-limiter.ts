/**
 * Rate Limiter utility for device-level and email-level attempt locking.
 * Enforces max 5 failed attempts per 30 minutes for Login, Registration & OTP Resend.
 * Completely silent in UI until the limit is exceeded.
 */

const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_ATTEMPTS = 5;

type ActionType = "login" | "signup" | "otp_resend";

interface LockData {
  attempts: number;
  lockUntil: number | null;
}

function getStorageKey(action: ActionType, key?: string): string {
  const cleanKey = (key || "device").toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `if_rl_${action}_${cleanKey}`;
}

export function checkDeviceLock(action: ActionType, key?: string): { isLocked: boolean; remainingMinutes: number } {
  if (typeof window === "undefined") return { isLocked: false, remainingMinutes: 0 };

  const storageKey = getStorageKey(action, key);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { isLocked: false, remainingMinutes: 0 };

    const data: LockData = JSON.parse(raw);
    if (data.lockUntil && Date.now() < data.lockUntil) {
      const remainingMinutes = Math.ceil((data.lockUntil - Date.now()) / (60 * 1000));
      return { isLocked: true, remainingMinutes: Math.max(1, remainingMinutes) };
    }

    // Lock has expired — reset
    if (data.lockUntil && Date.now() >= data.lockUntil) {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // If storage is disabled or corrupted, fail open safely
  }

  return { isLocked: false, remainingMinutes: 0 };
}

export function recordFailedDeviceAttempt(action: ActionType, key?: string): { isLocked: boolean; remainingMinutes: number } {
  if (typeof window === "undefined") return { isLocked: false, remainingMinutes: 0 };

  const storageKey = getStorageKey(action, key);
  try {
    const raw = localStorage.getItem(storageKey);
    let data: LockData = raw ? JSON.parse(raw) : { attempts: 0, lockUntil: null };

    // If lock was active and expired, reset attempts count
    if (data.lockUntil && Date.now() >= data.lockUntil) {
      data = { attempts: 0, lockUntil: null };
    }

    data.attempts += 1;

    if (data.attempts >= MAX_ATTEMPTS) {
      data.lockUntil = Date.now() + LOCK_DURATION_MS;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { isLocked: true, remainingMinutes: 30 };
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // Storage fallback
  }

  return { isLocked: false, remainingMinutes: 0 };
}

export function clearDeviceAttempts(action: ActionType, key?: string): void {
  if (typeof window === "undefined") return;
  const storageKey = getStorageKey(action, key);
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore
  }
}
