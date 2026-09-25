import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { siteConfig } from '@/lib/siteConfig';

describe('public storefront sitemap', () => {
  it('advertises only the public conversion routes', () => {
    expect(sitemap().map(({ url }) => url)).toEqual([
      `${siteConfig.url}/`,
      `${siteConfig.url}/catalog`,
      `${siteConfig.url}/preview`,
      `${siteConfig.url}/support`,
      `${siteConfig.url}/lms/login`,
      `${siteConfig.url}/privacy`,
      `${siteConfig.url}/terms`,
    ]);
  });

  it('allows search and AI crawlers to access public routes', () => {
    const output = robots();

    expect(output.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
    expect(output.rules).toEqual([
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/admin/'] },
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User'],
        allow: '/',
        disallow: ['/admin/', '/api/admin/'],
      },
    ]);
  });
});
