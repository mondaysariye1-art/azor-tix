import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const allowedPreviewHosts = (() => {
  const hosts = new Set<string>([
    '*.run.app',
    '**.run.app',
    '*.europe-west2.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
  ])
  const rawSources = [
    process.env.FIGMA_PUBLIC_URL,
    process.env.APP_URL,
    ...(process.env.NG_ALLOWED_HOSTS ? process.env.NG_ALLOWED_HOSTS.split(',') : []),
  ]

  for (const entry of rawSources) {
    if (!entry || !entry.trim()) continue
    const trimmed = entry.trim()
    try {
      const host = trimmed.includes('://') ? new URL(trimmed).host : trimmed
      if (host) {
        hosts.add(host)
        if (host.startsWith('ais-dev-')) {
          hosts.add(host.replace(/^ais-dev-/, 'ais-pre-'))
        }
      }
    } catch {
      // Ignore malformed origin entries
    }
  }

  return Array.from(hosts)
})()

const nextConfig: NextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './figma-image-loader.ts',
  },
  // Don't block publishing or preview deploys on errors if the emitted JS is valid
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow Make & AI Studio preview proxy origins for `/_next/*` dev chunks, HMR, and Server Actions.
  allowedDevOrigins: allowedPreviewHosts,
  // Prerender source maps add ~100 MB per static build worker
  enablePrerenderSourceMaps: false,
  experimental: {
    agentUpgrade: 'security',
    // Caps static build workers (~250-380 MB each) to lower `next build` peak memory
    cpus: 2,
    serverActions: {
      allowedOrigins: allowedPreviewHosts,
    },
  },
  env: {
    NEXT_PUBLIC_SITE_URL:
      process.env.FIGMA_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3000',
    // NOTE: Do not add FIGMA_OAUTH_CLIENT_SECRET, FIGMA_CONTENT_API_ACCESS_KEY,
    // or any other credential here. Values placed in `env` are inlined into
    // the JavaScript bundle by Next.js at build time and become readable by
    // anyone who can load the app's client assets. Server-side code
    // (payload.config.ts, route handlers, server components) can still read
    // these values from `process.env.*` without declaring them here. Only
    // public, non-secret values that explicitly need to be available in
    // browser code should be added - and those should use the `NEXT_PUBLIC_*`
    // naming convention.
    FIGMA_CONTENT_API_CONTENT_SYSTEM_ID: process.env.FIGMA_CONTENT_API_CONTENT_SYSTEM_ID,
    FIGMA_CONTENT_API_URL: process.env.FIGMA_CONTENT_API_URL,
    FIGMA_OAUTH_CLIENT_ID: process.env.FIGMA_OAUTH_CLIENT_ID,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
