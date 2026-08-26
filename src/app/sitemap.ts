import { MetadataRoute } from 'next';

const publicRoutes = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/catalog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/preview', changeFrequency: 'daily', priority: 0.8 },
  { path: '/lms/login', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
] as const satisfies ReadonlyArray<{
  path: `/${string}`;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.edu-platform.me';
  const lastModified = new Date();

  return publicRoutes.map(({ changeFrequency, path, priority }) => ({
    url: new URL(path, baseUrl).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
