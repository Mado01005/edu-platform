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

Apply all versioned migrations with `npx supabase db push`. They create the
Prisma-compatible LMS tables, Auth profile trigger, indexes, grants, invariant
triggers, and row-level security configuration.

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
production domain. The presigned upload endpoints are:

```text
POST /api/upload/r2
POST /api/checkout/upload
```

Teacher/admin content uploads are restricted to PDF and supported video types.
Course and lesson attachments accept PDF, Word, PowerPoint, Excel, and ZIP files
up to 100 MB. The browser uploads directly to R2, then registers the verified
object through `POST /api/lms/materials`; authorized downloads use the
short-lived `/api/lms/materials/[materialId]/download` route.
Authenticated students may request private JPG, PNG, or WebP receipt uploads up
to 8 MB. All object keys are randomized, checkout URLs expire after 10 minutes,
and the browser must send the returned `Content-Type` header unchanged.

## 4. Main routes

- `/dashboard` — Supabase users see enrolled courses, completion, and live classes.
- `/catalog` — published catalog and online checkout.
- `/courses/[courseId]/learn/lessons/[lessonId]` — video, resources, progress, and Q&A.
- `/live-classes` — upcoming Zoom sessions.
- `/mps` — PIN-protected parent activity, grades, subscriptions, and invoices.
- `/accounting` — private receipt approval and payment-channel configuration.
- `/teacher/courses` — teacher course list.
- `/teacher/courses/[courseId]/edit` — curriculum, course and lesson materials,
  R2 uploads, and Zoom scheduler.
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
