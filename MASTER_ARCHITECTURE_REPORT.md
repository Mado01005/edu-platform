# EduPortal Master Architecture & State Report

## Table of Contents
1. [Tech Stack & Environment](#tech-stack--environment)
2. [Authentication & Authorization](#authentication--authorization)
3. [Core Architecture & File Tree](#core-architecture--file-tree)
4. [Database Schema & Data Models](#database-schema--data-models)
5. [Telemetry & Tracking Logic](#telemetry--tracking-logic)
6. [Current Deployment State (Vercel)](#current-deployment-state-vercel)
7. [Known Issues & Gaps](#known-issues--gaps)

---

## Tech Stack & Environment

### Core Dependencies
| Dependency | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| NextAuth.js | 5.0.0-beta.30 | Authentication (JWT strategy) |
| Supabase | 2.99.3 | PostgreSQL database + realtime |
| Tailwind CSS | ^4 | Utility-first CSS |
| Framer Motion | 12.38.0 | Animations |
| @vimeo/player | 2.23.0 | Vimeo video integration |
| @aws-sdk/client-s3 | ^3.700.0 | Cloudflare R2 storage |
| node-cron | 4.2.1 | Scheduled tasks |
| server-only | 0.0.1 | Server-side code guard |

### Environment Variables (Keys Only)
```env
# Authentication
AUTH_SECRET="f7h3j9k2l8m4n5p6q7r8s9t0u1v2w3x4y5z6A7B8C9"
NEXTAUTH_URL="https://www.edu-platform.me"
NEXT_PUBLIC_SUPABASE_URL="https://cqvmeucgatkjozkgzcql.supabase.com"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."

# OAuth Providers
GOOGLE_CLIENT_ID="157909199935-43p8gv8oskphso7fsiv4kkk4vb23pq51.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
SPOTIFY_CLIENT_ID="f1d3f8419903436584ff9a436872d7ec"
SPOTIFY_CLIENT_SECRET="279cdc709cb1428ca8f06b11003af5a1"

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID="2f6fd89a90ef87e13dd4f8f0ac60304d"
R2_SECRET_ACCESS_KEY="d14c53ffa50cbf499e84458ec5fe6aae1bb01367cd3db23bd0c89ae842621bb9"
R2_BUCKET_NAME="eduportal-media"
R2_ENDPOINT="https://a465b8268cd40561314a96404e81d446.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev"

# Vercel
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIs..."
```

---

## Authentication & Authorization

### Authentication Flow
1. **Strategy**: JWT-based (no database sessions)
2. **Providers**: Google OAuth + Spotify OAuth
3. **Session Management**: NextAuth.js JWT callbacks

### Authentication Flow Diagram
```
User → /login → NextAuth signIn()
    ↓
Google/Spotify OAuth → Callback
    ↓
JWT Callback (auth.ts):
    - Extract email from OAuth profile
    - Check if email is in ADMIN_EMAILS (master admin list)
    - Query Supabase user_roles table for role
    - Fetch/create user record with streak data
    - Set JWT claims: isAdmin, isSuperAdmin, isBanned, isOnboarded, streakCount
    ↓
Session Callback:
    - Map JWT claims to session.user
    - Apply God Mode override for master admins
    - Set streakCount to max(current, 365) for master admins
    ↓
Middleware (middleware.ts):
    - Check if path is public (login, API auth, etc.)
    - For API routes, let them handle own auth (returns JSON 401)
    - For page routes, redirect to /login if no session
```

### User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `student` | Default role | View content, track progress |
| `teacher` | Elevated access | Can be granted admin via API |
| `admin` | Administrator | Full admin panel access |
| `superadmin` | Master admin | All tabs (Upload, Manage, Broadcast, Team, Telemetry) |
| `banned` | Blocked user | Cannot access platform |

### God Mode Configuration
**Master Admin Emails** (hardcoded in `src/lib/constants.ts`):
- `abdallahsaad2150@gmail.com`
- `abdallahsaad828asd@gmail.com`

**God Mode Features**:
- Always `isAdmin: true` and `isSuperAdmin: true`
- `streakCount` forced to minimum 365
- Access to all admin tabs including Telemetry and Shadow Mode
- Bypasses database role checks

### Admin Validation Layers
1. **Middleware** (`src/middleware.ts`):
   - Redirects unauthenticated users to `/login`
   - API routes handle own auth (returns JSON 401)
   
2. **Server Components** (`src/app/admin/page.tsx`):
   ```typescript
   const isAdmin = session?.user?.isAdmin || isMasterAdmin(session?.user?.email);
   if (!session || !isAdmin) {
     redirect('/dashboard');
   }
   ```

3. **Client Components** (`src/app/admin/AdminClient.tsx`):
   - Tabs visibility based on `currentUserRole`
   - Only `superadmin` sees: Manage, Broadcast, Team, Telemetry

---

## Core Architecture & File Tree

### Directory Structure
```
edu-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── template.tsx            # Page transitions
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Global styles
│   │   ├── auth.ts                 # NextAuth configuration
│   │   ├── middleware.ts           # Auth middleware
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx            # Login page
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Student dashboard
│   │   │
│   │   ├── subjects/
│   │   │   └── [subject]/
│   │   │       ├── page.tsx        # Subject page
│   │   │       └── [lesson]/
│   │   │           └── page.tsx    # Lesson viewer
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx            # Admin page (server component)
│   │   │   ├── AdminClient.tsx     # Admin UI (client component)
│   │   │   ├── AnalyticsPanel.tsx  # Analytics dashboard
│   │   │   └── components/
│   │   │       ├── AdminSidebar.tsx
│   │   │       ├── UploadTab.tsx
│   │   │       ├── ManageTab.tsx
│   │   │       ├── TelemetryTab.tsx
│   │   │       ├── BroadcastTab.tsx
│   │   │       └── TeamTab.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx            # User profile
│   │   │
│   │   ├── banned/
│   │   │   └── page.tsx            # Banned user page
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts    # NextAuth API
│   │       │
│   │       ├── log/
│   │       │   └── route.ts        # Activity logging
│   │       │
│   │       ├── search/
│   │       │   └── route.ts        # Search API
│   │       │
│   │       ├── whats-new/
│   │       │   └── route.ts        # Changelog
│   │       │
│   │       ├── analytics/
│   │       │   └── heartbeat/
│   │       │       └── route.ts    # Session heartbeat
│   │       │
│   │       ├── social/
│   │       │   └── spotify/
│   │       │       └── route.ts    # Spotify integration
│   │       │
│   │       └── admin/
│   │           ├── subjects/route.ts
│   │           ├── lessons/route.ts
│   │           ├── roles/route.ts
│   │           ├── active-logins/route.ts
│   │           ├── storage-stats/route.ts
│   │           ├── upload-initiate/route.ts
│   │           ├── upload-complete/route.ts
│   │           ├── create-folder/route.ts
│   │           ├── delete/route.ts
│   │           ├── delete-item/route.ts
│   │           ├── delete-lesson/route.ts
│   │           ├── rename/route.ts
│   │           ├── move/route.ts
│   │           ├── move-item/route.ts
│   │           ├── purge-content/route.ts
│   │           ├── purge-orphans/route.ts
│   │           ├── migrate-to-r2/route.ts
│   │           ├── announcement/route.ts
│   │           └── embed/route.ts
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Providers.tsx
│   │   ├── InteractionTracker.tsx   # Click/scroll tracking
│   │   ├── SessionTracker.tsx       # Heartbeat tracking
│   │   ├── DashboardLogger.tsx      # Login logging
│   │   ├── ViewTracker.tsx          # View tracking
│   │   ├── LiveActivityFeed.tsx     # Real-time admin feed
│   │   ├── StudentWelcomeModal.tsx
│   │   ├── CommandSearch.tsx
│   │   ├── FolderExplorer.tsx
│   │   ├── LessonCard.tsx
│   │   ├── SubjectCard.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── VimeoPlayer.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── MusicPlayer.tsx
│   │   ├── StudyTimer.tsx
│   │   ├── ShareButton.tsx
│   │   ├── CompleteButton.tsx
│   │   ├── BookmarkButton.tsx
│   │   ├── BookmarkedLessons.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── DailyStreak.tsx
│   │   ├── StreakBadge.tsx (UI/)
│   │   ├── ConfettiCelebration.tsx
│   │   ├── WhatsNewBanner.tsx
│   │   ├── PromotionModal.tsx
│   │   ├── SupportTicketModal.tsx
│   │   ├── PWAInstallPrompt.tsx
│   │   ├── KeyboardShortcuts.tsx
│   │   ├── MobileNav.tsx
│   │   ├── LazyWidgets.tsx
│   │   ├── ActiveSessionsFeed.tsx
│   │   └── Admin/
│   │       ├── AdminActionBar.tsx
│   │       └── ContentUploader.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts                 # Auth helpers
│   │   ├── constants.ts            # Admin emails
│   │   ├── content.ts              # Content fetching
│   │   ├── supabase.ts             # Supabase client
│   │   ├── supabase-admin.ts       # Admin Supabase client
│   │   ├── supabase-client.ts      # Browser Supabase client
│   │   └── r2.ts                   # R2 storage helpers
│   │
│   ├── context/
│   │   └── SpotifyContext.tsx       # Spotify state
│   │
│   ├── types/
│   │   ├── index.ts                # Core types
│   │   └── next-auth.d.ts          # Auth type extensions
│   │
│   ├── data/
│   │   └── content-metadata.json   # Generated metadata
│   │
│   └── scripts/
│       └── telemetry-cron.js       # Cron job (unused)
│
├── public/
│   ├── sw.js                       # Service worker
│   ├── telemetry-worker.js         # Telemetry Web Worker
│   ├── manifest.json               # PWA manifest
│   └── content/                    # Static content files
│
├── scripts/
│   ├── generate-metadata.mjs       # Content metadata generator
│   ├── seed-supabase.mjs           # Database seeder
│   └── restore-admin-streak.mjs    # Admin streak fix
│
├── .env.local                      # Environment variables
├── .vercelignore                   # Vercel ignore list
├── next.config.ts                  # Next.js config
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── postcss.config.mjs
```

### Key API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth | Public |
| `/api/log` | POST | Activity logging | User |
| `/api/analytics/heartbeat` | POST | Session heartbeat | User |
| `/api/search` | GET | Content search | User |
| `/api/whats-new` | GET | Changelog | Public |
| `/api/social/spotify` | GET/POST | Spotify integration | User |
| `/api/admin/subjects` | GET/POST | Manage subjects | Admin |
| `/api/admin/lessons` | GET/POST | Manage lessons | Admin |
| `/api/admin/roles` | GET/POST | Manage user roles | Admin |
| `/api/admin/active-logins` | GET | Active sessions | Admin |
| `/api/admin/storage-stats` | GET | Storage statistics | Admin |
| `/api/admin/upload-initiate` | POST | Start upload | Admin |
| `/api/admin/upload-complete` | POST | Complete upload | Admin |
| `/api/admin/create-folder` | POST | Create folder | Admin |
| `/api/admin/delete` | POST | Delete resource | Admin |
| `/api/admin/delete-item` | POST | Delete content item | Admin |
| `/api/admin/delete-lesson` | POST | Delete lesson | Admin |
| `/api/admin/rename` | POST | Rename resource | Admin |
| `/api/admin/move` | POST | Move resource | Admin |
| `/api/admin/move-item` | POST | Move content item | Admin |
| `/api/admin/purge-content` | POST | Purge content | Admin |
| `/api/admin/purge-orphans` | POST | Purge orphaned R2 files | Admin |
| `/api/admin/migrate-to-r2` | POST | Migrate to R2 | Admin |
| `/api/admin/announcement` | POST | Send announcement | Admin |
| `/api/admin/embed` | POST | Manage embeds | Admin |

---

## Database Schema & Data Models

### Tables

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- student, teacher, admin, superadmin, banned
  is_onboarded BOOLEAN DEFAULT false,
  streak_count INTEGER DEFAULT 1,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `activity_logs`
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  url TEXT,
  geo_city TEXT,
  geo_country TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `live_sessions`
```sql
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  current_page TEXT,
  is_idle BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  geo_city TEXT,
  geo_country TEXT,
  UNIQUE(user_email, ip_address)
);
```

#### `subjects`
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📂',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `lessons`
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, slug)
);
```

#### `content_items`
```sql
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- file, folder, vimeo
  file_type TEXT, -- video, pdf, image, powerpoint, unknown
  name TEXT NOT NULL,
  url TEXT,
  vimeo_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_email TEXT NOT NULL,
  receiver_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `announcements`
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### TypeScript Models (from `src/types/index.ts`)

```typescript
type Role = 'student' | 'teacher' | 'admin' | 'superadmin' | 'banned';
type ItemType = 'file' | 'folder' | 'vimeo';
type FileType = 'video' | 'pdf' | 'image' | 'powerpoint' | 'unknown';

interface ContentNode {
  id?: string;
  type: ItemType;
  fileType?: FileType;
  name: string;
  url?: string;
  vimeoId?: string;
  children?: ContentNode[];
}

interface Subject {
  id: string;
  slug: string;
  title: string;
  icon: string;
  color: string;
  created_at?: string;
  lessons?: unknown[];
}

interface Lesson {
  id: string;
  subject_id: string;
  slug: string;
  title: string;
  created_at?: string;
}

interface ContentItem {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  item_type: ItemType;
  file_type: FileType | null;
  name: string;
  url: string | null;
  vimeo_id: string | null;
  created_at?: string;
}

interface ActivityLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface UserRole {
  id: string;
  email: string;
  role: Role;
  is_onboarded: boolean;
  streak_count: number;
  last_login: string | null;
  created_at: string;
}
```

---

## Telemetry & Tracking Logic

### Tracking Components

#### 1. InteractionTracker (`src/components/InteractionTracker.tsx`)
**Purpose**: Captures user clicks and scroll behavior
**Mechanism**:
- Uses Web Worker (`/telemetry-worker.js`) for buffered event processing
- Buffers events and sends in batches every 10 seconds
- Tracks: button clicks, link clicks, input interactions, scroll percentage
- Throttles scroll tracking to 15 seconds
- Immediate flush on page unload/visibility change

**Events Tracked**:
- `USER_CLICK`: Tag, text, ID of clicked element
- `USER_SCROLL`: Scroll percentage (0-100)

#### 2. SessionTracker (`src/components/SessionTracker.tsx`)
**Purpose**: Tracks active sessions and idle state
**Mechanism**:
- Sends heartbeat every 60 seconds to `/api/analytics/heartbeat`
- Tracks mouse, keyboard, scroll, click activity
- Marks user as idle after 5 minutes of inactivity
- Skips heartbeat when tab is hidden

**Heartbeat Data**:
```json
{
  "currentPage": "/subjects/calculus",
  "isIdle": false
}
```

#### 3. DashboardLogger (`src/components/DashboardLogger.tsx`)
**Purpose**: Logs user login events
**Mechanism**:
- Fires once per browser session (uses sessionStorage)
- Sends `USER_LOGIN` action to `/api/log`

#### 4. ViewTracker (`src/components/ViewTracker.tsx`)
**Purpose**: Tracks page/resource views
**Mechanism**:
- Accepts `action` and `details` props
- Fires once on mount (uses useRef to prevent duplicates)
- Used for: lesson views, PDF opens, video watches

### Telemetry Worker (`public/telemetry-worker.js`)
**Purpose**: Batches and sends telemetry events
**Mechanism**:
- Receives events via `postMessage` from InteractionTracker
- Buffers events in memory
- Flushes every 10 seconds via `setInterval`
- Immediate flush on `FLUSH` message

**Request Format**:
```json
{
  "action": "USER_INTERACTIONS_BATCH",
  "details": {
    "events": [...],
    "count": 5
  }
}
```

### Server-Side Telemetry

#### Log API (`src/app/api/log/route.ts`)
**Purpose**: Receives and stores activity logs
**Data Captured**:
- User email and name
- Action type
- URL (referer)
- User agent
- Geolocation (via Vercel headers: `x-vercel-ip-city`, `x-vercel-ip-country`)
- Custom details object

**Special Actions**:
- `Completed Student Onboarding`: Marks user as onboarded in DB, sends alert to admin

#### Heartbeat API (`src/app/api/analytics/heartbeat/route.ts`)
**Purpose**: Tracks active sessions in real-time
**Data Captured**:
- IP address (from `x-forwarded-for` or `x-real-ip`)
- User agent
- Current page path
- Idle state
- Geolocation

**Behavior**:
- Upserts into `live_sessions` table (unique on email + IP)
- If page changed, logs `PAGE_VIEW` to `activity_logs`

### Real-Time Admin Feed (`src/components/LiveActivityFeed.tsx`)
**Purpose**: God Mode surveillance dashboard
**Features**:
- **Feed Tab**: Real-time activity log stream
- **Sessions Tab**: Live session monitoring
- **Grid Tab**: Student overview cards
- **Audit Tab**: Filterable log search with CSV export
- **Shadow Tab**: Single-student surveillance mode

**Real-Time Subscription**:
```typescript
const logChannel = supabase
  .channel('realtime_activity')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'activity_logs' 
  }, (payload) => { ... })
  .subscribe();
```

### Data Flow Diagram
```
Browser Interaction
    ↓
InteractionTracker → Web Worker → Buffer (10s) → POST /api/log
    ↓
SessionTracker → POST /api/analytics/heartbeat (60s)
    ↓
DashboardLogger → POST /api/log (once per session)
    ↓
ViewTracker → POST /api/log (once per view)
    ↓
API Routes → Supabase (activity_logs + live_sessions)
    ↓
Realtime Subscription → LiveActivityFeed (admin dashboard)
```

---

## Current Deployment State (Vercel)

### Production Configuration
- **URL**: `https://www.edu-platform.me`
- **Build Command**: `node scripts/generate-metadata.mjs && next build`
- **Output**: `.next` (standard Next.js)
- **Node Version**: Compatible with Vercel defaults

### Local vs Production Differences

| Aspect | Local | Production (Vercel) |
|--------|-------|---------------------|
| URL | `localhost:3000` | `www.edu-platform.me` |
| NextAuth URL | Not set | `NEXTAUTH_URL=https://www.edu-platform.me` |
| Debug Mode | Enabled | Disabled |
| Turbopack | Enabled | Enabled |
| Static Content | File system | Vercel CDN |
| Database | Same Supabase | Same Supabase |
| R2 Storage | Same bucket | Same bucket |

### Build Process
1. `generate-metadata.mjs` scans `/public/content/` directories
2. Generates `src/data/content-metadata.json`
3. Next.js builds with static generation where possible
4. API routes deployed as serverless functions

### Security Headers (from `next.config.ts`)
```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [configured for Supabase, Vimeo, Spotify, Tawk.to]
```

---

## Known Issues & Gaps

### Critical Issues

1. **God Mode GUI Not Rendering on Vercel - ROOT CAUSE IDENTIFIED**
   - **Symptom**: Admin panel components render locally but fail on production
   - **ROOT CAUSE**: CSP (Content Security Policy) has hardcoded Supabase URL that doesn't match production environment
   - **Evidence**:
     - In `next.config.ts` CSP: `https://qsvsmyikvylnryhicfuk.supabase.co` (hardcoded)
     - In `.env.local`: `NEXT_PUBLIC_SUPABASE_URL="https://cqvmeucgatkjozkgzcql.supabase.com"` (actual)
     - The CSP whitelists a DIFFERENT Supabase project than what's actually used
     - This blocks Supabase realtime connections on production
   - **Why it works locally**: Local development may not enforce CSP strictly, or uses different environment
   - **FIX IMPLEMENTED**: Removed hardcoded `https://qsvsmyikvylnryhicfuk.supabase.co` from CSP
   - **Result**: CSP now uses wildcard pattern `https://*.supabase.co` which matches any Supabase project
   - **Verification Steps**:
     1. Deploy to Vercel and test admin panel access
     2. Check browser console for CSP violations
     3. Verify Supabase realtime connections establish successfully
     4. Confirm God Mode tabs (Telemetry, Shadow) render correctly
   - **Additional Checks**:
     - Verify `NEXTAUTH_URL` matches production domain exactly
     - Check JWT payload size (may need token compression)
     - Ensure all environment variables are set in Vercel dashboard

2. **Telemetry Data Pipeline Gaps**
   - **Issue**: Click/scroll data may not sync reliably
   - **Root Cause**: Web Worker may fail silently on some browsers
   - **Impact**: Admin Shadow Mode may show incomplete data
   - **Fix**: Add error boundary and fallback direct API calls

### Minor Issues

3. **Stale Session Cleanup**
   - `live_sessions` table may accumulate stale entries
   - No automatic cleanup job for sessions older than 24h
   - **Recommendation**: Add TTL-based cleanup or cron job

4. **Geolocation Reliability**
   - Depends on Vercel headers (`x-vercel-ip-city`, `x-vercel-ip-country`)
   - May return "Unknown" for non-Vercel deployments
   - **Impact**: Location data in telemetry may be incomplete

5. **Spotify Token Refresh**
   - No visible token refresh logic in auth callbacks
   - Spotify tokens expire after 1 hour
   - **Impact**: Music player may fail after extended sessions

6. **TypeScript `any` Usage**
   - Several components use `any` type (LiveActivityFeed, AdminClient)
   - Reduces type safety and IDE support
   - **Recommendation**: Replace with proper interfaces

### Architecture Strengths

1. **Dual Storage Strategy**: Supabase for metadata, R2 for media files
2. **Real-Time Surveillance**: Live activity feed with Shadow Mode
3. **Web Worker Buffering**: Prevents API flooding from high-frequency events
4. **Role-Based Access**: Multi-layer admin validation (middleware → server → client)
5. **PWA Support**: Service worker and manifest for offline/install
6. **Security Headers**: Comprehensive CSP and HSTS configuration

---

## Summary

**EduPortal** is a feature-rich educational platform with:
- **Authentication**: JWT-based NextAuth with Google/Spotify OAuth
- **Database**: Supabase PostgreSQL with realtime subscriptions
- **Storage**: Cloudflare R2 for media, Supabase for metadata
- **Telemetry**: Multi-layer tracking (Worker, Heartbeat, View, Login)
- **Admin Panel**: 5-tab system with God Mode surveillance capabilities
- **Deployment**: Vercel with automatic builds and CDN

**Primary Concern**: The God Mode GUI rendering issue on Vercel likely stems from environment variable misconfiguration or CSP restrictions. Debugging should focus on Vercel function logs and comparing local vs production auth flows.

**Report Generated**: 2026-03-31
**Codebase Version**: Latest commit `e18ffb91f286240ee86d0890c77b5ea7b4438e9e`