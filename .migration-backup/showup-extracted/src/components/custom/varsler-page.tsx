'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api-client';
import {
  NotificationSettingsItem,
  type NotificationSettingsItem as NotificationSettingsItemType,
} from '@/lib/contracts/notification-settings';

type Settings = NotificationSettingsItemType;

function SettingRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function VarslerPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/innstillinger/varsler', { schema: NotificationSettingsItem })
      .then(setSettings)
      .catch(() => toast.error('Kunne ikke laste innstillinger'))
      .finally(() => setLoading(false));
  }, []);

  async function update(next: Settings) {
    setSettings(next);
    try {
      await apiFetch('/api/innstillinger/varsler', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      toast.success('Innstillinger lagret');
    } catch {
      toast.error('Kunne ikke lagre innstillinger');
    }
  }

  function toggle(key: keyof Settings) {
    if (!settings) return;
    update({ ...settings, [key]: !settings[key] });
  }

  if (loading || !settings) {
    return (
      <div className="max-w-lg space-y-4">
        {(['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const).map((k) => (
          <div key={k} className="flex items-center justify-between py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg divide-y divide-border rounded-xl border border-border bg-card px-6">
      <div className="py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tidspunkt for påminnelse
        </h3>
        <SettingRow
          id="remind48h"
          label="48 timer før avtale"
          description="Send påminnelse to dager i forveien"
          checked={settings.remind48h}
          onCheckedChange={() => toggle('remind48h')}
        />
        <SettingRow
          id="remind24h"
          label="24 timer før avtale"
          description="Send påminnelse dagen før (anbefalt)"
          checked={settings.remind24h}
          onCheckedChange={() => toggle('remind24h')}
        />
        <SettingRow
          id="remind2h"
          label="2 timer før avtale"
          description="Send en siste påminnelse kort tid i forveien"
          checked={settings.remind2h}
          onCheckedChange={() => toggle('remind2h')}
        />
      </div>

      <div className="py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Kanal
        </h3>
        <SettingRow
          id="channelSms"
          label="SMS"
          description="Send påminnelser via tekstmelding"
          checked={settings.channelSms}
          onCheckedChange={() => toggle('channelSms')}
        />
        <SettingRow
          id="channelEmail"
          label="E-post"
          description="Send påminnelser via e-post"
          checked={settings.channelEmail}
          onCheckedChange={() => toggle('channelEmail')}
        />
      </div>

      <div className="py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Automatisk purring
        </h3>
        <SettingRow
          id="autoFollowUp"
          label="Aktiver automatisk purring"
          description="Send en purring til kunder som ikke har svart"
          checked={settings.autoFollowUp}
          onCheckedChange={() => toggle('autoFollowUp')}
        />
      </div>
    </div>
  );
}
