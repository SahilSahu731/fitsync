import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ] }];
  },
};
export default nextConfig;
