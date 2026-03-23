import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
