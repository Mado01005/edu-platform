import { PrismaClient, type Role } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../.env.local', import.meta.url)),
  quiet: true,
});

const ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'SUPPORT',
  'ACCOUNTING',
] as const satisfies readonly Role[];
type AllowedRole = (typeof ALLOWED_ROLES)[number];
type RoleCommand =
  | { email: string; mode: 'single'; role: AllowedRole }
  | { mode: 'configured-master' };

function fail(message: string): never {
  throw new Error(message);
}

function parseArguments(): RoleCommand {
  const [emailArgument, roleArgument, ...extraArguments] = process.argv.slice(2);

  if (
    emailArgument === '--bootstrap-configured-master' &&
    !roleArgument &&
    extraArguments.length === 0
  ) {
    return { mode: 'configured-master' };
  }

  if (!emailArgument || !roleArgument || extraArguments.length > 0) {
    fail(
      `Usage: npm run set-role -- <email> <${ALLOWED_ROLES.join('|')}>\n` +
        '   or: npm run set-role -- --bootstrap-configured-master',
    );
  }

  const email = emailArgument.trim().toLowerCase();
  const role = roleArgument.trim().toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`Invalid email address: ${emailArgument}`);
  }

  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    fail(
      `Invalid role: ${roleArgument}. Expected ${ALLOWED_ROLES.join(', ')}.`,
    );
  }

  return { email, mode: 'single', role: role as AllowedRole };
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  return value || fail(`Missing required environment variable: ${name}`);
}

async function main() {
  const command = parseArguments();
  const prisma = new PrismaClient();

  try {
    let email: string;
    let role: AllowedRole;

    if (command.mode === 'configured-master') {
      const configuredEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (!configuredEmails.length) {
        fail('ADMIN_EMAILS must identify the configured master administrator.');
      }

      const candidates = await prisma.user.findMany({
        where: {
          email: { in: configuredEmails },
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { email: true },
      });

      if (candidates.length !== 1) {
        fail(
          'Exactly one active LMS administrator must match ADMIN_EMAILS before bootstrapping SUPER_ADMIN.',
        );
      }

      email = candidates[0].email;
      role = 'SUPER_ADMIN';
    } else {
      email = command.email;
      role = command.role;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, role: true, supabaseId: true },
    });

    if (!user) {
      fail(`No LMS user found for email: ${email}`);
    }

    const supabaseUrl = requireEnvironmentVariable(
      'NEXT_PUBLIC_SUPABASE_URL',
    ).replace('.supabase.com', '.supabase.co');
    const supabaseServiceRoleKey = requireEnvironmentVariable(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

    const { data: authUserData, error: authUserError } =
      await supabase.auth.admin.getUserById(user.supabaseId);

    if (authUserError || !authUserData.user) {
      fail(
        `Unable to load the matching Supabase Auth user: ${
          authUserError?.message ?? 'user not found'
        }`,
      );
    }

    if (authUserData.user.email?.trim().toLowerCase() !== email) {
      fail('The Prisma and Supabase Auth email addresses do not match.');
    }

    const previousRole = user.role;
    await prisma.user.update({
      where: { email },
      data: { role },
    });

    const appMetadata = authUserData.user.app_metadata ?? {};
    const metadataNeedsUpdate = appMetadata.role !== role;

    if (metadataNeedsUpdate) {
      const { error: metadataError } =
        await supabase.auth.admin.updateUserById(user.supabaseId, {
          app_metadata: { ...appMetadata, role },
        });

      if (metadataError) {
        await prisma.user.update({
          where: { email },
          data: { role: previousRole },
        });
        fail(
          `Unable to update Supabase Auth metadata; the Prisma role was rolled back: ${metadataError.message}`,
        );
      }
    }

    console.log(
      command.mode === 'configured-master'
        ? 'Updated the configured master administrator to role SUPER_ADMIN.'
        : `Updated ${email} to role ${role}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to set role: ${message}`);
  process.exitCode = 1;
});
