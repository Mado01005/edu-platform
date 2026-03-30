import { MetadataRoute } from 'next';
import { getAllSubjects } from '@/lib/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduportal.app';

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  try {
    const subjects = await getAllSubjects();

    for (const subject of subjects) {
      // Add subject page
      routes.push({
        url: `${baseUrl}/subjects/${subject.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // Add lesson pages
      for (const lesson of subject.lessons) {
        routes.push({
          url: `${baseUrl}/subjects/${subject.slug}/${lesson.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch (error) {
    console.error('Sitemap generation error:', error);
  }

  return routes;
}
