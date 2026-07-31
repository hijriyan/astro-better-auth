# Astro Better Auth Starter Kit

A comprehensive, production-ready full-stack authentication starter kit built with **Astro 5**, **React 19**, **Better Auth**, **Drizzle ORM**, **PostgreSQL**, and **Tailwind CSS v4**.

This repository features enterprise-grade authentication workflows including Email & Password with verification, Passwordless Magic Links, 6-digit Email/Phone OTP, WebAuthn Passkeys, Strict Multi-Factor Authentication (2FA), Social OAuth (Google & GitHub), Role-Based Access Control (RBAC), custom React Email templates, and a full-featured Shadcn UI dashboard.

---

## 🚀 Features

### 🔐 Authentication & Security
- **Email & Password**: Account registration with mandatory email verification, password reset, and secure password hashing.
- **Passwordless Sign-In**: Magic Link authentication delivered via email.
- **One-Time Password (OTP)**: 6-digit verification codes for sign-in, account verification, email updates, and password resets.
- **Passkeys / WebAuthn**: FIDO2 hardware security keys, Touch ID, Face ID, and biometric passwordless sign-in via `@better-auth/passkey`.
- **Phone Number Authentication**: OTP verification for mobile phone numbers with modular email/SMS provider fallback.
- **Social OAuth Providers**: Configurable Google and GitHub OAuth providers with auto-detection based on environment secrets.
- **Strict Two-Factor Authentication (2FA)**: Custom 2FA handler supporting passwordless OTP step-up verification.
- **Role-Based Access Control (RBAC)**: Admin and User roles with server-side page guards (`requireAuth` and `requireAdmin`).

### 🎨 User Interface & Experience
- **Interactive Dashboard**: Pre-built dashboard layout featuring interactive area charts (Recharts), statistics cards, and server-side data tables (TanStack Table).
- **Account Management Center**: User profile management (name, username, avatar via Gravatar fallback), email/phone verification status, social account linking, passkey registration, and security preferences.
- **Theme Support**: Seamless Dark Mode / Light Mode toggling powered by `next-themes`.
- **Responsive Navigation**: Mobile-optimized collapsible sidebar, user dropdown menus, and header navigation.

### ✉️ Email Architecture
- **Dual Email Backend**:
  - `console`: Logs formatted emails to stdout (default for development without credentials).
  - `smtp`: Delivers HTML emails via Nodemailer.
- **React Email Templates**: Clean, responsive HTML email templates powered by `@react-email/render` (Magic Link, Email Verification, Password Reset, and OTP).

### 🗄️ Database & Developer Tools
- **PostgreSQL**: Powered by `postgres` / `pg` driver with Docker Compose setup included.
- **Drizzle ORM**: Type-safe schema definition, automated migrations, and interactive database browser via Drizzle Studio.
- **Automated Schema Sync**: One-command Better Auth schema generation (`npm run db:generate`).

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Astro v5](https://astro.build/) | SSR Web Framework with Server Output |
| **UI Library** | [React 19](https://react.dev/) | Client-side interactive components & forms |
| **Auth Engine** | [Better Auth](https://www.better-auth.com/) | Modern typescript-first authentication library |
| **Database ORM** | [Drizzle ORM](https://orm.drizzle.team/) | TypeScript ORM for SQL databases |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Relational Database System |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) | Modern utility-first styling & component primitives |
| **Email Engine** | [React Email](https://react.email/) & [Nodemailer](https://nodemailer.com/) | Component-driven transactional email templates |
| **Data Viz** | [Recharts](https://recharts.org/) & [TanStack Table](https://tanstack.com/table) | Charts, analytics, and data grid components |

---

## ⚡ Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker & Docker Compose**: (Optional, for running PostgreSQL locally)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/hijriyan/astro-better-auth.git
cd astro-better-auth
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to create your local `.env` configuration file:

```bash
cp .env.example .env
```

Update `.env` with your secret keys and database configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bauth

# Better Auth Configuration
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=http://localhost:4321

# Email Backend (console | smtp)
EMAIL_BACKEND=console

# Social OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 3. Start PostgreSQL Database

Using Docker Compose:

```bash
docker compose up -d
```

### 4. Run Database Migrations

Generate schema files and apply migrations to PostgreSQL:

```bash
# Push schema directly to database
npm run db:push

# Alternatively, generate migration files and migrate
npm run db:migrate
```

### 5. Start Development Server

Launch the Astro development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:4321`.

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://...` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | **Yes** | — | Cryptographic secret used by Better Auth to sign tokens |
| `BETTER_AUTH_URL` | **Yes** | `http://localhost:4321` | Base URL of the application |
| `EMAIL_BACKEND` | No | `console` | Select email delivery method (`console` or `smtp`) |
| `SMTP_HOST` | If `smtp` | — | Hostname of the SMTP server |
| `SMTP_PORT` | If `smtp` | `587` | Port of the SMTP server |
| `SMTP_SECURE` | If `smtp` | `false` | Enable TLS/SSL connection for SMTP |
| `SMTP_USER` | If `smtp` | — | SMTP authentication username |
| `SMTP_PASS` | If `smtp` | — | SMTP authentication password |
| `SMTP_FROM` | If `smtp` | — | Default email `From` sender address header |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth App Client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth App Client Secret |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth App Client Secret |

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Astro dev server at `http://localhost:4321` |
| `npm run build` | Compile standalone Astro production build |
| `npm run preview` | Local preview of the production build |
| `npm run auth:generate` | Generate Better Auth Drizzle schema file (`auth-schema.ts`) |
| `npm run db:generate` | Run `auth:generate` and create Drizzle migration SQL files |
| `npm run db:migrate` | Execute pending database migrations |
| `npm run db:push` | Synchronize Drizzle schema directly to PostgreSQL database |
| `npm run db:studio` | Open interactive Drizzle Studio database manager |

---

## 🛡️ Route Protection & Session Guards

The application provides helper utilities in `src/lib/session.ts` to protect Astro SSR pages and API routes:

### Protecting Pages (`requireAuth` & `requireAdmin`)

```astro
---
// src/pages/protected-page.astro
import DashboardLayout from '../layouts/DashboardLayout.astro';
import { requireAuth, requireAdmin } from '../lib/session';

// Ensures user is logged in, redirects to /sign-in otherwise
const session = await requireAuth(Astro);

// To restrict route to Admin users only:
// const session = await requireAdmin(Astro);
---

<DashboardLayout title="Protected Page">
  <h1>Welcome back, {session.user.name}!</h1>
</DashboardLayout>
```

---

## 📬 Email System Configuration

### Console Backend (Development)
When `EMAIL_BACKEND=console` (default), emails are logged directly to the terminal console without requiring an actual SMTP connection:

```text
[Email Backend: console]
To: user@example.com
Subject: Verify your email address
HTML Content: ...
```

### SMTP Backend (Production)
Set `EMAIL_BACKEND=smtp` in `.env` and provide your SMTP details to send real transactional emails using Nodemailer and React Email templates.

---

## 🐳 Production Deployment

This project uses `@astrojs/node` adapter in `standalone` server mode.

### Build and Run

```bash
# Build the production bundle
npm run build

# Start the Node.js standalone server
node ./dist/server/entry.mjs
```

---

## 📄 License

This project is open-source software under the [MIT License](LICENSE).
