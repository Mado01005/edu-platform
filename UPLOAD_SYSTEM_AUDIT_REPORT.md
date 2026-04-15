# Upload System Audit Report

**Project:** EduPortal — Content Upload Infrastructure  
**Audit Date:** April 14, 2026  
**Reviewed By:** Lead Engineer  
**Audience:** Engineering Leadership  

---

## Executive Summary

The current upload system is functional but has significant gaps in **reliability**, **performance**, and **user experience**. Batch uploads are unnecessarily slow, there is no recovery from transient failures, and the system lacks safeguards against data inconsistency. This report identifies **14 issues** across 3 severity tiers and proposes a phased remediation plan.

**Estimated effort for full implementation:** 3-4 sprints  
**Recommended starting point:** Phase 1 (Quick Wins) — 1 sprint

---

## 1. Current Architecture Overview

### Upload Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UPLOAD PIPELINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐   │
│  │  File Select  │──▶│ /upload-initiate  │──▶│  XHR PUT to R2   │   │
│  │  + Convert    │   │ (presigned URL)   │   │ (direct upload)  │   │
│  └──────────────┘   └───────────────────┘   └──────────────────┘   │
│                                                             │       │
│                                                             ▼       │
│  ┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐   │
│  │ onComplete()  │◀──│ /upload-complete  │◀──│  Supabase Insert  │   │
│  │ (DB refresh)  │   │ (DB record + log) │   │ (content_items)  │   │
│  └──────────────┘   └───────────────────┘   └──────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Upload UI | `src/components/Admin/ContentUploader.tsx` | File selection, format conversion, upload orchestration |
| Upload Initiate API | `src/app/api/admin/upload-initiate/route.ts` | Generate presigned R2 PUT URL |
| Upload Complete API | `src/app/api/admin/upload-complete/route.ts` | Insert Supabase record after upload |
| R2 Utilities | `src/lib/r2.ts` | S3 client, presigned URLs, delete operations |
| Upload Tab UI | `src/app/admin/components/UploadTab.tsx` | Subject/lesson selectors, folder picker |

### Storage Architecture

- **Cloudflare R2** — Media files (videos, PDFs, images, documents)
- **Supabase PostgreSQL** — Metadata (file names, URLs, hierarchy, relationships)

---

## 2. Findings

### 🔴 Critical — Directly Impacts User Experience

| ID | Issue | Location | Description |
|----|-------|----------|-------------|
| C1 | **Sequential Single-File Uploads** | `ContentUploader.tsx` (line 153) | Files upload one-at-a-time in a `for` loop. A batch of 50 files requires 50 serial roundtrips (initiate → upload → complete × 50). At ~5s per file, a 50-file batch takes ~4 minutes minimum. |
| C2 | **No Retry on Failure** | `ContentUploader.tsx` (line 153-190) | If any single file fails mid-batch, the entire operation stops. No retry logic exists. The user must restart from scratch for all remaining files. |
| C3 | **No Abort/Cancel Mechanism** | `ContentUploader.tsx` (line 97-130) | Once `processUploadOrEmbed()` begins, there is no way for the user to cancel in-progress uploads. The only recovery is a full page refresh, which leaves orphaned R2 files and potentially incomplete DB records. |
| C4 | **No Client-Side File Size Validation** | `ContentUploader.tsx` (line 143) | No size check before initiating upload. A user could select a 10GB file, wait for the initiate call, upload for minutes, and only then receive a rejection from R2 — wasting time and bandwidth. |
| C5 | **No R2 Existence Verification on Complete** | `upload-complete/route.ts` (line 18-28) | The `/upload-complete` endpoint trusts that the browser successfully uploaded to R2. If the XHR PUT failed but the client still called `/upload-complete`, a database record is created pointing to a non-existent R2 key. This creates "ghost files" visible in the UI but unplayable/unviewable by students. |

### 🟡 Medium — Affects Reliability & Maintainability

| ID | Issue | Location | Description |
|----|-------|----------|-------------|
| M1 | **Duplicate Content Possible** | `upload-complete/route.ts` | No idempotency mechanism. Calling `/upload-complete` twice with the same parameters creates duplicate rows in `content_items`. This can happen if the client retries on timeout. |
| M2 | **`alert()` Breaks UX Consistency** | `ContentUploader.tsx` (line 147) | Uses native `alert('Select a module first')` for validation error instead of the existing `statusMessage` state. This is jarring, blocks the thread, and is inconsistent with the rest of the UI. |
| M3 | **Production Console Logging** | `ContentUploader.tsx` (lines 98-101) | Verbose `[R2-UPLOAD]` logs are emitted unconditionally and leak to the production browser console. These expose internal upload URLs and file metadata to anyone with DevTools open. |
| M4 | **No Server-Side Content-Type Validation** | `upload-initiate/route.ts` (line 52) | The `contentType` is accepted directly from the client and embedded in the presigned URL. A malicious client could set `contentType: "text/html"` and upload a file that renders as executable content in a browser. |
| M5 | **Inefficient Folder Deletion** | `r2.ts` (lines 100-128) | `deleteR2Folder()` deletes files one-by-one in a loop. For folders with hundreds of files, this is extremely slow and risks hitting R2 rate limits. Should use batch `DeleteObjectsCommand`. |

### 🟢 Low — Code Quality & Hygiene

