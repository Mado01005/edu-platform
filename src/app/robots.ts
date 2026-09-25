import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  const publicRules = {
    allow: '/',
    disallow: ['/admin/', '/api/admin/'],
  };

  return {
    rules: [
      { userAgent: '*', ...publicRules },
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User'],
        ...publicRules,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
