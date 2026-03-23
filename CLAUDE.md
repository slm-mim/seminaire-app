# CLAUDE.md — seminaire-app

## Project Overview

Seminar management application for non-technical organizers. Handles the full lifecycle: creation, registration, emailing (via Brevo), check-in, live Q&A, and post-event follow-up with Google Drive sync.

## Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: `apps/api/` — NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: `apps/web/` — Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Shared packages**:
  - `packages/shared-types/` — TypeScript enums and DTOs
  - `packages/validation/` — Zod schemas (shared between frontend and backend)
  - `packages/eslint-config/` — Shared ESLint configuration

## Quick Start

```bash
make setup    # Install deps, generate Prisma client, run migrations, build
make dev      # Start Docker services + both apps in watch mode
```

## Key Commands

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `make dev`        | Start all services (Docker + API + Web) |
| `make dev-api`    | Start backend only                      |
| `make dev-web`    | Start frontend only                     |
| `make build`      | Build all packages and apps             |
| `make lint`       | Run ESLint on all apps                  |
| `make test`       | Run all tests                           |
| `make format`     | Format all files with Prettier          |
| `make db-migrate` | Run Prisma migrations                   |
| `make db-studio`  | Open Prisma Studio                      |
| `make db-reset`   | Reset database                          |

## Development URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Swagger docs**: http://localhost:3000/api
- **Prisma Studio**: http://localhost:5555

## Code Standards

- **Language**: TypeScript strict mode everywhere
- **Formatting**: Prettier (single quotes, semicolons, trailing commas, 100 char width)
- **Linting**: ESLint with shared config, import ordering enforced
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `test:`)
- **Testing**: TDD — write failing test first, then implement
- **Validation**: Zod schemas in `packages/validation/`, shared between frontend and backend
- **API documentation**: Swagger/OpenAPI auto-generated via `@nestjs/swagger`

## Project Structure

```
apps/api/           → NestJS backend (port 3000)
apps/web/           → Next.js frontend (port 3001)
packages/shared-types/ → Enums and DTOs
packages/validation/   → Zod schemas
packages/eslint-config/ → ESLint configs
```

## Database

- **Dev/Test**: PostgreSQL via Docker Compose (see docker-compose.yml)
- **Production**: Supabase PostgreSQL
- **ORM**: Prisma — schema in `apps/api/prisma/schema.prisma`
- **Migrations**: `make db-migrate` (wraps `prisma migrate dev`)

## Design Docs

- Spec: `docs/superpowers/specs/2026-03-23-seminaire-app-design.md`
- Plans: `docs/superpowers/plans/`

## Important Notes

- Mobile-first design on ALL interfaces
- Users are non-technical — UI must be intuitive
- All text in French (next-intl configured, ready for i18n)
- Never commit `.env` files — use `.env.example` as reference
- Shared packages must be built before apps (`turbo` handles this via `dependsOn`)
