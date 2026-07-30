import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const accounts = await auth.api.listUserAccounts({ headers: request.headers });
  const hasPassword = accounts.some((a: any) => a.providerId === 'credential');
  if (hasPassword) {
    return new Response(JSON.stringify({ error: 'Password already set. Use change password instead.' }), { status: 400 });
  }

  const { newPassword } = await request.json();
  if (!newPassword) {
    return new Response(JSON.stringify({ error: 'newPassword is required' }), { status: 400 });
  }

  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: request.headers,
    });
    return new Response(JSON.stringify({ status: true }), { status: 200 });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Failed to set password' }),
      { status: err.status ?? 400 },
    );
  }
};
