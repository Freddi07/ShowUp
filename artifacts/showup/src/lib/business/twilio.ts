import 'server-only';

import twilio from 'twilio';
import { env } from '@/lib/env';

export async function sendSms(to: string, body: string): Promise<string> {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({ from: env.TWILIO_PHONE_NUMBER, to, body });
  return message.sid;
}

export async function sendReminderSms(
  to: string,
  appointmentId: string,
  scheduledAt: Date,
): Promise<string> {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const body = `Reminder: your appointment is on ${scheduledAt.toLocaleString()}. Reply YES to confirm, NO to cancel, or RESCHEDULE. [ref:${appointmentId}]`;
  const message = await client.messages.create({
    from: env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });
  return message.sid;
}

export function validateTwilioRequest(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}
