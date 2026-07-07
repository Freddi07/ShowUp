// @polsia:user-owned
if (process.env.POLSIA_IN_PROCESS_CRONS_ENABLED !== 'true') {
  process.stdout.write('In-process crons not enabled; skipping.\n');
  process.exit(0);
}

require('dotenv').config();

const required = ['CRON_SECRET', 'BETTER_AUTH_URL'];
for (const key of required) {
  if (!process.env[key]) {
    process.stderr.write(`Missing required env var: ${key}\n`);
    process.exit(1);
  }
}

async function main() {
  const url = `${process.env.BETTER_AUTH_URL}/api/integrations/sync`;
  process.stdout.write(`Calling sync endpoint: ${url}\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    process.stderr.write(`Sync failed (${res.status}): ${JSON.stringify(body)}\n`);
    process.exit(1);
  }

  process.stdout.write(`Sync complete: ${JSON.stringify(body)}\n`);
}

main();
