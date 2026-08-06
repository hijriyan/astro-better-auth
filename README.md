# Astro Better Auth

A minimal, production-ready starter kit featuring Astro, React, and Better Auth.

## Tech Stack

- **Framework**: [Astro](https://astro.build/) & [React](https://react.dev/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) & [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)

## Features

This starter kit pre-integrates several powerful features directly into Astro, allowing you to hit the ground running:

- **Advanced Authentication**: Better Auth is natively integrated as an Astro API endpoint, featuring Email/Password, Passkeys, and a custom UI for Device Authorization flows out of the box.
- **Robust Security**: Built-in strict Two-Factor Authentication (2FA), Cloudflare Turnstile CAPTCHA integration for bot protection, and password checks against compromised databases (Have I Been Pwned).
- **Multi-Tenant Organizations**: Fully configured with Better Auth's Organization plugin, providing built-in team management, role-based access control (RBAC), and member invitations.
- **Developer API Keys**: An integrated API key management system with granular permission scopes and customizable prefixes, complete with an interactive UI for your end-users.
- **Admin Management**: Pre-configured admin roles and capabilities to oversee users and organizations.
- **React & shadcn/ui Ecosystem**: Pre-configured with `@astrojs/react`, Tailwind CSS v4, and a suite of `shadcn/ui` components for rapid, beautiful UI development.
- **Seamless Theming**: Built-in dark mode support using `next-themes` that automatically adapts your Astro and React components to the user's preferred color scheme.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (optional, for local PostgreSQL)

### Installation

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Configure environment**
   Copy the example environment variables:
   ```sh
   cp .env.example .env
   ```
   Start the local database (if needed):
   ```sh
   docker compose up -d postgres
   ```

3. **Set up the database**
   Generate the authentication schema and push it to the database:
   ```sh
   npm run db:generate
   npm run db:migrate
   ```

4. **Start the server**
   ```sh
   npm run dev
   ```
