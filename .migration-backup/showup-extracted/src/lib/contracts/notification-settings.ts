import { z } from 'zod';

export const NotificationSettingsItem = z.object({
  remind48h: z.boolean(),
  remind24h: z.boolean(),
  remind2h: z.boolean(),
  channelSms: z.boolean(),
  channelEmail: z.boolean(),
  autoFollowUp: z.boolean(),
});
export type NotificationSettingsItem = z.infer<typeof NotificationSettingsItem>;

export const NotificationSettingsPut = NotificationSettingsItem;
export type NotificationSettingsPut = z.infer<typeof NotificationSettingsPut>;
