import { MetadataRoute } from 'next';
import { landingAlternates, landingLocaleForPath } from '@/lib/i18n';
import { siteConfig } from '@/lib/siteConfig';

const publicRoutes = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/ar', changeFrequency: 'weekly', priority: 1 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
] as const satisfies ReadonlyArray<{
  path: `/${string}`;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map(({ changeFrequency, path, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    changeFrequency,
    priority,
    ...(landingLocaleForPath(path) !== null && {
      alternates: { languages: { ...landingAlternates } },
    }),
  }));
}
