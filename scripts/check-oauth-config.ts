import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import {
  PRODUCTION_AUTH_CALLBACK_URLS,
  PRODUCTION_SITE_URL,
  getGoogleOAuthRedirectUrl,
} from '../src/lib/supabase/config';

const REQUIRED_GOOGLE_PROVIDER_CALLBACK =
  'https://cqvmeucgatkjozkgzcql.supabase.co/auth/v1/callback';

for (const environmentFile of ['.env.local', '.env']) {
  dotenv.config({
    path: resolve(process.cwd(), environmentFile),
    override: false,
    quiet: true,
  });
}

type ToolStatus = 'authenticated' | 'installed, not authenticated' | 'unavailable';

type AuthConfig = {
  site_url?: unknown;
  uri_allow_list?: unknown;
};

type VerificationResult = {
  detail: string;
  verified: boolean;
};

function run(command: string, args: string[]) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
    timeout: 8_000,
  });
}

function probeGcloud(): ToolStatus {
  const version = run('gcloud', ['--version']);
  if (version.error || version.status !== 0) return 'unavailable';

  const accounts = run('gcloud', [
    'auth',
    'list',
    '--filter=status:ACTIVE',
    '--format=value(account)',
  ]);
  return accounts.status === 0 && accounts.stdout.trim()
    ? 'authenticated'
    : 'installed, not authenticated';
}

function probeSupabase(): ToolStatus {
  const version = run('supabase', ['--version']);
  if (version.error || version.status !== 0) return 'unavailable';

  const projects = run('supabase', ['projects', 'list', '--output', 'json']);
  return projects.status === 0 && projects.stdout.trim().startsWith('[')
    ? 'authenticated'
    : 'installed, not authenticated';
}

function projectRefFromSupabaseUrl(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const suffix = '.supabase.co';
    return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null;
  } catch {
    return null;
  }
}

function parseAllowList(value: unknown) {
  return typeof value === 'string'
    ? value.split(',').map((url) => url.trim()).filter(Boolean)
    : [];
}

async function verifyRemoteSupabaseConfig() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    projectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!accessToken || !projectRef) {
    return {
      detail: 'not checked (SUPABASE_ACCESS_TOKEN or project ref is unavailable)',
      verified: false,
    };
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return {
        detail: `not verified (Management API returned HTTP ${response.status})`,
        verified: false,
      };
    }

    const config = (await response.json()) as AuthConfig;
    const allowList = parseAllowList(config.uri_allow_list);
    const siteUrlMatches = config.site_url === PRODUCTION_SITE_URL;
    const callbacksMatch = PRODUCTION_AUTH_CALLBACK_URLS.every((url) =>
      allowList.includes(url),
    );

    return {
      detail:
        siteUrlMatches && callbacksMatch
          ? 'verified'
          : 'reachable, but the Site URL or exact callback allowlist is incomplete',
      verified: siteUrlMatches && callbacksMatch,
    };
  } catch {
    return {
      detail: 'not verified (Management API was unreachable)',
      verified: false,
    };
  }
}

