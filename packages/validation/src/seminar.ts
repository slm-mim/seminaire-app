import { z } from 'zod';

export const createSeminarSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().min(1, 'La description est requise'),
  speaker: z.string().min(1, "L'intervenant est requis").max(200),
  price: z.number().min(0, 'Le prix doit être positif'),
  date: z.string().datetime('Date invalide'),
  location: z.string().min(1, 'Le lieu est requis').max(300),
  image: z.string().url('URL invalide').nullable().optional(),
  registrationDeadline: z.number().int().min(1, 'Minimum 1 heure'),
  reminderDays: z.number().int().min(1, 'Minimum 1 jour'),
});

export type CreateSeminarInput = z.infer<typeof createSeminarSchema>;

export const updateSeminarSchema = createSeminarSchema.partial();

export type UpdateSeminarInput = z.infer<typeof updateSeminarSchema>;
