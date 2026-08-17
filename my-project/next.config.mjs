/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/soluciones/guigna", destination: "/aplicaciones/recepcion", permanent: true },
      { source: "/soluciones/plancus", destination: "/aplicaciones/proceso", permanent: true },
      { source: "/soluciones/culpaeus", destination: "/aplicaciones/terreno", permanent: true },
      { source: "/soluciones", destination: "/aplicaciones", permanent: true },
      { source: "/soluciones/:slug*", destination: "/aplicaciones", permanent: true },
    ];
  },
};

export default nextConfig;
