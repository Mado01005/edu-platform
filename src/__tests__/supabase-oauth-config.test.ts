import {
  getApplicationOAuthCallbackUrl,
  getGoogleOAuthRedirectUrl,
} from '@/lib/supabase/config';

describe('Supabase OAuth URL configuration', () => {
  it('derives the Google provider callback from the Supabase project URL', () => {
    expect(
      getGoogleOAuthRedirectUrl('https://project-ref.supabase.co/'),
    ).toBe('https://project-ref.supabase.co/auth/v1/callback');
  });

  it('does not manufacture a provider callback from missing or unsafe input', () => {
    expect(getGoogleOAuthRedirectUrl('')).toBeNull();
    expect(getGoogleOAuthRedirectUrl('javascript:alert(1)')).toBeNull();
  });

  it('builds the application PKCE callback on the active origin', () => {
    expect(
      getApplicationOAuthCallbackUrl(
        'https://www.edu-platform.me/login',
        '/teacher/courses',
      ),
    ).toBe(
      'https://www.edu-platform.me/auth/callback?next=%2Fteacher%2Fcourses',
    );
  });

  it('rejects an invalid application origin', () => {
    expect(() =>
      getApplicationOAuthCallbackUrl('not-a-web-origin'),
    ).toThrow('authentication callback origin is not configured');
  });
});
