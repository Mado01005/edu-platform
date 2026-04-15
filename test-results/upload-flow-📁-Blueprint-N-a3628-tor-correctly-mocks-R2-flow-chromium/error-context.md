# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: upload-flow.spec.ts >> 📁 Blueprint Nexus — File Upload Flow >> Presigned URL interceptor correctly mocks R2 flow
- Location: e2e/upload-flow.spec.ts:63:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 501
Received array: [200, 401]
```

# Test source

```ts
  1  | /**
  2  |  * BLUEPRINT NEXUS — E2E Upload Flow
  3  |  * 
  4  |  * Tests the Cloudflare R2 presigned URL upload pipeline.
  5  |  * 
  6  |  * SAFETY: This test intercepts all network calls to the R2/admin APIs.
  7  |  * No actual files are uploaded to production R2 storage.
  8  |  * No database records are created.
  9  |  */
  10 | 
  11 | import { test, expect } from '@playwright/test';
  12 | 
  13 | test.describe('📁 Blueprint Nexus — File Upload Flow', () => {
  14 |   
  15 |   test.beforeEach(async ({ page }) => {
  16 |     // Intercept the upload-initiate API to prevent real R2 presigned URL generation
  17 |     await page.route('**/api/admin/upload-initiate', async (route) => {
  18 |       await route.fulfill({
  19 |         status: 200,
  20 |         contentType: 'application/json',
  21 |         body: JSON.stringify({
  22 |           signedUrl: 'https://mock-r2.example.com/test-upload?X-Amz-Signature=mock',
  23 |           path: 'test-subject/test-lesson/1234567890_test-file.pdf',
  24 |           publicUrl: 'https://cdn.mock.example.com/test-subject/test-lesson/1234567890_test-file.pdf',
  25 |           contentType: 'application/pdf',
  26 |         }),
  27 |       });
  28 |     });
  29 | 
  30 |     // Intercept the actual R2 presigned URL PUT
  31 |     await page.route('https://mock-r2.example.com/**', async (route) => {
  32 |       await route.fulfill({
  33 |         status: 200,
  34 |         body: '',
  35 |       });
  36 |     });
  37 | 
  38 |     // Intercept upload-complete to prevent DB writes
  39 |     await page.route('**/api/admin/upload-complete', async (route) => {
  40 |       await route.fulfill({
  41 |         status: 200,
  42 |         contentType: 'application/json',
  43 |         body: JSON.stringify({ success: true, item: { id: 'mock-id', name: 'test-file.pdf' } }),
  44 |       });
  45 |     });
  46 |   });
  47 | 
  48 |   test('Admin upload page loads with subject/lesson selectors', async ({ page }) => {
  49 |     await page.goto('/admin');
  50 |     
  51 |     // Check that we either see the admin panel or get redirected to login
  52 |     const url = page.url();
  53 |     if (url.includes('/login')) {
  54 |       // Expected if not authenticated — test passes (auth gate works)
  55 |       expect(url).toContain('/login');
  56 |       return;
  57 |     }
  58 | 
  59 |     // If we're on the admin page, verify upload tab elements
  60 |     await expect(page.locator('text=UPLOAD').first()).toBeVisible({ timeout: 10000 });
  61 |   });
  62 | 
  63 |   test('Presigned URL interceptor correctly mocks R2 flow', async ({ page }) => {
  64 |     // Test the interceptor directly by navigating and triggering a fetch
  65 |     const response = await page.request.post('/api/admin/upload-initiate', {
  66 |       data: {
  67 |         fileName: 'test-lecture.pdf',
  68 |         subjectSlug: 'physics',
  69 |         lessonSlug: 'mechanics',
  70 |         contentType: 'application/pdf',
  71 |       },
  72 |     });
  73 | 
  74 |     // If intercepted, we get our mock response
  75 |     // If not intercepted (auth required), we get 401 which is also correct
  76 |     const status = response.status();
> 77 |     expect([200, 401]).toContain(status);
     |                        ^ Error: expect(received).toContain(expected) // indexOf
  78 |     
  79 |     if (status === 200) {
  80 |       const body = await response.json();
  81 |       expect(body.signedUrl).toContain('mock-r2.example.com');
  82 |       expect(body.path).toContain('test-subject');
  83 |     }
  84 |   });
  85 | });
  86 | 
```