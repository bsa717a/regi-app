import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Parent dirs may contain unrelated lockfiles; keep tracing rooted here.
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  // FCM looks for `/firebase-messaging-sw.js` at the origin root.
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
};

export default nextConfig;
