import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/clientes/novo', destination: '/clientes?acao=novo', permanent: false },
      { source: '/oportunidades/nova', destination: '/oportunidades?acao=nova', permanent: false },
      { source: '/atividades/nova', destination: '/atividades?acao=nova', permanent: false },
    ]
  },
};

export default nextConfig;
