/**
 * Production intentionally has no default content seed.
 *
 * Keep this command as an explicit no-op so `prisma db seed` can be run safely
 * without recreating demo users, subjects, courses, lessons, or enrollments.
 */
async function main() {
  console.info(
    'No default LMS seed is configured. Create subjects and courses from the admin workspace.',
  );
}

main().catch((error: unknown) => {
  console.error('Seed command failed.', error);
  process.exitCode = 1;
});
