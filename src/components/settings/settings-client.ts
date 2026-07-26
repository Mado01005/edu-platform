import type { SettingsNotice } from '@/components/settings/types';

interface ApiErrorBody {
  error?: string;
  user?: {
    phoneNumber?: string | null;
    phoneVerified?: boolean;
  };
}

export async function saveSettingsSection(
  section: 'learning' | 'notifications' | 'profile',
  values: Record<string, unknown>,
) {
  const response = await fetch('/api/settings', {
    body: JSON.stringify({ section, values }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });
  const result = (await response.json()) as ApiErrorBody;

  if (!response.ok) {
    throw new Error(result.error ?? 'Unable to save these settings.');
  }

  return result;
}

export function errorNotice(
  error: unknown,
  fallback: string,
): SettingsNotice {
  return {
    message: error instanceof Error ? error.message : fallback,
    type: 'error',
  };
}
