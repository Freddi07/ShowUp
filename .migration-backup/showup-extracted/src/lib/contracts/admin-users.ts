import { z } from 'zod';

export const AdminUserItem = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  businessType: z.string().nullable(),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
  banned: z.boolean(),
});
export type AdminUserItem = z.infer<typeof AdminUserItem>;

export const AdminUsersResponse = z.object({
  users: z.array(AdminUserItem),
  total: z.number(),
});
export type AdminUsersResponse = z.infer<typeof AdminUsersResponse>;

export const AdminActionResponse = z.object({ ok: z.boolean() });
export type AdminActionResponse = z.infer<typeof AdminActionResponse>;
