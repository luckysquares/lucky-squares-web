export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/betatest'],
      },
    ],
    sitemap: 'https://luckysquares.com.au/sitemap.xml',
  };
}
