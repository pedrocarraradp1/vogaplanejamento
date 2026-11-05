/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      jspdf: "jspdf/dist/jspdf.es.min.js",
    },
  },
}

export default nextConfig
