import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Plain, self-hosted Vite config for TanStack Start.
// Builds a normal Node server (via Nitro's "node-server" preset) so you can
// run it with `node .output/server/index.mjs` on any VPS / Docker host,
// instead of the Cloudflare Workers target that Lovable used.
export default defineConfig(({ command }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Only needed for `vite build` — dev server doesn't need Nitro.
    // inlineDynamicImports avoids a chunk-splitting issue where TanStack
    // Start's isomorphic createMiddleware() ends up split across chunks
    // in a way that breaks at runtime ("createMiddleware is not a
    // function") — bundling everything into one file sidesteps it.
    command === "build" ? nitro({ preset: (process.env.NITRO_PRESET as any) || "node-server", inlineDynamicImports: true }) : undefined,
    viteReact(),
  ],
}));
