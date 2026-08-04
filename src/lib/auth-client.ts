import { createAuthClient } from 'better-auth/react';
import { usernameClient, phoneNumberClient, magicLinkClient, emailOTPClient, adminClient, twoFactorClient, lastLoginMethodClient, organizationClient } from 'better-auth/client/plugins';
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
    twoFactorClient({ twoFactorPage: '/two-factor' }),
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
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
