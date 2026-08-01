import { createAuthClient } from 'better-auth/react';
import { usernameClient, phoneNumberClient, magicLinkClient, emailOTPClient, adminClient, twoFactorClient, lastLoginMethodClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

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
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
