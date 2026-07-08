import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "cdn.humangrowth.app" },
    ],
  },
  // La página de ciencia se renombró a /metodo (El Método). Redirect a nivel de
  // routing (edge, 308) — más robusto que un redirect() de página, que bajo
  // static generation en Vercel devolvía un 307 sin Location (__next_error__).
  async redirects() {
    return [
      { source: "/ciencia", destination: "/metodo", permanent: true },
      // web-v3 decisión A: Blog vive dentro de Perspectivas (CMS content type).
      { source: "/blog", destination: "/perspectivas", permanent: true },
    ];
  },
};

export default nextConfig;
