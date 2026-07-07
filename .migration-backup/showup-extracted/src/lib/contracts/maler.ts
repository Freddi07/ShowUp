import { z } from 'zod';

export const TemplateTypeSchema = z.enum(['reminder_24h', 'reminder_2h', 'confirmation']);
export type TemplateType = z.infer<typeof TemplateTypeSchema>;

export const TemplateLanguageSchema = z.enum(['no', 'en']);
export type TemplateLanguage = z.infer<typeof TemplateLanguageSchema>;

export const TemplateItem = z.object({
  id: z.string(),
  type: TemplateTypeSchema,
  language: TemplateLanguageSchema,
  body: z.string(),
  updatedAt: z.string(),
});
export type TemplateItem = z.infer<typeof TemplateItem>;

export const TemplateList = z.object({
  items: z.array(TemplateItem),
});
export type TemplateList = z.infer<typeof TemplateList>;

export const TemplateUpsert = z.object({
  language: TemplateLanguageSchema,
  body: z.string().min(1).max(1600),
});
export type TemplateUpsert = z.infer<typeof TemplateUpsert>;
