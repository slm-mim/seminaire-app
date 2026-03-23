import { z } from 'zod';

export const submitQuestionSchema = z.object({
  content: z.string().min(1, 'La question ne peut pas être vide').max(500),
  authorName: z.string().max(100).optional(),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'Veuillez sélectionner Homme ou Femme' }),
  }),
});

export type SubmitQuestionInput = z.infer<typeof submitQuestionSchema>;
