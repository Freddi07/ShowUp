import 'server-only';
import { validateTwilioRequest } from '@/lib/business/twilio';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

function twimlResponse(body: string = TWIML_EMPTY): Response {
  return new Response(body, {
    headers: { 'content-type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);
  const paramsObj: Record<string, string> = {};
  params.forEach((value, key) => {
    paramsObj[key] = value;
  });

  const signature = req.headers.get('x-twilio-signature') ?? '';
  const host = req.headers.get('host') ?? '';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const url = `${proto}://${host}/api/sms/webhook`;

  if (!validateTwilioRequest(env.TWILIO_AUTH_TOKEN, url, paramsObj, signature)) {
    return new Response(TWIML_EMPTY, { status: 403, headers: { 'content-type': 'text/xml' } });
  }

  const smsBody: string = paramsObj.Body ?? '';
  const from: string = paramsObj.From ?? '';

  if (!from) {
    return twimlResponse();
  }

  const refMatch = smsBody.match(/\[ref:([^\]]+)\]/);
  const appointmentId = refMatch?.[1];
  if (!appointmentId) {
    return twimlResponse();
  }

  const keyword = smsBody.trim().toUpperCase().split(/\s+/).at(0) ?? '';
  const statusMap: Record<string, string> = {
    YES: 'CONFIRMED',
    NO: 'CANCELLED',
    RESCHEDULE: 'RESCHEDULE_REQUESTED',
  };
  const newStatus = statusMap[keyword];
  if (!newStatus) {
    return twimlResponse();
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.status !== 'REMINDED') {
    return twimlResponse();
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: newStatus as 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULE_REQUESTED' },
  });

  return twimlResponse();
}
