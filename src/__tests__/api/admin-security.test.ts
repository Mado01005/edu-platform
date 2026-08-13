/**
 * ADMIN SECURITY TEST SUITE
 * 
 * Tests that all God Mode / admin API endpoints correctly enforce
 * session.user.isAdmin === true before performing any privileged operations.
 * 
 * DATABASE SAFETY: No real database calls are made. Both `@/auth` and 
 * `@/lib/supabase` are fully mocked.
 */

// ── Mock: NextAuth session ──────────────────────────────────────────────
const mockAuth = jest.fn();
const mockRequireLmsRole = jest.fn();
class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}
jest.mock('@/auth', () => ({
  auth: mockAuth,
}));
jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));

// ── Mock: Supabase Admin Client ─────────────────────────────────────────
const mockChain = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  ilike: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
});

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: jest.fn().mockImplementation(mockChain) },
}));

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn().mockImplementation(mockChain) },
}));

// Mock R2
jest.mock('@/lib/r2', () => ({
  r2Client: { send: jest.fn() },
  getPresignedUploadUrl: jest.fn().mockResolvedValue('https://mock.r2/url'),
  getPublicUrl: jest.fn().mockReturnValue('https://mock.cdn/url'),
  deleteR2Object: jest.fn().mockResolvedValue(undefined),
  initiateMultipartUpload: jest.fn().mockResolvedValue('upload-id'),
  getPresignedMultipartPartUrl: jest.fn().mockResolvedValue('https://mock.r2/part'),
  completeMultipartUpload: jest.fn().mockResolvedValue('https://mock.cdn/file'),
  abortMultipartUpload: jest.fn().mockResolvedValue(undefined),
  listAllR2Objects: jest.fn().mockResolvedValue([]),
  batchDeleteR2Objects: jest.fn().mockResolvedValue(undefined),
}));

// Mock constants
jest.mock('@/lib/constants', () => ({
  ADMIN_EMAILS: ['admin@test.com'],
  isMasterAdmin: (email: string) => email === 'admin@test.com',
}));

