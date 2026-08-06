import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username, phoneNumber, magicLink, emailOTP, admin, haveIBeenPwned, lastLoginMethod, organization, deviceAuthorization, bearer, captcha } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { toTimeString, validateClientId } from './device-utils';
import { twoFactorStrict } from './plugins/two-factor-strict';
import { passkey } from '@better-auth/passkey';
import { db } from '../db';
import * as authSchema from '../db/auth-schema';
import { email } from './email';
import { MagicLinkEmail } from './email/templates/magic-link';
import { VerifyEmail } from './email/templates/verify-email';
import { ResetPasswordEmail } from './email/templates/reset-password';
import { OtpEmail } from './email/templates/otp';
import { InvitationEmail } from './email/templates/invitation';
import 'dotenv/config';
import { parseTTL, formatTTL } from './utils';
import { ac, adminRole, memberRole, ownerRole } from './permissions';

const OTP_TTL = parseTTL(process.env.ONE_TIME_CODE_TTL, 60); // 1 minute default
const LINK_TTL = parseTTL(process.env.ONE_TIME_LINK_TTL, 600); // 10 minutes default
const INVITATION_TTL = parseTTL(process.env.INVITATION_EXPIRES_IN, 172800); // 48 hours default
const ORG_LIMIT = parseInt(process.env.ORGANIZATION_LIMIT || '3', 10);
const MEMBERSHIP_LIMIT = parseInt(process.env.MEMBERSHIP_LIMIT || '5', 10);

function validateDeviceTTL(
  envKey: string,
  raw: string | undefined,
  min: number,
  max: number,
  defaultSecs: number,
): number {
  if (!raw) return defaultSecs;
  const ttlPattern = /^[0-9]+[smhd]$/;
  if (!ttlPattern.test(raw)) {
    console.error(`[auth] ${envKey}="${raw}" is invalid (expected format: ^[0-9]+[smhd]$). Refusing to start.`);
    process.exit(1);
  }
  const secs = parseTTL(raw, defaultSecs);
  if (secs < min || secs > max) {
    console.error(`[auth] ${envKey}="${raw}" resolves to ${secs}s which is outside the allowed range [${min}s, ${max}s]. Refusing to start.`);
    process.exit(1);
  }
  return secs;
}

const DEVICE_CODE_EXPIRES_IN = validateDeviceTTL('DEVICE_CODE_EXPIRES_IN', process.env.DEVICE_CODE_EXPIRES_IN, 60, 86400, 1800);
const DEVICE_CODE_INTERVAL_RAW = parseInt(process.env.DEVICE_CODE_INTERVAL || '5', 10);
const DEVICE_CODE_INTERVAL = (Number.isInteger(DEVICE_CODE_INTERVAL_RAW) && DEVICE_CODE_INTERVAL_RAW >= 1 && DEVICE_CODE_INTERVAL_RAW <= 3600)
  ? DEVICE_CODE_INTERVAL_RAW
  : (() => {
      if (process.env.DEVICE_CODE_INTERVAL) {
        console.error(`[auth] DEVICE_CODE_INTERVAL="${process.env.DEVICE_CODE_INTERVAL}" is invalid (expected integer 1-3600). Refusing to start.`);
        process.exit(1);
      }
      return 5;
    })();

