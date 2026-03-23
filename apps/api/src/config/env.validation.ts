import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  BREVO_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;