| ID | Issue | Location | Description |
|----|-------|----------|-------------|
| L1 | **Dead Import** | `FolderExplorer.tsx` (line 13) | `ContentUploader` is imported but never used directly in this file. Only `AdminActionBar` uses it. |
| L2 | **Empty Directories** | `src/app/api/admin/` | Three directories exist with no route files: `upload-r2/`, `upload-raw/`, `upload-supabase/`. These are abandoned experimental endpoints. |
| L3 | **Unsafe Type Cast** | `ContentUploader.tsx` (line 155) | Uses `(file as unknown as { webkitRelativePath?: string }).webkitRelativePath` instead of proper TypeScript type augmentation for `webkitRelativePath`. |
| L4 | **`any` Type in Traversal** | `UploadTab.tsx` (line 37) | The `traverse` function parameter is typed as `any[]`, reducing type safety for content tree traversal. |

---

## 3. Risk Assessment

| Risk Category | Current State | Impact |
|---------------|---------------|--------|
| **Performance** | Sequential uploads, no batching | Batch uploads are 3-5x slower than achievable |
| **Reliability** | No retry, no abort, no idempotency | Single failure = full batch loss; duplicate records possible |
| **Data Integrity** | No R2 verification on complete | Ghost files in UI that students cannot access |
| **Security** | Client-controlled content-type, no size limit | Potential for malformed content uploads |
| **Maintainability** | Dead code, loose types, console spam | Slower debugging, higher cognitive load for new engineers |

---

## 4. Recommendations — Phased Implementation Plan

### Phase 1: Quick Wins (1 Sprint)

*Highest impact, lowest effort. Safe changes with minimal regression risk.*

| Item | Description | Effort | Files Affected |
|------|-------------|--------|----------------|
| P1.1 | **Add client-side file size limit** (500MB max). Reject oversized files before any network call. | 0.5 day | `ContentUploader.tsx` |
| P1.2 | **Server-side content-type allowlist**. Validate MIME type in `/upload-initiate` against a safe allowlist (`video/*`, `image/*`, `application/pdf`, etc.). | 0.5 day | `upload-initiate/route.ts` |
| P1.3 | **R2 existence verification in `/upload-complete`**. Before inserting into `content_items`, issue a `HeadObject` command to confirm the file exists in R2. | 1 day | `upload-complete/route.ts`, `r2.ts` |
| P1.4 | **Remove production console logs**. Replace with a `NODE_ENV`-aware logger or remove entirely. | 0.25 day | `ContentUploader.tsx`, `upload-initiate/route.ts` |
| P1.5 | **Replace `alert()` with `statusMessage`**. Consistent error display across all validation paths. | 0.25 day | `ContentUploader.tsx` |
| P1.6 | **Clean up dead code**. Remove unused imports and empty directories. | 0.25 day | `FolderExplorer.tsx`, `src/app/api/admin/` |

### Phase 2: Smooth Upload Experience (1-2 Sprints)

*Meaningful UX improvements. Moderate complexity.*

| Item | Description | Effort | Files Affected |
|------|-------------|--------|----------------|
| P2.1 | **Concurrent upload pool**. Upload 3-5 files in parallel using a worker pool pattern instead of sequential loop. | 1.5 days | `ContentUploader.tsx` |
| P2.2 | **Retry logic with exponential backoff**. Auto-retry failed uploads up to 3 times with 1s → 2s → 4s delays. | 1 day | `ContentUploader.tsx` |
| P2.3 | **Abort controller**. Add a cancel button that aborts in-flight XHR requests and stops the upload queue. | 1 day | `ContentUploader.tsx` |
| P2.4 | **Per-file status tracking**. UI shows success ✅ / failed ❌ / pending ⏳ for each file in the batch. | 1 day | `ContentUploader.tsx` |
| P2.5 | **Idempotency key in `/upload-complete`**. Accept an optional `uploadIdempotencyKey` and use `upsert` or a unique constraint to prevent duplicate rows. | 1 day | `upload-complete/route.ts` |

### Phase 3: Advanced Optimizations (1 Sprint)

*Performance at scale. Higher complexity, requires testing.*

| Item | Description | Effort | Files Affected |
|------|-------------|--------|----------------|
| P3.1 | **Chunked uploads for large files**. Split files >50MB into chunks. Resume from last chunk on failure. | 2 days | `ContentUploader.tsx`, `r2.ts`, new API route |
| P3.2 | **Batch `/upload-complete` endpoint**. Accept an array of completed files in a single API call to reduce roundtrips. | 1 day | New route: `upload-complete-batch/route.ts`, `ContentUploader.tsx` |
| P3.3 | **Batch R2 deletes**. Replace one-by-one loop in `deleteR2Folder` with `DeleteObjectsCommand` (up to 1000 keys per request). | 0.5 day | `r2.ts` |
| P3.4 | **Drag-and-drop upload zone**. Visual queue with file list, per-file progress bars, and reorder capability. | 1.5 days | `ContentUploader.tsx` |

---

## 5. Metrics for Success

After implementation, the following metrics should be measured:

| Metric | Current | Target |
|--------|---------|--------|
| Time to upload 20 files (avg 10MB each) | ~100 seconds (sequential) | ~25 seconds (concurrent pool of 5) |
| Batch failure recovery | Full restart required | Auto-retry, per-file resume |
| Ghost file rate | Unknown (unmeasured) | 0% (R2 verification on complete) |
| Duplicate record rate | Possible on retry | 0% (idempotency key) |
| User cancellation capability | None | Available within 500ms of starting |

---

## 6. Recommendation

**Start with Phase 1 immediately.** These changes are low-risk, high-impact, and can be completed in a single sprint. They address data integrity issues (ghost files), security gaps (content-type validation), and UX inconsistencies (`alert()` replacement).

**Phase 2 should follow as the next priority.** Concurrent uploads and retry logic are the single biggest UX improvements for admins who regularly upload batches of content.

**Phase 3 can be deferred** until batch upload volume justifies the engineering investment. Chunked uploads and batch APIs add complexity that is not needed at the current scale of usage.

---

**End of Report**
