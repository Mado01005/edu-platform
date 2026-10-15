import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { siteConfig } from '@/lib/siteConfig';

describe('public storefront sitemap', () => {
  it('advertises only the public conversion routes', () => {
    expect(sitemap().map(({ url }) => url)).toEqual([
      `${siteConfig.url}/`,
      `${siteConfig.url}/ar`,
      `${siteConfig.url}/support`,
      `${siteConfig.url}/privacy`,
      `${siteConfig.url}/terms`,
    ]);
  });

  it('links the English and Arabic landing pages with hreflang alternates', () => {
    const languages = {
      en: `${siteConfig.url}/`,
      ar: `${siteConfig.url}/ar`,
      'x-default': `${siteConfig.url}/`,
    };
    const entries = sitemap();

    expect(entries[0].alternates).toEqual({ languages });
    expect(entries[1].alternates).toEqual({ languages });
    expect(entries[2].alternates).toBeUndefined();
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
