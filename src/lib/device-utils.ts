/**
 * Converts an integer number of seconds to a Better Auth TimeString.
 * e.g. 30 → "30s"
 */
export function toTimeString(secs: number): `${number}s` {
  return `${secs}s`;
}

/**
 * Validates a client_id against a comma-separated allowlist string
 * (the DEVICE_CODE_ALLOWED_CLIENTS env var format).
 *
 * Returns true (allow-all) when allowlistRaw is absent or resolves to an empty list.
 * Returns true when clientId exactly matches (case-sensitive) at least one trimmed entry.
 * Returns false otherwise.
 */
export function validateClientId(
  clientId: string,
  allowlistRaw: string | undefined,
): boolean {
  if (!allowlistRaw || allowlistRaw.trim() === '') return true;
  const allowed = allowlistRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(clientId);
}

/**
 * Normalises a user code string: trim whitespace, uppercase, strip hyphens.
 * Applying this function twice produces the same result as once (idempotent).
 */
export function normaliseUserCode(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, '');
}
