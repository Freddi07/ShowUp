import { z } from 'zod';

export const ApiKeyResponse = z.object({
  apiKey: z.string().nullable(),
});
export type ApiKeyResponse = z.infer<typeof ApiKeyResponse>;
