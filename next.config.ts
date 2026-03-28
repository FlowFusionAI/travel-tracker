import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // p-queue v7 and its deps are pure-ESM. transpilePackages ensures Next.js
  // Webpack (used in production builds) can bundle them correctly.
  transpilePackages: ['p-queue', 'p-timeout', 'eventemitter3'],
}

export default nextConfig
