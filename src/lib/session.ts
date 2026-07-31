import { auth } from './auth';
import type { APIContext } from 'astro';

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireAuth(context: APIContext) {
  const session = await getSession(context.request);
  
  if (!session) {
    return context.redirect('/sign-in');
  }
  
  return session;
}

export async function requireAdmin(context: APIContext) {
  const session = await requireAuth(context);
  
  if (session instanceof Response) {
    return session;
  }
  
  if (session.user.role !== 'admin') {
    return context.redirect('/');
  }
  
  return session;
}