export const auth = betterAuth({
  appName: process.env.APP_NAME || "astro-better-auth",
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL!],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: LINK_TTL,
    sendResetPassword: async ({ user, url }) => {
      await email.send({
        to: user.email,
        subject: 'Reset your password',
        react: ResetPasswordEmail({ url, email: user.email, description: `We received a request to reset the password for <strong>${user.email}</strong>. Click the button below to choose a new password. This link expires in ${formatTTL(LINK_TTL)}.` }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    expiresIn: LINK_TTL,
    sendVerificationEmail: async ({ user, url }) => {
      const verifyUrl = new URL(url);
      const originalCallbackUrl = verifyUrl.searchParams.get('callbackURL');
      
      const targetUrl = new URL('/sign-in', process.env.BETTER_AUTH_URL);
      if (originalCallbackUrl) {
        targetUrl.searchParams.set('callbackURL', originalCallbackUrl);
      }
      
      verifyUrl.searchParams.set('callbackURL', targetUrl.toString());
      await email.send({
        to: user.email,
        subject: 'Verify your email address',
        react: VerifyEmail({
          url: verifyUrl.toString(),
          email: user.email,
          title: 'Verify your email address',
          description: `Thanks for signing up! Click the button below to verify <strong>${user.email}</strong> and activate your account. This link expires in ${formatTTL(LINK_TTL)}.`,
          buttonLabel: 'Verify Email',
        }),
      });
    },
  },

  plugins: [
    username(),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        // ponytail: no SMS provider configured, sending OTP via email as fallback
        // upgrade path: replace with SMS provider (Twilio, AWS SNS, etc.)
        await email.send({
          to: phoneNumber,
          subject: 'Your phone verification code',
          react: OtpEmail({
            otp: code,
            email: phoneNumber,
            title: 'Your phone verification code',
            description: `Use the code below to verify your phone number. It expires in ${formatTTL(OTP_TTL)}.`,
          }),
        });
      },
    }),
    magicLink({
      expiresIn: LINK_TTL,
      sendMagicLink: async ({ email: to, url }) => {
        await email.send({
          to,
          subject: 'Your magic sign-in link',
          react: MagicLinkEmail({ url, email: to, description: `Click the button below to sign in as <strong>${to}</strong>. This link expires in ${formatTTL(LINK_TTL)}.` }),
        });
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email: to, otp, type }) {
        const templates: Record<string, { subject: string; title: string; description: string }> = {
          'sign-in': {
            subject: 'Your sign-in code',
            title: 'Your sign-in code',
            description: `Use the code below to sign in as <strong>${to}</strong>. It expires in ${formatTTL(OTP_TTL)}.`,
          },
          'email-verification': {
            subject: 'Verify your email address',
            title: 'Verify your email address',
            description: `Use the code below to verify <strong>${to}</strong>. It expires in ${formatTTL(OTP_TTL)}.`,
          },
          'change-email': {
            subject: 'Verify your new email address',
            title: 'Verify your new email address',
            description: `Use the code below to confirm changing your email to <strong>${to}</strong>. It expires in ${formatTTL(OTP_TTL)}.`,
          },
          'forget-password': {
            subject: 'Reset your password',
            title: 'Reset your password',
            description: `Use the code below to reset the password for <strong>${to}</strong>. It expires in ${formatTTL(OTP_TTL)}.`,
          },
        };
        const t = templates[type] ?? {
          subject: 'Your verification code',
          title: 'Your verification code',
          description: `Use the code below for <strong>${to}</strong>. It expires in ${formatTTL(OTP_TTL)}.`,
        };
        await email.send({
          to,
          subject: t.subject,
          react: OtpEmail({ otp, email: to, title: t.title, description: t.description }),
        });
      },
      otpLength: 6,
      expiresIn: OTP_TTL,
      changeEmail: {
        enabled: true,
        verifyCurrentEmail: true,
      },
    }),
    twoFactorStrict({
      allowPasswordless: true,
      otpOptions: {
        async sendOTP({ user, otp }) {
          await email.send({
            to: user.email,
            subject: 'Your two-factor authentication code',
            react: OtpEmail({
              otp,
              email: user.email,
              title: 'Your two-factor authentication code',
              description: `Use the code below to complete your sign-in. It expires in ${formatTTL(OTP_TTL)}.`,
            }),
          });
        },
      },
    }),
    passkey(),
    admin({
      adminUserIds: (process.env.ADMIN_USER_IDS || '').split(',').map(v => v.trim()).filter(Boolean)
    }),
    haveIBeenPwned(),
    lastLoginMethod({
      storeInDatabase: true
    }),
    organization({
      ac: ac,
      roles: {
        admin: adminRole,
        member: memberRole,
        owner: ownerRole,
      },
      allowUserToCreateOrganization: true,
      organizationLimit: ORG_LIMIT,
      membershipLimit: MEMBERSHIP_LIMIT,
      teams: {
        enabled: true,
      },
      dynamicAccessControl: {
        enabled: true,
      },
      requireEmailVerificationOnInvitation: true,
      cancelPendingInvitationsOnReInvite: true,
      invitationExpiresIn: INVITATION_TTL,
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        try {
          await email.send({
            to: data.email,
            subject: "You've been invited to join an organization",
            react: InvitationEmail({
              url: inviteLink,
              email: data.email,
              inviterName: data.inviter?.user?.name || data.inviter?.user?.email,
              organizationName: data.organization?.name,
            }),
          });
        } catch (err) {
          // Log but don't rethrow — a failed email should not roll back the invitation record.
          console.error('[sendInvitationEmail] Failed to send invitation email to', data.email, err);
        }
      },
    }),
    apiKey([
      { configId: 'user-keys', references: 'user', defaultPrefix: 'usr_' },
      { configId: 'org-keys', references: 'organization', defaultPrefix: 'org_' }
    ]),
    deviceAuthorization({
      verificationUri: '/device',
      expiresIn: toTimeString(DEVICE_CODE_EXPIRES_IN),
      interval: toTimeString(DEVICE_CODE_INTERVAL),
      validateClient: async (clientId: string) =>
        validateClientId(clientId, process.env.DEVICE_CODE_ALLOWED_CLIENTS),
    }),
    bearer(),
    captcha({
      provider: 'cloudflare-turnstile',
      secretKey: process.env.TURNSTILE_SECRET!,
    }),
  ],

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type Auth = typeof auth;
