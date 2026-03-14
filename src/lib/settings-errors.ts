/**
 * Shared error key mapping for settings forms (auth/subscription errors from API or server actions).
 * Use with useTranslations('errors') to get the translated message.
 */
export const SETTINGS_ERROR_KEYS: Record<string, string> = {
  Unauthorized: 'unauthorized',
  'No organization': 'noOrganization',
  'Subscription required': 'subscriptionRequired',
} as const;

export type SettingsErrorKey = keyof typeof SETTINGS_ERROR_KEYS;

/**
 * Returns the translation key for a given API/action error message, or the original message if unknown.
 */
export function getSettingsErrorKey(error: string | undefined): string | undefined {
  if (!error) return undefined;
  return SETTINGS_ERROR_KEYS[error] ?? undefined;
}
