/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cabeceras de seguridad básicas. Monaco carga desde jsDelivr, por eso no se define una CSP estricta aquí.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
