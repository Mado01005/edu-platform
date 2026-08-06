import { redirect } from 'next/navigation';

export default async function LegacyCourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  redirect(`/teacher/courses/${courseId}`);
}
