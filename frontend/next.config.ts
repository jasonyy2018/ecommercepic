import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产 Docker 镜像使用多阶段构建 + 精简运行时（见 frontend/Dockerfile）
  output: "standalone",
};

export default nextConfig;
