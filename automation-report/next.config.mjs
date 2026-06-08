const isGitHubPagesExport = process.env.BUILD_TARGET === 'github-pages';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  ...(isGitHubPagesExport
    ? {
        output: 'export',
        basePath: '/report',
        assetPrefix: '/report',
        trailingSlash: true
      }
    : {})
};

export default nextConfig;
