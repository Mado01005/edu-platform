import nextConfig from '../../next.config';

describe('global response security headers', () => {
  it('denies framing and constrains high-risk CSP capabilities', async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(
      rules?.[0]?.headers.map(({ key, value }) => [key, value]),
    );
    const csp = headers.get('Content-Security-Policy') ?? '';

    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain('https://*.r2.cloudflarestorage.com');
    expect(csp).toContain('https://player.vimeo.com');
    expect(csp).toContain('https://www.youtube.com');
    expect(csp).toContain('https://open.spotify.com');
    expect(csp).toContain('https://va.vercel-scripts.com');
  });
});
