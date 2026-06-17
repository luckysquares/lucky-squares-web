/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', '@sparticuz/chromium', 'puppeteer-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yymppdzohiekzmjlbdqx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Serve modern formats (AVIF/WebP) and limit the device-size ladder
    // so Next.js doesn't generate unnecessarily large variants.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
    imageSizes:  [32, 64, 128, 176, 256],
  },
  experimental: {
    // Inline critical CSS to eliminate the render-blocking CSS chain that
    // Lighthouse flags as adding ~500 ms to the critical path on mobile.
    optimizeCss: true,
  },
  async redirects() {
    return [
      {
        source:      '/blog/lucky-squares-australia-website-enters-beta-testing',
        destination: '/blog/lucky-squares-australia-pre-launch',
        permanent:   true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
