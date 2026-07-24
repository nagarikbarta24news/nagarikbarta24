import path from "path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";

const REQUIRED_VITE_ENV = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SITE_URL",
] as const;

const ENV_DEFAULTS: Record<string, string> = {
  VITE_SITE_URL: "https://nagarikbarta24.com",
};

function envCheckPlugin(env: Record<string, string>) {
  return {
    name: "nb24:required-env-check",
    apply: "build" as const,
    enforce: "pre" as const,
    buildStart() {
      const missing = REQUIRED_VITE_ENV.filter((k) => {
        const v = env[k] ?? process.env[k] ?? ENV_DEFAULTS[k];
        return !v || String(v).trim() === "";
      });
      if (missing.length > 0) {
        const msg =
          `\n\n❌ Build aborted: missing required environment variable(s):\n` +
          missing.map((k) => `  - ${k}`).join("\n") +
          `\n\nSet them in your .env (client-exposed vars must be prefixed with VITE_).\n`;
        throw new Error(msg);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, serverEnv);

  return {

    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    tanstackStart: {
      server: { entry: "server" },
    },
    vite: {
      plugins: [
        envCheckPlugin(serverEnv),
        mcpPlugin(),

        VitePWA({
          registerType: "autoUpdate",
          injectRegister: null,
          filename: "sw.js",
          devOptions: { enabled: false },
          manifest: false,
          workbox: {
            navigateFallback: null,
            navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
            runtimeCaching: [
              {
                urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
                handler: "NetworkFirst",
                options: {
                  cacheName: "html-pages",
                  networkTimeoutSeconds: 4,
                  expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
                },
              },
              {
                urlPattern: ({ request }: { request: Request }) => request.destination === "image",
                handler: "StaleWhileRevalidate",
                options: {
                  cacheName: "media-images",
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
                },
              },
              {
                urlPattern: ({ url }: { url: URL }) =>
                  url.pathname.includes("/storage/v1/") || url.pathname.startsWith("/__l5e/"),
                handler: "StaleWhileRevalidate",
                options: {
                  cacheName: "remote-media",
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
                },
              },
            ],
          },
        }),
      ],
    },
  };
});
