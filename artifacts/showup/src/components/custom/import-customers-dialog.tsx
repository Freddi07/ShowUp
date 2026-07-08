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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer kunder fra fil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Last opp en CSV-fil eksportert fra en annen plattform (Fiken, Fresha, HubSpot, Excel …).
            Vi finner automatisk kolonnene for navn, telefon og e-post.
          </p>
          <Input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={handleFile}
            className="cursor-pointer"
          />
          {fileName && !error && contacts.length > 0 && (
            <p className="text-sm">
              <span className="font-medium">{contacts.length}</span> kunder klare til import fra{' '}
              <span className="font-medium">{fileName}</span>.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              {result.imported} lagt til, {result.updated} oppdatert
              {result.skipped > 0 ? `, ${result.skipped} hoppet over` : ''}.
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
