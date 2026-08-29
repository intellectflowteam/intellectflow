// Generic client-side error reporter (was tied to Lovable's editor telemetry).
// Plug in your own service here (Sentry, PostHog, etc.) whenever you're ready —
// for now it just logs to the console so nothing silently disappears.
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[client-error]", message, { context, error });
}
