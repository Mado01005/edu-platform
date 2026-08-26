import sitemap from '@/app/sitemap';

describe('public storefront sitemap', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      return;
    }

    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('advertises only the public conversion routes', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://oqool.example';

    expect(sitemap().map(({ url }) => url)).toEqual([
      'https://oqool.example/',
      'https://oqool.example/catalog',
      'https://oqool.example/preview',
      'https://oqool.example/lms/login',
      'https://oqool.example/privacy',
      'https://oqool.example/terms',
    ]);
  });
});
