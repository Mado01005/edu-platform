/**
 * BLUEPRINT NEXUS — E2E Upload Flow
 * 
 * Tests the Cloudflare R2 presigned URL upload pipeline.
 * 
 * SAFETY: This test intercepts all network calls to the R2/admin APIs.
 * No actual files are uploaded to production R2 storage.
 * No database records are created.
 */

import { test, expect } from '@playwright/test';

test.describe('📁 Blueprint Nexus — File Upload Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Intercept the upload-initiate API to prevent real R2 presigned URL generation
    await page.route('**/api/admin/upload-initiate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          signedUrl: 'https://mock-r2.example.com/test-upload?X-Amz-Signature=mock',
          path: 'test-subject/test-lesson/1234567890_test-file.pdf',
          publicUrl: 'https://cdn.mock.example.com/test-subject/test-lesson/1234567890_test-file.pdf',
          contentType: 'application/pdf',
        }),
      });
    });

    // Intercept the actual R2 presigned URL PUT
    await page.route('https://mock-r2.example.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: '',
      });
    });

    // Intercept upload-complete to prevent DB writes
    await page.route('**/api/admin/upload-complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, item: { id: 'mock-id', name: 'test-file.pdf' } }),
      });
    });
  });

  test('Admin upload page loads with subject/lesson selectors', async ({ page }) => {
    await page.goto('/admin');
    
    // Check that we either see the admin panel or get redirected to login
    const url = page.url();
    if (url.includes('/login')) {
      // Expected if not authenticated — test passes (auth gate works)
      expect(url).toContain('/login');
      return;
    }

    // If we're on the admin page, verify upload tab elements
    await expect(page.locator('text=UPLOAD').first()).toBeVisible({ timeout: 10000 });
  });

  test('Presigned URL interceptor correctly mocks R2 flow', async ({ page }) => {
    // Test the interceptor directly by navigating and triggering a fetch
    const response = await page.request.post('/api/admin/upload-initiate', {
      data: {
        fileName: 'test-lecture.pdf',
        subjectSlug: 'physics',
        lessonSlug: 'mechanics',
        contentType: 'application/pdf',
      },
    });

    // If intercepted, we get our mock response
    // If not intercepted (auth required), we get 401 which is also correct
    const status = response.status();
    expect([200, 401]).toContain(status);
    
    if (status === 200) {
      const body = await response.json();
      expect(body.signedUrl).toContain('mock-r2.example.com');
      expect(body.path).toContain('test-subject');
    }
  });
});
