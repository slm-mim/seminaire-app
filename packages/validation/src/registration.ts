import { z } from 'zod';

export const registrationSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis').max(100),
  lastName: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide'),
  city: z.string().min(1, 'La ville est requise').max(100),
  phone: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions' }),
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
