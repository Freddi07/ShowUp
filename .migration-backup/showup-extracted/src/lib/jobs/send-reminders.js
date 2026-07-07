require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

const required = ['DATABASE_URL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
for (const key of required) {
  if (!process.env[key]) {
    process.stderr.write(`Missing required env var: ${key}\n`);
    process.exit(1);
  }
}

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function interpolate(template, values) {
  return template.replace(/\{\{[^}]+\}\}/g, (match) => values[match] ?? match);
}

function formatDate(date) {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

async function main() {
  const due = await prisma.appointment.findMany({
    where: { reminderAt: { lte: new Date() }, status: 'PENDING' },
    include: { customer: true },
  });

  process.stdout.write(`Found ${due.length} appointment(s) to remind.\n`);

  const now = new Date();

  for (const appt of due) {
    try {
      let body;

      const userId = appt.customer?.userId;
      if (userId) {
        const hoursUntil = (appt.scheduledAt - now) / (1000 * 60 * 60);
        const templateType = hoursUntil >= 20 ? 'reminder_24h' : 'reminder_2h';

        const tmpl = await prisma.messageTemplate.findUnique({
          where: { userId_type_language: { userId, type: templateType, language: 'no' } },
        });

        if (tmpl) {
          body = interpolate(tmpl.body, {
            '{{kundenavn}}': appt.clientName,
            '{{dato}}': formatDate(appt.scheduledAt),
            '{{klokkeslett}}': formatTime(appt.scheduledAt),
            '{{tjeneste}}': '',
            '{{id}}': appt.id,
          });
        }
      }

      if (!body) {
        body =
          `Reminder: your appointment is on ${appt.scheduledAt.toLocaleString()}. ` +
          `Reply YES to confirm, NO to cancel, or RESCHEDULE. [ref:${appt.id}]`;
      }

      const message = await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: appt.clientPhone,
        body,
      });
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'REMINDED', twilioSid: message.sid },
      });
      process.stdout.write(
        `Sent reminder to ${appt.clientPhone} for appointment ${appt.id} (sid: ${message.sid})\n`,
      );
    } catch (err) {
      process.stderr.write(`Failed to send reminder for appointment ${appt.id}: ${err}\n`);
    }
  }

  await prisma.$disconnect();
}

main();