// Mock validation/errors used by deletion.ts
jest.mock('@/lib/validation', () => ({
  validateDeleteInput: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  extractR2Key: jest.fn().mockReturnValue(null),
  isValidUUID: jest.fn().mockReturnValue(true),
  isValidSlug: jest.fn().mockReturnValue(true),
  isValidDeletionType: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/errors', () => ({
  ApiErrors: {
    UNAUTHORIZED: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    INVALID_INPUT: (e: string[]) => new Response(JSON.stringify({ error: e }), { status: 400 }),
    INTERNAL_ERROR: (m?: string) => new Response(JSON.stringify({ error: m || 'Internal' }), { status: 500 }),
  },
  createSuccessResponse: (d: any) => new Response(JSON.stringify(d), { status: 200 }),
  handleDatabaseError: (e: any) => new Response(JSON.stringify({ error: e.message }), { status: 500 }),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────
import { POST as announcementPost } from '@/app/api/admin/announcement/route';
import { POST as lessonsPost } from '@/app/api/admin/lessons/route';
import { POST as deleteLessonPost } from '@/app/api/admin/delete-lesson/route';
import { POST as renamePost } from '@/app/api/admin/rename/route';
import { POST as usersManagePost } from '@/app/api/admin/users/manage/route';
import { GET as velocityGet } from '@/app/api/admin/velocity/route';
import { GET as storageStatsGet } from '@/app/api/admin/storage-stats/route';
import { GET as activeLoginsGet } from '@/app/api/admin/active-logins/route';
import { GET as rolesGet, POST as rolesPost } from '@/app/api/admin/roles/route';
import { GET as subjectsGet } from '@/app/api/admin/subjects/route';
import { POST as uploadInitiatePost } from '@/app/api/admin/upload-initiate/route';
import { POST as uploadCompletePost } from '@/app/api/admin/upload-complete/route';
import { POST as embedPost } from '@/app/api/admin/embed/route';
import { POST as movePost } from '@/app/api/admin/move/route';
import { POST as moveItemPost } from '@/app/api/admin/move-item/route';
import { POST as purgeContentPost } from '@/app/api/admin/purge-content/route';
import { POST as purgeOrphansPost } from '@/app/api/admin/purge-orphans/route';
import { POST as purgeUnsupportedPost } from '@/app/api/admin/purge-unsupported/route';
import { POST as createFolderPost } from '@/app/api/admin/create-folder/route';
import { GET as focusAnalyticsGet } from '@/app/api/admin/focus-analytics/route';
import { POST as fixHierarchyPost } from '@/app/api/admin/fix-hierarchy/route';
import { POST as deletePost } from '@/app/api/admin/delete/route';
import { POST as deleteItemPost } from '@/app/api/admin/delete-item/route';
import { POST as migrateR2Post } from '@/app/api/admin/migrate-to-r2/route';
import { POST as convertRawPost } from '@/app/api/admin/convert-raw/route';
import { GET as convertRawStatusGet } from '@/app/api/admin/convert-raw/status/route';
import { POST as syncHierarchyPost } from '@/app/api/admin/sync-hierarchy/route';
import { POST as uploadCompleteBatchPost } from '@/app/api/admin/upload-complete-batch/route';
import { POST as uploadMultipartPost } from '@/app/api/admin/upload-multipart/route';
import { GET as telemetryGet } from '@/app/api/admin/telemetry/route';
import { POST as chatPost } from '@/app/api/chat/route';
import { POST as syncStreakPost } from '@/app/api/user/sync-streak/route';
import { GET as topologyGet } from '@/app/api/topology/route';
import { GET as whatsNewGet } from '@/app/api/whats-new/route';
import { POST as supportMessagePost } from '@/app/api/messages/route';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeRequest(body: any = {}, method = 'POST'): Request {
  return new Request('http://localhost:3000/api/admin/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

const NON_ADMIN_SESSION = {
  user: {
    email: 'student@university.edu',
    name: 'Test Student',
    isAdmin: false,
    isSuperAdmin: false,
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

// ── Tests ───────────────────────────────────────────────────────────────

describe('🔒 Admin API Security Gate — Non-admin user blocked from all routes', () => {

  beforeEach(() => {
    mockAuth.mockResolvedValue(NON_ADMIN_SESSION);
    mockRequireLmsRole.mockRejectedValue(new MockLmsAuthError('Unauthorized'));
  });

  it('POST /api/admin/announcement → 401', async () => {
    const res = await announcementPost(makeRequest({ title: 'hack', message: 'xss' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/lessons → 401', async () => {
    const res = await lessonsPost(makeRequest({ title: 'Fake', subjectId: '123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/delete-lesson → 401', async () => {
    const res = await deleteLessonPost(makeRequest({ lessonId: 'abc-123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/rename → 401', async () => {
    const res = await renamePost(makeRequest({ type: 'subject', id: 'x', name: 'hacked' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/users/manage → 401', async () => {
    const res = await usersManagePost(makeRequest({ targetEmail: 'victim@test.com', action: 'BAN_USER' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/velocity → 401', async () => {
    const res = await velocityGet();
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/storage-stats → 401', async () => {
    const res = await storageStatsGet();
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/active-logins → 401', async () => {
    const res = await activeLoginsGet();
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/roles → 401', async () => {
    const res = await rolesGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/roles → 401', async () => {
    const res = await rolesPost(makeRequest({ email: 'test@test.com', overrideRole: 'superadmin' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/subjects → 401', async () => {
    const res = await subjectsGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/upload-initiate → 401', async () => {
    const res = await uploadInitiatePost(makeRequest({ fileName: 'malware.zip', subjectSlug: 't', lessonSlug: 't' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/upload-complete → 401', async () => {
    const res = await uploadCompletePost(makeRequest({ path: '/test', lessonId: '123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/embed → 401', async () => {
    const res = await embedPost(makeRequest({ lessonId: '123', name: 'test', url: 'http://evil.com' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/move → 401', async () => {
    const res = await movePost(makeRequest({ type: 'lesson', id: '1', targetId: '2' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/move-item → 401', async () => {
    const res = await moveItemPost(makeRequest({ itemId: '1', targetParentId: '2' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/purge-content → 401', async () => {
    const res = await purgeContentPost(makeRequest({ lessonId: '123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/purge-orphans → 401', async () => {
    const res = await purgeOrphansPost(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/purge-unsupported → 401', async () => {
    const res = await purgeUnsupportedPost();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/create-folder → 401', async () => {
    const res = await createFolderPost(makeRequest({ name: 'hacked', lessonId: '1' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/focus-analytics → 401', async () => {
    const res = await focusAnalyticsGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/fix-hierarchy → 401', async () => {
    const res = await fixHierarchyPost(makeRequest({ subjectId: '1' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/delete (via handleDeletion) → 401', async () => {
    const res = await deletePost(makeRequest({ type: 'subject', id: 'uuid-123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/delete-item (via handleDeletion) → 401', async () => {
    const res = await deleteItemPost(makeRequest({ itemId: 'uuid-123' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/migrate-to-r2 → 401', async () => {
    const res = await migrateR2Post();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/convert-raw → 401', async () => {
    const res = await convertRawPost(makeRequest({ url: 'https://mock.cdn/raw.dng' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/convert-raw/status → 401', async () => {
    const res = await convertRawStatusGet(
      new Request('http://localhost:3000/api/admin/convert-raw/status?jobId=test'),
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/sync-hierarchy → 401', async () => {
    const res = await syncHierarchyPost(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/upload-complete-batch → 401', async () => {
    const res = await uploadCompleteBatchPost(makeRequest({ files: [] }));
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/upload-multipart → 401', async () => {
    const res = await uploadMultipartPost(makeRequest({ action: 'initiate' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/telemetry → 401', async () => {
    const res = await telemetryGet();
    expect(res.status).toBe(401);
  });
});

describe('🔒 Unauthenticated (null session) user blocked', () => {

  beforeEach(() => {
    mockAuth.mockResolvedValue(null);
    mockRequireLmsRole.mockRejectedValue(new MockLmsAuthError('Unauthorized'));
  });

  it('GET /api/admin/velocity → 401', async () => {
    const res = await velocityGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/users/manage → 401', async () => {
    const res = await usersManagePost(makeRequest({ targetEmail: 'test@test.com', action: 'BAN_USER' }));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/roles → 401', async () => {
    const res = await rolesGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/chat → 401', async () => {
    const res = await chatPost(
      new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/user/sync-streak → 401', async () => {
    const res = await syncStreakPost(
      makeRequest({ localDate: '2026-07-23' }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/topology → 401', async () => {
    const res = await topologyGet();
    expect(res.status).toBe(401);
  });

  it('GET /api/whats-new → 401', async () => {
    const res = await whatsNewGet();
    expect(res.status).toBe(401);
  });

  it('POST /api/messages → 401', async () => {
    const res = await supportMessagePost(
      makeRequest({ subject: 'Help', body: 'Question' }),
    );
    expect(res.status).toBe(401);
  });
});

describe('Admin telemetry LMS session compatibility', () => {
  it('accepts a verified Supabase LMS administrator session', async () => {
    mockAuth.mockResolvedValue(null);
    mockRequireLmsRole.mockResolvedValue({ id: 'admin_1', role: 'ADMIN' });

    const response = await telemetryGet();

    expect(response.status).toBe(200);
    expect(mockRequireLmsRole).toHaveBeenCalled();
  });
});

describe('Tutor request validation', () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    mockAuth.mockResolvedValue({
      user: { email: 'student@test.com', isAdmin: false },
    });
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    }
  });

  it('rejects an oversized tutor request before calling the provider', async () => {
    const res = await chatPost(
      new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'content-length': String(7 * 1024 * 1024) },
        body: '{}',
      }),
    );
    expect(res.status).toBe(413);
  });

  it('rejects invalid tutor roles and empty messages', async () => {
    const res = await chatPost(
      new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'system', content: '' }],
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
