import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { WhatsAppButton } from "@/components/WhatsAppButton";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdf6ef] px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          This page didn't load
        </h1>
        <p className="text-xs text-zinc-600">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        {error?.message && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-left overflow-x-auto">
            <p className="font-mono text-[11px] text-red-700 font-bold">Error Details:</p>
            <p className="font-mono text-[11px] text-red-600 mt-1 break-words">{error.message}</p>
          </div>
        )}

        <div className="pt-2 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
              else {
                router.invalidate();
                reset();
              }
            }}
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-800 cursor-pointer shadow-xs"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/15 bg-white px-5 py-2.5 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-50 cursor-pointer shadow-2xs"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#F7F1E4" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "IntellectFlow - Google Review Automation for Indian Businesses" },
      { name: "description", content: "Aap Dukaan Chalao, Google Hum Sambhalenge. QR to Google Review full automation. Rs 55,500/mo tools at Rs 299/mo. Trusted by 500+ businesses." },
      { name: "author", content: "IntellectFlow" },
      { property: "og:title", content: "IntellectFlow - Google Review Automation for Indian Businesses" },
      { property: "og:description", content: "Aap Dukaan Chalao, Google Hum Sambhalenge. QR to Google Review full automation. Rs 55,500/mo tools at Rs 299/mo. Trusted by 500+ businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@IntellectFlow" },
      { name: "twitter:title", content: "IntellectFlow - Google Review Automation for Indian Businesses" },
      { name: "twitter:description", content: "Aap Dukaan Chalao, Google Hum Sambhalenge. QR to Google Review full automation. Rs 55,500/mo tools at Rs 299/mo. Trusted by 500+ businesses." },
      // TODO: add your own 1200x630 social-share image here, e.g. "/og-image.png" in /public
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=IBM+Plex+Mono:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=Inter:ital,wght@0,400..800;1,400..800&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "shortcut icon", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <WhatsAppButton />
    </QueryClientProvider>
  );
}
