'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import type { CustomerItem, CustomerList } from '@/lib/contracts/customer';
import { CustomerCreate, CustomerList as CustomerListSchema } from '@/lib/contracts/customer';

const SOURCE_LABELS: Record<string, string> = {
  tripletex: 'Tripletex',
  opus_dental: 'Opus Dental',
  google_calendar: 'Google Calendar',
  microsoft_outlook: 'Microsoft 365',
  fresha: 'Fresha',
  manual: 'Manuell',
};

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'];
const SKELETON_CELL_KEYS = ['sc-1', 'sc-2', 'sc-3', 'sc-4', 'sc-5', 'sc-6'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {SKELETON_CELL_KEYS.map((k) => (
        <td key={k} className="px-4 py-3">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

interface AddDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

function AddCustomerDialog({ open, onClose, onAdded }: AddDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = CustomerCreate.safeParse({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFormError(errs.name?.[0] ?? errs.email?.[0] ?? 'Ugyldig data');
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setName('');
      setPhone('');
      setEmail('');
      onAdded();
      onClose();
    } catch {
      setFormError('Kunne ikke lagre kunde. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til kunde</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="new-name">Navn *</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fullt navn"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-phone">Telefon</Label>
            <Input
              id="new-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+47 000 00 000"
              type="tel"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-email">E-post</Label>
            <Input
              id="new-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@eksempel.no"
              type="email"
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Lagrer…' : 'Lagre kunde'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KunderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [version, setVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    setCustomers(null);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (version > 0) params.set('_v', String(version));
    const qs = params.toString();
    apiFetch(`/api/customers${qs ? `?${qs}` : ''}`, { schema: CustomerListSchema })
      .then((data: CustomerList) => setCustomers(data.items))
      .catch(() => setError('Kunne ikke laste kunder. Prøv å laste siden på nytt.'));
  }, [debouncedSearch, sourceFilter, version]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Kunder</h1>
          <p className="text-muted-foreground text-small mt-1">
            Alle kunder synkronisert fra tilkoblede integrasjoner
          </p>
        </div>
        <Button type="button" onClick={() => setShowAdd(true)}>
          Legg til kunde
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Søk på navn eller telefon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Alle kilder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kilder</SelectItem>
            <SelectItem value="tripletex">Tripletex</SelectItem>
            <SelectItem value="opus_dental">Opus Dental</SelectItem>
            <SelectItem value="google_calendar">Google Calendar</SelectItem>
            <SelectItem value="microsoft_outlook">Microsoft 365</SelectItem>
            <SelectItem value="fresha">Fresha</SelectItem>
            <SelectItem value="manual">Manuell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Navn</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefon</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-post</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kilde</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avtaler</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Siste besøk
              </th>
            </tr>
          </thead>
          <tbody>
            {customers === null && !error ? (
              SKELETON_KEYS.map((k) => <SkeletonRow key={k} />)
            ) : customers?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Ingen kunder funnet.
                </td>
              </tr>
            ) : (
              customers?.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => router.push(`/dashboard/kunder/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.source ? (
                      <Badge variant="secondary">{SOURCE_LABELS[c.source] ?? c.source}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {c.appointmentCount}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDate(c.lastVisitAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddCustomerDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => setVersion((v) => v + 1)}
      />
    </div>
  );
}
