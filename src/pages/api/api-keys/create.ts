import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';

/**
 * POST /api/api-keys/create
 *
 * Server-side proxy for creating API keys with server-only parameters
 * that the Better Auth client plugin doesn't expose (rate limiting,
 * quota, expiry, etc.). Requires an active user session.
 *
 * Body:
 *   configId        string   required
 *   name            string   required
 *   organizationId  string?  required for org-keys config
 *   permissions     object?  { [resource]: string[] }
 *   -- server-only params --
 *   rateLimitEnabled     boolean?
 *   rateLimitMax         number?
 *   rateLimitTimeWindow  number?  (ms)
 *   remaining            number?
 *   refillAmount         number?
 *   refillInterval       number?  (ms)
 *   expiresIn            number?  (seconds)
 *   metadata             object?  (requires enableMetadata: true in config)
 */
export const POST: APIRoute = async ({ request }) => {
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

  const { configId, name, organizationId, permissions, ...serverOnlyParams } = body;

  if (!configId || typeof configId !== 'string') {
    return new Response(JSON.stringify({ error: 'configId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!name || typeof name !== 'string') {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKeyBody: Record<string, unknown> = {
      configId,
      name,
      userId: session.user.id,
    };

    if (organizationId) apiKeyBody.organizationId = organizationId;
    if (permissions && typeof permissions === 'object') apiKeyBody.permissions = permissions;

    // Merge server-only params, filtering out undefined/null values
    const allowed = [
      'rateLimitEnabled', 'rateLimitMax', 'rateLimitTimeWindow',
      'remaining', 'refillAmount', 'refillInterval', 'expiresIn', 'metadata',
    ];
    for (const key of allowed) {
      if (serverOnlyParams[key] !== undefined && serverOnlyParams[key] !== null) {
        apiKeyBody[key] = serverOnlyParams[key];
      }
    }

    const result = await auth.api.createApiKey({
      body: apiKeyBody as any,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[api-keys/create]', err);
    const status = typeof err?.status === 'number' ? err.status : 500;
    const isProd = import.meta.env.PROD;
    const errorMessage = isProd ? 'Failed to create API key' : (err?.message || 'Failed to create API key');
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
