import { z } from 'zod';

export const createContactSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Le prénom est requis').max(100),
  lastName: z.string().min(1, 'Le nom est requis').max(100),
  city: z.string().min(1, 'La ville est requise').max(100),
  phone: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial().required({ email: true });

export type UpdateContactInput = z.infer<typeof updateContactSchema>;
