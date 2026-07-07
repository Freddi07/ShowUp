'use client';

import { Link } from 'wouter';
import { useRouter } from '@/lib/compat/next-navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { type FakturaItem, FakturaList } from '@/lib/contracts/fakturaer';
import { KontoProfile, type KontoProfile as KontoProfileType } from '@/lib/contracts/konto';
import { type TrialStatus, TrialStatusSchema } from '@/lib/contracts/stripe';

const BUSINESS_TYPES = [
  { value: 'tannlege', label: 'Tannlege' },
  { value: 'frisør', label: 'Frisør' },
  { value: 'bilverksted', label: 'Bilverksted' },
  { value: 'annet', label: 'Annet' },
];

function ProfileSection({ profile }: { profile: KontoProfileType }) {
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [businessType, setBusinessType] = useState(profile.businessType ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function saveName() {
    setSavingProfile(true);
    try {
      await authClient.updateUser({ name });
      toast.success('Forretningsnavn oppdatert');
    } catch {
      toast.error('Kunne ikke oppdatere navn');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePhoneAndType() {
    setSavingProfile(true);
    try {
      await apiFetch('/api/konto', {
        method: 'PATCH',
        body: JSON.stringify({ phone: phone || null, businessType: businessType || null }),
      });
      toast.success('Profil oppdatert');
    } catch {
      toast.error('Kunne ikke oppdatere profil');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      await authClient.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Passord endret');
    } catch {
      toast.error('Kunne ikke endre passord. Sjekk at nåværende passord er riktig.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await apiFetch('/api/konto', { method: 'DELETE' });
      await authClient.signOut();
      router.push('/');
    } catch {
      toast.error('Kunne ikke slette konto');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Forretningsnavn</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mitt firma AS"
              />
              <Button type="button" variant="outline" disabled={savingProfile} onClick={saveName}>
                Lagre
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" value={profile.email} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground">
              Kontakt support for å bytte e-postadresse.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefonnummer</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+47 123 45 678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessType">Forretningstype</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="businessType">
                <SelectValue placeholder="Velg type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>
                    {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" disabled={savingProfile} onClick={savePhoneAndType}>
            Lagre telefon og type
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bytt passord</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Nåværende passord</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nytt passord</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={savingPassword || !currentPassword || !newPassword}
            onClick={changePassword}
          >
            {savingPassword ? 'Endrer…' : 'Bytt passord'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Slett konto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Sletting av kontoen er permanent og kan ikke angres. All data vil bli fjernet.
          </p>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Slett konto
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekreft sletting av konto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Skriv <strong>SLETT</strong> for å bekrefte at du vil slette kontoen din permanent.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="SLETT"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Avbryt
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirm !== 'SLETT' || deleting}
              onClick={deleteAccount}
            >
              {deleting ? 'Sletter…' : 'Slett konto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function subscriptionLabel(status: string | null | undefined): string {
  if (!status) return 'Ingen aktiv plan';
  if (status === 'trialing') return 'Prøveperiode';
  if (status === 'active') return 'Aktiv';
  if (status === 'canceled') return 'Avsluttet';
  if (status === 'past_due') return 'Forfalt betaling';
  return status;
}

function SubscriptionSection() {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/trial/status', { schema: TrialStatusSchema })
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {(['s1', 's2'] as const).map((k) => (
              <Skeleton key={k} className="h-6 w-48" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium text-foreground">
                {subscriptionLabel(status?.subscriptionStatus)}
              </span>
            </div>

            {status?.trialActive && status.trialEndsAt && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Prøveperiode avsluttes:</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(status.trialEndsAt).toLocaleDateString('nb-NO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}

            {!status?.trialActive && status?.subscriptionStatus !== 'active' && (
              <Button asChild variant="default" size="sm">
                <Link href="/upgrade">Oppgrader plan</Link>
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              For å administrere abonnementet ditt, kontakt oss på{' '}
              <a
                href="mailto:showup-8@polsia.app"
                className="underline underline-offset-2 hover:opacity-80"
              >
                showup-8@polsia.app
              </a>
              .
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FakturaSection() {
  const [items, setItems] = useState<FakturaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch('/api/konto/fakturaer', { schema: FakturaList })
      .then((data) => setItems(data.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fakturaliste</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {(['f1', 'f2', 'f3'] as const).map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Kunne ikke hente fakturaer.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen fakturaer funnet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left font-medium text-muted-foreground">Dato</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Beløp</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">PDF</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      {new Date(inv.date).toLocaleDateString('nb-NO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3">
                      {inv.amount.toLocaleString('nb-NO', {
                        style: 'currency',
                        currency: inv.currency.toUpperCase(),
                      })}
                    </td>
                    <td className="py-3 capitalize">{inv.status}</td>
                    <td className="py-3">
                      {inv.invoicePdf ? (
                        <a
                          href={inv.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:opacity-80"
                        >
                          Last ned
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Ikke tilgjengelig</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KontoPage() {
  const [profile, setProfile] = useState<KontoProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/konto', { schema: KontoProfile })
      .then(setProfile)
      .catch(() => toast.error('Kunne ikke laste profil'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {loading || !profile ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            {(['p1', 'p2', 'p3', 'p4'] as const).map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <ProfileSection profile={profile} />
      )}
      <SubscriptionSection />
      <FakturaSection />
    </div>
  );
}
