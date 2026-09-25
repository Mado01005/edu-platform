import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { siteConfig } from '@/lib/siteConfig';

describe('public storefront sitemap', () => {
  it('advertises only the public conversion routes', () => {
    expect(sitemap().map(({ url }) => url)).toEqual([
      `${siteConfig.url}/`,
      `${siteConfig.url}/support`,
    ]);
  });

  it('allows search and AI crawlers to access public routes', () => {
    const output = robots();

    expect(output.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
    expect(output.rules).toEqual([
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'Perplexity-User',
          'ClaudeBot',
          'Google-Extended',
          'Applebot',
          '*',
        ],
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ]);
  });
});
