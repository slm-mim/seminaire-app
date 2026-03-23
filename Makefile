.PHONY: dev dev-api dev-web build lint test format clean db-up db-down db-migrate db-studio db-reset setup

# Development
dev: db-up
	pnpm run dev

dev-api:
	pnpm --filter api run dev

dev-web:
	pnpm --filter web run dev

# Build
build:
	pnpm run build

# Quality
lint:
	pnpm run lint

test:
	pnpm run test

format:
	pnpm run format

format-check:
	pnpm run format:check

# Database
db-up:
	docker compose up -d

db-down:
	docker compose down

db-migrate:
	pnpm --filter api exec prisma migrate dev

db-studio:
	pnpm --filter api exec prisma studio

db-reset:
	pnpm --filter api exec prisma migrate reset

db-generate:
	pnpm --filter api exec prisma generate

# Setup (first time)
setup: db-up
	pnpm install
	pnpm --filter api exec prisma generate
	pnpm --filter api exec prisma migrate dev
	pnpm run build
	@echo "Setup complete. Run 'make dev' to start development."

# Cleanup
clean:
	pnpm run clean
