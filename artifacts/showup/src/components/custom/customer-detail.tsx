'use client';

import { useRouter } from '@/lib/compat/next-navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import type {
  AppointmentSummary,
  CustomerDetail as CustomerDetailType,
} from '@/lib/contracts/customer';
import {
  AppointmentMutation,
  CustomerDetail as CustomerDetailSchema,
} from '@/lib/contracts/customer';

const SOURCE_LABELS: Record<string, string> = {
  tripletex: 'Tripletex',
  opus_dental: 'Opus Dental',
  google_calendar: 'Google Calendar',
  microsoft_outlook: 'Microsoft 365',
  fresha: 'Fresha',
  manual: 'Manuell',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Venter',
  REMINDED: 'Påmint',
  CONFIRMED: 'Bekreftet',
  CANCELLED: 'Avlyst',
  RESCHEDULE_REQUESTED: 'Ønsker å endre',
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'secondary',
  REMINDED: 'outline',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  RESCHEDULE_REQUESTED: 'outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** ISO string → value for <input type="datetime-local"> (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

const SKELETON_CELL_KEYS = ['sc-1', 'sc-2', 'sc-3', 'sc-4', 'sc-5'];

interface Props {
  customerId: string;
}

export function CustomerDetail({ customerId }: Props) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentSummary | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const load = useCallback(() => {
    return apiFetch(`/api/customers/${customerId}`, { schema: CustomerDetailSchema })
      .then((data) => setCustomer(data))
      .catch(() => setError('Kunne ikke laste kundedetaljer. Prøv å laste siden på nytt.'));
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemind(appt: AppointmentSummary) {
    setRemindingId(appt.id);
    try {
      await apiFetch(`/api/appointments/${appt.id}/remind`, {
        method: 'POST',
        schema: AppointmentMutation,
      });
      toast.success(`Påminnelse sendt til ${appt.clientName}`);
      await load();
    } catch {
      toast.error('Kunne ikke sende påminnelse. Sjekk at kunden har telefonnummer.');
    } finally {
      setRemindingId(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/kunder')}>
          ← Kunder
        </Button>
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SKELETON_CELL_KEYS.map((k) => (
            <div
              key={k}
              className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const hasPhone = Boolean(customer.phone);

  return (
    <div className="space-y-8">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/dashboard/kunder')}
        >
          ← Kunder
        </Button>
        <h1 className="text-h2 text-foreground">{customer.name}</h1>
        {customer.source && (
          <Badge variant="secondary" className="mt-2">
            {SOURCE_LABELS[customer.source] ?? customer.source}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Telefon
          </p>
          <p className="text-sm font-medium text-foreground">{customer.phone ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            E-post
          </p>
          <p className="text-sm font-medium text-foreground break-all">{customer.email ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Antall avtaler
          </p>
          <p className="text-sm font-medium text-foreground">{customer.appointmentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Opprettet
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatDateTime(customer.createdAt)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-h4 text-foreground">Avtalehistorikk</h2>
          <Button
            type="button"
            size="sm"
            className="h-10"
            onClick={() => setCreateOpen(true)}
            disabled={!hasPhone}
            title={hasPhone ? undefined : 'Legg til telefonnummer på kunden først'}
          >
            + Ny avtale
          </Button>
        </div>
        {!hasPhone && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            Kunden mangler telefonnummer. Uten det kan du ikke opprette avtaler eller sende
            påminnelser.
          </p>
        )}
        {customer.appointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border border-border rounded-lg">
            Ingen avtaler registrert.
          </p>
        ) : (
          <div className="space-y-3">
            {customer.appointments.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(a.scheduledAt)} kl. {formatTime(a.scheduledAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[a.status] ?? 'secondary'}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.twilioSid ? 'Påminnelse sendt' : 'Ikke påmint'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => setEditing(a)}
                  >
                    Endre
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => handleRemind(a)}
                    disabled={remindingId === a.id}
                  >
                    {remindingId === a.id ? 'Sender…' : 'Send påminnelse'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {customer.appointments.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Siste besøk:{' '}
            <span className="font-medium text-foreground">
              {customer.lastVisitAt ? formatDate(customer.lastVisitAt) : '—'}
            </span>
          </span>
        </div>
      )}

      <CreateAppointmentDialog
        open={createOpen}
        customerId={customer.id}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <EditAppointmentDialog
        appointment={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function CreateAppointmentDialog({
  open,
  customerId,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!when) return;
    setSaving(true);
    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          scheduledAt: new Date(when).toISOString(),
        }),
        schema: AppointmentMutation,
      });
      toast.success('Avtale opprettet');
      setWhen('');
      onSaved();
    } catch {
      toast.error('Kunne ikke opprette avtale');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setWhen('');
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny avtale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="new-appt-when">Dato og tid</Label>
            <Input
              id="new-appt-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Påminnelse planlegges automatisk 24 timer før. Du kan alltid sende en manuell
              påminnelse fra listen.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !when}>
            {saving ? 'Lagrer…' : 'Opprett avtale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAppointmentDialog({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: AppointmentSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [when, setWhen] = useState('');
  const [reminder, setReminder] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (appointment) {
      setWhen(toLocalInput(appointment.scheduledAt));
      setReminder(toLocalInput(appointment.reminderAt));
      setStatus(appointment.status);
    }
  }, [appointment]);

  async function handleSave() {
    if (!appointment || !when) return;
    setSaving(true);
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledAt: new Date(when).toISOString(),
          reminderAt: reminder ? new Date(reminder).toISOString() : undefined,
          status,
        }),
        schema: AppointmentMutation,
      });
      toast.success('Avtale oppdatert');
      onSaved();
    } catch {
      toast.error('Kunne ikke oppdatere avtale');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!appointment) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/appointments/${appointment.id}`, { method: 'DELETE' });
      toast.success('Avtale slettet');
      onSaved();
    } catch {
      toast.error('Kunne ikke slette avtale');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Endre avtale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-appt-when">Dato og tid</Label>
            <Input
              id="edit-appt-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-appt-reminder">Påminnelse sendes</Label>
            <Input
              id="edit-appt-reminder"
              type="datetime-local"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? 'Sletter…' : 'Slett'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || deleting}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || deleting || !when}>
              {saving ? 'Lagrer…' : 'Lagre'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
