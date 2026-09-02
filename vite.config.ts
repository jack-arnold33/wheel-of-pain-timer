import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const productionContentSecurityPolicy = {
  name: 'production-content-security-policy',
  apply: 'build' as const,
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob:",
          "media-src 'self' blob:",
          "connect-src 'self' https://api.openai.com",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; '),
      },
      injectTo: 'head-prepend' as const,
    },
  ],
}

export default defineConfig({
  base: '/wheel-of-pain-timer/',
  plugins: [
    productionContentSecurityPolicy,
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{css,html,ico,js,png,svg,wav,woff2}'],
      },
      manifest: {
        name: 'Wheel of Pain Timer',
        short_name: 'Wheel of Pain',
        description: 'A local-first garage circuit workout timer.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#15110f',
        theme_color: '#15110f',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
