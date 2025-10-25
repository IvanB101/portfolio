import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  compiler: {
    define: {
      Float16Array: "{}",
    },
  },
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
