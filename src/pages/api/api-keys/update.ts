import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';

/**
 * PATCH /api/api-keys/update
 *
 * Server-side proxy for updating API keys with server-only parameters
 * that the Better Auth client plugin doesn't expose.
 *
 * Body:
 *   configId        string   required
 *   keyId           string   required
 *   name            string?
 *   enabled         boolean?
 *   permissions     object?  { [resource]: string[] } | null (null clears permissions)
 *   -- server-only params --
 *   rateLimitEnabled     boolean?
 *   rateLimitMax         number?
 *   rateLimitTimeWindow  number?  (ms)
 *   remaining            number?
 *   refillAmount         number?
 *   refillInterval       number?  (ms)
 *   expiresIn            number?  (seconds, null = never expires)
 *   metadata             object?
 */
export const PATCH: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { configId, keyId, name, enabled, permissions, ...serverOnlyParams } = body;

  if (!configId || typeof configId !== 'string') {
    return new Response(JSON.stringify({ error: 'configId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!keyId || typeof keyId !== 'string') {
    return new Response(JSON.stringify({ error: 'keyId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const updateBody: Record<string, unknown> = { 
      configId, 
      keyId,
      userId: session.user.id
    };

    if (name !== undefined) updateBody.name = name;
    if (enabled !== undefined) updateBody.enabled = enabled;
    // null is intentional — it clears permissions on the key
    if (permissions !== undefined) updateBody.permissions = permissions;

    const allowed = [
      'rateLimitEnabled', 'rateLimitMax', 'rateLimitTimeWindow',
      'remaining', 'refillAmount', 'refillInterval', 'expiresIn', 'metadata',
    ];
    for (const key of allowed) {
      if (serverOnlyParams[key] !== undefined) {
        updateBody[key] = serverOnlyParams[key];
      }
    }

    const result = await auth.api.updateApiKey({
      body: updateBody as any,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[api-keys/update]', err);
    const status = typeof err?.status === 'number' ? err.status : 500;
    const isProd = import.meta.env.PROD;
    const errorMessage = isProd ? 'Failed to update API key' : (err?.message || 'Failed to update API key');
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