function decodeGoogleAuthError(value: string | null) {
  if (!value) return '';

  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

async function verifyGoogleProviderCallback(
  expectedProviderCallback: string | null,
): Promise<VerificationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !publicKey || !expectedProviderCallback) {
    return {
      detail: 'not checked (public Supabase configuration is unavailable)',
      verified: false,
    };
  }

  try {
    const authorizeUrl = new URL('/auth/v1/authorize', supabaseUrl);
    authorizeUrl.searchParams.set('provider', 'google');
    authorizeUrl.searchParams.set(
      'redirect_to',
      PRODUCTION_AUTH_CALLBACK_URLS[0],
    );

    const supabaseResponse = await fetch(authorizeUrl, {
      headers: { apikey: publicKey },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    const providerLocation = supabaseResponse.headers.get('location');
    if (!providerLocation) {
      return {
        detail: `not verified (Supabase authorize returned HTTP ${supabaseResponse.status} without a provider redirect)`,
        verified: false,
      };
    }

    const providerUrl = new URL(providerLocation);
    if (providerUrl.searchParams.get('redirect_uri') !== expectedProviderCallback) {
      return {
        detail: 'invalid (Supabase generated an unexpected Google callback)',
        verified: false,
      };
    }

    const googleResponse = await fetch(providerUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 OAuth configuration verifier' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
    });
    const finalUrl = new URL(googleResponse.url);

    if (/\/signin\/oauth\/error/i.test(finalUrl.pathname)) {
      const decodedError = decodeGoogleAuthError(
        finalUrl.searchParams.get('authError'),
      );
      return {
        detail: /redirect_uri_mismatch/i.test(decodedError)
          ? 'rejected by Google (redirect_uri_mismatch)'
          : 'rejected by Google (OAuth request is invalid)',
        verified: false,
      };
    }

    const reachedGoogleSignIn =
      googleResponse.ok && finalUrl.hostname === 'accounts.google.com';
    return {
      detail: reachedGoogleSignIn
        ? 'accepted by Google (sign-in page reached)'
        : 'not verified (Google sign-in page was not reached)',
      verified: reachedGoogleSignIn,
    };
  } catch {
    return {
      detail: 'not verified (OAuth handshake was unreachable)',
      verified: false,
    };
  }
}

function heading(value: string) {
  const cyan = process.stdout.isTTY ? '\u001b[1;36m' : '';
  const reset = process.stdout.isTTY ? '\u001b[0m' : '';
  return `${cyan}${value}${reset}`;
}

async function main() {
  const googleCallback = getGoogleOAuthRedirectUrl();
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const gcloudStatus = probeGcloud();
  const supabaseStatus = probeSupabase();
  const remoteSupabase = await verifyRemoteSupabaseConfig();
  const googleProvider = await verifyGoogleProviderCallback(googleCallback);

  console.log(heading('\nOAuth configuration check'));
  console.log(`  gcloud CLI:  ${gcloudStatus}`);
  console.log(`  Supabase CLI: ${supabaseStatus}`);
  console.log(`  Supabase Management API: ${remoteSupabase.detail}`);
  console.log(`  Google provider callback: ${googleProvider.detail}`);

  console.log(heading('\nApplication OAuth environment'));
  console.log(
    `  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? 'configured' : 'missing'}`,
  );
  console.log(
    `  NEXT_PUBLIC_SITE_URL: ${configuredSiteUrl || `missing (using ${PRODUCTION_SITE_URL} fallback)`}`,
  );

  console.log(heading('\nGoogle Cloud authorized redirect URI'));
  console.log(`  Required: ${REQUIRED_GOOGLE_PROVIDER_CALLBACK}`);
  console.log(
    `  Derived from NEXT_PUBLIC_SUPABASE_URL: ${googleCallback ?? 'unavailable'}`,
  );

  if (googleCallback && googleCallback !== REQUIRED_GOOGLE_PROVIDER_CALLBACK) {
    console.log(
      '  NOTICE: NEXT_PUBLIC_SUPABASE_URL points to a different project than the required Google callback above.',
    );
  }

  console.log(heading('\nSupabase production URL configuration'));
  console.log(`  Site URL: ${PRODUCTION_SITE_URL}`);
  console.log('  Exact redirect allowlist entries:');
  for (const callbackUrl of PRODUCTION_AUTH_CALLBACK_URLS) {
    console.log(`    - ${callbackUrl}`);
  }

  if (!googleProvider.verified) {
    console.log(
      '\n  NOTICE: Google OAuth still requires attention. Add the provider callback above to the web OAuth client in Google Cloud Console.',
    );
  } else if (gcloudStatus !== 'authenticated') {
    console.log(
      '\n  NOTICE: The live Google handshake accepted the callback, but gcloud is unavailable for configuration enumeration.',
    );
  }
  if (!remoteSupabase.verified) {
    console.log(
      '  NOTICE: Supply SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF for a read-only Management API verification.',
    );
  }
  console.log('');
}

void main().catch(() => {
  // OAuth diagnostics must never turn a missing external CLI or credential into
  // an application build failure.
  console.log(
    '\nOAuth configuration check could not complete. Build will continue; confirm the documented callback URLs manually.\n',
  );
});
