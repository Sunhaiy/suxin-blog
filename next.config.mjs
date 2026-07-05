import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: false,
    // 只用 WebP：本机 CPU 较弱，AVIF 冷转码要 4~9s 严重拖慢首屏；WebP 约 1s 且体积相近
    formats: ['image/webp'],
    // 优化后的图片缓存一年，减少重复转码
    minimumCacheTTL: 31536000,
  },
  // Next.js 15: serverComponentsExternalPackages 已提升为顶层配置
  serverExternalPackages: ['pg', 'sharp', 'exifr', 'node-cron'],
  async headers() {
    return [
      {
        // 切片字体长缓存（public 目录默认不长缓存）
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
        ],
      },
    ]
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'pg-native': false,
    }

    return config
  },
}

export default nextConfig
