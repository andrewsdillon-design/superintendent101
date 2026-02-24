/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // Allow uploads from local filesystem in production
  images: {
    domains: ['localhost'],
  },
}
