/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  productionBrowserSourceMaps: true,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/widget/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors *; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      },
      {
        source: '/launcher/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\';' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      },
      {
        source: '/api/chatbots/:id/public',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      },
      {
        source: '/widget-loader.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }
        ]
      }
    ];
  }
}

export default nextConfig
