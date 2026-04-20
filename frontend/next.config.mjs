/** @type {import('next').NextConfig} */
const nextConfig = {
  // FastAPI 서버로 API 요청을 프록시 → CORS 문제 없이 호출 가능
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_BASE_URL ?? 'http://localhost:8000'}/api/v1/:path*`,
      },
      {
        source: '/api/wiki-export',
        destination: `${process.env.WIKI_EXPORT_API_BASE_URL ?? 'http://localhost:8010'}/api/v1/wiki-export`,
      },
      {
        source: '/api/wiki-export/jobs',
        destination: `${process.env.WIKI_EXPORT_API_BASE_URL ?? 'http://localhost:8010'}/api/v1/wiki-export/jobs`,
      },
      {
        source: '/api/wiki-export/jobs/:path*',
        destination: `${process.env.WIKI_EXPORT_API_BASE_URL ?? 'http://localhost:8010'}/api/v1/wiki-export/jobs/:path*`,
      },
    ]
  },
}

export default nextConfig
