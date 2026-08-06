import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateClientId, normaliseUserCode, toTimeString } from '../device-utils';
import { parseTTL } from '../utils';

// Feature: better-auth-device-authorization, Property 1: client allowlist matching with whitespace trim
describe('validateClientId', () => {
  it('rejects a clientId not matching any trimmed entry in a non-empty allowlist', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // a raw allowlist entry (may have whitespace)
        fc.string({ minLength: 1 }), // the clientId to test
        (entry, clientId) => {
          fc.pre(entry.trim().length > 0);
          fc.pre(clientId !== entry.trim()); // clientId differs from the trimmed entry
          const allowlistRaw = entry; // single-entry allowlist
          const result = validateClientId(clientId, allowlistRaw);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts a clientId that exactly matches a trimmed entry', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9-]{1,20}$/), // clean client id
        fc.array(fc.string({ maxLength: 5 }), { minLength: 0, maxLength: 3 }), // optional extra entries
        (clientId, extras) => {
          // Build an allowlist entry with surrounding whitespace
          const paddedEntry = `  ${clientId}  `;
          const allowlistRaw = [...extras, paddedEntry].join(',');
          const result = validateClientId(clientId, allowlistRaw);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: better-auth-device-authorization, Property 2: client allowlist allows all when empty or absent
  it('returns true for any clientId when allowlist is undefined', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (clientId) => {
        expect(validateClientId(clientId, undefined)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns true for any clientId when allowlist is empty string', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (clientId) => {
        expect(validateClientId(clientId, '')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: better-auth-device-authorization, Property 3: TTL parsing round-trip consistency
describe('toTimeString + parseTTL round-trip', () => {
  it('parseTTL(toTimeString(n)) === n for any positive integer seconds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 86400 }), (secs) => {
        const timeStr = toTimeString(secs);
        const parsed = parseTTL(timeStr, -1);
        expect(parsed).toBe(secs);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: better-auth-device-authorization, Property 4: user code normalisation is idempotent
describe('normaliseUserCode', () => {
  it('normalise(normalise(code)) === normalise(code) for any string', () => {
    fc.assert(
      fc.property(fc.string(), (code) => {
        const once = normaliseUserCode(code);
        const twice = normaliseUserCode(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });
});
