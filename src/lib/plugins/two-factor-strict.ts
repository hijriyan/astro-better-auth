import { createAuthMiddleware } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins';
import { deleteSessionCookie } from 'better-auth/cookies';
import { generateRandomString } from 'better-auth/crypto';
import type { TwoFactorOptions } from 'better-auth/plugins';
import type { HookEndpointContext } from 'better-auth';
import type { MiddlewareInputContext, MiddlewareOptions } from 'better-call';

interface TwoFactorHooksOptions extends TwoFactorOptions {
  /**
   * Page to redirect to for the 2FA challenge.
   * Used for OAuth callbacks and magic link — browser-navigation flows
   * where the built-in JSON response can't be intercepted by the client SDK.
   * @default '/two-factor'
   */
  twoFactorPage?: string;
}

type HookEntry = {
  matcher: (context: HookEndpointContext) => boolean;
  handler: (inputContext: MiddlewareInputContext<MiddlewareOptions>) => Promise<unknown>;
};

/**
 * better-auth-2fa-hooks
 *
 * Drop-in replacement for `twoFactor(...)` that extends 2FA gating to
 * OAuth callbacks and magic-link sign-ins.
 *
 * Built-in twoFactor hook only covers password-based paths:
 *   /sign-in/email | /sign-in/username | /sign-in/phone-number
 * These return JSON { twoFactorRedirect: true } which twoFactorClient picks up.
 *
 * OAuth + magic link are browser navigations — JSON response is useless.
 * This plugin adds a second hook for those paths that mirrors what the built-in
 * handler does, but ends with a server-side redirect to `twoFactorPage`.
 *
 * Usage:
 *   plugins: [twoFactorStrict({ twoFactorPage: '/two-factor', otpOptions: { ... } })]
 *
 * Do NOT register both twoFactor and twoFactorHooks.
 */
export function twoFactorStrict(options?: TwoFactorHooksOptions) {
  const { twoFactorPage = '/two-factor', ...twoFactorOptions } = options ?? {};
  const base = twoFactor(twoFactorOptions);
  const maxAge = twoFactorOptions.twoFactorCookieMaxAge ?? 600;

  const browserNavHandler = createAuthMiddleware(async (ctx) => {
    const data = (ctx.context as any).newSession as any;
    if (!data?.user?.twoFactorEnabled) return;

    // ponytail: no trusted-device check for OAuth/magic-link paths —
    // trust-device cookie is only set after a password sign-in, not a social login.
    // upgrade path: check trust-device cookie here if cross-provider trust is needed.

    // Mirror what built-in handler does — delete session, create 2FA challenge.
    deleteSessionCookie(ctx as any, true);
    await (ctx.context as any).internalAdapter.deleteSession(data.session.token);
    (ctx.context as any).setNewSession(null);

    const twoFactorCookie = (ctx.context as any).createAuthCookie('two_factor', { maxAge });
    const identifier = `2fa-${generateRandomString(20)}`;
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    await (ctx.context as any).internalAdapter.createVerificationValue({
      value: data.user.id,
      identifier,
      expiresAt,
    });
    await (ctx.context as any).internalAdapter.createVerificationValue({
      value: '0',
      identifier: `2fa-attempts-${identifier}`,
      expiresAt,
    });

    await ctx.setSignedCookie(
      twoFactorCookie.name,
      identifier,
      (ctx.context as any).secret,
      twoFactorCookie.attributes,
    );

    throw ctx.redirect(twoFactorPage);
  });

  return {
    ...base,
    hooks: {
      after: [
        // Password sign-ins: built-in handler returns JSON → twoFactorClient redirects.
        base.hooks.after[0],
        // OAuth callbacks + magic link: browser navigation → must redirect server-side.
        {
          matcher(ctx: HookEndpointContext) {
            return ctx.path?.startsWith('/callback/') || ctx.path === '/magic-link/verify';
          },
          handler: browserNavHandler,
        },
      ] as HookEntry[],
    },
  };
}
