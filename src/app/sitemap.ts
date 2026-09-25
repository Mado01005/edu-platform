import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

const publicRoutes = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.8 },
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
  }));
}
