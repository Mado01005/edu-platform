import { LessonResources } from '@/components/course/lesson-resources';
import { mergeCoursePlayerMaterials } from '@/lib/lms/course-player';
import type { CoursePlayerMaterial } from '@/lib/lms/course-player';

export type CourseMaterialItem = CoursePlayerMaterial;

/** @deprecated Use LessonResources with one already-merged material list. */
export function MaterialList({
  courseMaterials,
  lessonMaterials,
}: {
  courseMaterials: CourseMaterialItem[];
  lessonMaterials: CourseMaterialItem[];
}) {
  return (
    <LessonResources
      materials={mergeCoursePlayerMaterials(lessonMaterials, courseMaterials)}
    />
  );
}
