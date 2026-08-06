import { createAuthClient } from 'better-auth/react';
import { usernameClient, phoneNumberClient, magicLinkClient, emailOTPClient, adminClient, twoFactorClient, lastLoginMethodClient, organizationClient, deviceAuthorizationClient } from 'better-auth/client/plugins';
import { apiKeyClient } from '@better-auth/api-key/client';
import { passkeyClient } from '@better-auth/passkey/client';
import { ac } from './permissions';

export const authClient = createAuthClient({
  baseURL: import.meta.env.BETTER_AUTH_URL || 'http://localhost:4321',
  plugins: [
    usernameClient(),
    phoneNumberClient(),
    magicLinkClient(),
    emailOTPClient(),
    twoFactorClient({ 
      onTwoFactorRedirect: () => {
        const url = new URL(window.location.href);
        const callbackURL = url.searchParams.get('callbackURL');
        window.location.href = `/two-factor${callbackURL ? `?callbackURL=${encodeURIComponent(callbackURL)}` : ''}`;
      }
    }),
    passkeyClient(),
    adminClient(),
    lastLoginMethodClient(),
    organizationClient({
      ac: ac,
      teams: {
        enabled: true
      },
      dynamicAccessControl: {
        enabled: true
      }
    }),
    apiKeyClient(),
    deviceAuthorizationClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
