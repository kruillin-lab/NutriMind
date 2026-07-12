import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.NUTRIMIND_DESKTOP === "1" ? ".next-desktop" : ".next",
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
