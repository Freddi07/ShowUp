'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { CustomerImportResult } from '@/lib/contracts/customer-import';
import { parseContactsCsv, type ParsedContact } from '@/lib/csv';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export function ImportCustomersDialog({ open, onClose, onImported }: ImportDialogProps) {
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const withAppointment = contacts.filter((c) => c.appointmentAt).length;

  function reset() {
    setContacts([]);
    setFileName('');
    setError(null);
    setResult(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = parseContactsCsv(await file.text());
      if (parsed.length === 0) {
        setError(
          'Fant ingen kunder i filen. Sjekk at den har kolonner for navn, telefon eller e-post.',
        );
        setContacts([]);
        return;
      }
      setContacts(parsed);
    } catch {
      setError('Kunne ikke lese filen.');
    }
  }

  async function handleImport() {
    if (contacts.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/customers/import', {
        method: 'POST',
        body: JSON.stringify({ customers: contacts, source: 'import' }),
        schema: CustomerImportResult,
      });
      setResult(res);
      onImported?.();
    } catch {
      setError('Import feilet. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer kunder og avtaler fra fil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Last opp en CSV- eller Excel-fil (lagret som CSV) eksportert fra en annen plattform.
            Vi finner automatisk kolonnene – du trenger ikke å endre overskriftene.
          </p>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Kolonner filen kan inneholde:</p>
            <ul className="space-y-1">
              <li>
                <span className="font-medium text-foreground">Navn</span> – påkrevd (f.eks.{' '}
                <code>navn</code>, <code>name</code>, <code>kunde</code>)
              </li>
              <li>
                <span className="font-medium text-foreground">Telefon</span> – påkrevd for å sende
                påminnelser (<code>telefon</code>, <code>mobil</code>, <code>phone</code>)
              </li>
              <li>
                <span className="font-medium text-foreground">E-post</span> – valgfritt
              </li>
              <li>
                <span className="font-medium text-foreground">Dato + tid</span> – tar med en avtale.
                Bruk <code>dato</code> + <code>tid</code>, eller én kolonne{' '}
                <code>tidspunkt</code> (f.eks. <code>10.07.2026 14:30</code>).
              </li>
            </ul>
            <p className="mt-2">
              En avtale registreres kun når raden har <span className="font-medium">både dato/tid
              og telefonnummer</span>. Påminnelse planlegges automatisk 24 timer før.
            </p>
          </div>

          <Input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={handleFile}
            className="cursor-pointer"
          />
          {fileName && !error && contacts.length > 0 && (
            <div className="text-sm">
              <p>
                <span className="font-medium">{contacts.length}</span> kunder klare til import fra{' '}
                <span className="font-medium">{fileName}</span>.
              </p>
              <p className="text-muted-foreground">
                {withAppointment > 0
                  ? `${withAppointment} av dem har en avtale som blir registrert.`
                  : 'Ingen avtaler oppdaget – legg til dato/tid-kolonner for å registrere avtaler.'}
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              {result.imported} kunder lagt til, {result.updated} oppdatert
              {result.skipped > 0 ? `, ${result.skipped} hoppet over` : ''}.
              {result.appointmentsCreated > 0
                ? ` ${result.appointmentsCreated} avtaler registrert.`
                : ''}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={loading}
            >
              {result ? 'Lukk' : 'Avbryt'}
            </Button>
            {!result && (
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || contacts.length === 0}
              >
                {loading ? 'Importerer…' : `Importer ${contacts.length || ''} kunder`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
