# Role-Based LMS Setup

The LMS is additive to the existing EduPortal application. Existing NextAuth
routes continue to work, while the new course catalog, teacher studio, lesson
player, and live-class routes use Supabase Auth cookies and Prisma.

## 1. Environment

Copy the LMS variables from `.env.example` into `.env.local` and Vercel.

- `DATABASE_URL` must use the Supabase transaction pooler on port `6543`.
- `DIRECT_URL` must use the direct database connection on port `5432`.
- Keep the R2 access key and secret server-only.
- `R2_PUBLIC_URL` must be the public or custom domain used for lesson playback.

## 2. Database and roles

Apply `supabase/migrations/20260723185942_lms_role_based_schema.sql` through the
Supabase CLI or SQL migration pipeline. It creates the Prisma-compatible LMS
tables, the Auth profile trigger, indexes, grants, and row-level security
policies.

New Supabase Auth users start as students. Promote a teacher with a trusted
administrative SQL session:

```sql
update public.lms_users
set role = 'TEACHER', updated_at = now()
where email = 'teacher@example.com';
```

Do not put role data in user-editable `user_metadata`. Authorization reads the
role from `public.lms_users`.

Configure the Supabase Google provider, if used, with this callback:

```text
https://YOUR_APP_DOMAIN/auth/callback
```

Also add `http://localhost:3000/auth/callback` for local development.

## 3. Cloudflare R2

Apply `cloudflare/r2-cors.json` to the R2 bucket after replacing the placeholder
production domain. The presigned upload endpoint is:

```text
POST /api/upload/r2
```

Only teachers and admins can request URLs. Uploads are restricted to PDF, MP4,
WebM, and QuickTime content types, use randomized object keys, and expire after
15 minutes. The browser must send the returned `requiredHeaders` unchanged.

## 4. Main routes

- `/dashboard` — Supabase users see enrolled courses, completion, and live classes.
- `/catalog` — published course catalog and enrollment.
- `/courses/[courseId]/learn/lessons/[lessonId]` — video, resources, progress, and Q&A.
- `/live-classes` — upcoming Zoom sessions.
- `/teacher/courses` — teacher course list.
- `/teacher/courses/[courseId]/edit` — curriculum, R2 uploads, and Zoom scheduler.
- `/lms/login` — Supabase password or Google sign-in.

## 5. Verification

```bash
npm install
npm run db:validate
npm run build
npx jest --config jest.config.ts --runInBand \
  src/__tests__/api/lms-upload-and-video.test.ts
```

The migration must be applied before the LMS routes are deployed. This
repository does not store database passwords, so either configure
`DATABASE_URL` and `DIRECT_URL` or connect the target Supabase project to the
database migration workflow first.
