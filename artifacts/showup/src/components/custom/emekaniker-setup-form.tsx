'use client';

import { CheckCircle, FileUp, Loader2, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type {
  EmekanikerStatusResponse,
  EmekanikerUploadResponse,
} from '@/lib/contracts/emekaniker';

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <Badge variant="default" className="bg-green-600">
      <CheckCircle className="mr-1 size-3" />
      Aktiv
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="mr-1 size-3" />
      Ikke tilkoblet
    </Badge>
  );
}

export function EmekanikerSetupForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<EmekanikerUploadResponse | null>(null);
  const [status, setStatus] = useState<EmekanikerStatusResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setPending(true);
    setError(undefined);
    setSuccess(false);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiFetch<EmekanikerUploadResponse>('/api/integrations/emekaniker/upload', {
        method: 'POST',
        body: formData,
      });
      setResult(data);
      setSuccess(true);
      const newStatus = await apiFetch<EmekanikerStatusResponse>(
        '/api/integrations/emekaniker/status',
        { method: 'GET' },
      );
      setStatus(newStatus);
    } catch (err) {
      const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
      if (cause && typeof cause === 'object') {
        setError(
          ((cause as Record<string, unknown>).error as string) || 'Kunne ikke laste opp filen',
        );
      } else {
        setError('Kunne ikke laste opp filen. Prøv igjen.');
      }
    }

    setPending(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      setError('Bare CSV-filer er støttet');
    }
  }

  useState(() => {
    apiFetch<EmekanikerStatusResponse>('/api/integrations/emekaniker/status', { method: 'GET' })
      .then(setStatus)
      .catch(() => {});
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {status && <StatusBadge connected={status.connected} />}
      </div>

      <ol className="space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            1
          </span>
          <span>Åpne eMekaniker og gå til Rapporter → Kunder/Bestillinger</span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          <span>Eksporter listen som CSV med kolonner: Kundenavn, Telefon, Dato, Klokkeslett</span>
        </li>
        <li className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            3
          </span>
          <span>Last opp filen her for å importere verkstedsavtalene</span>
        </li>
      </ol>

      <form onSubmit={handleUpload} className="flex flex-col gap-3" noValidate>
        <label
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
          <FileUp className="mb-3 size-10 text-muted-foreground" />
          {file ? (
            <div className="text-center">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dra en fil hit, eller klikk for å velge</p>
          )}
        </label>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && result && (
          <Alert className="border-green-600 bg-green-50 text-green-800">
            <CheckCircle className="size-4" />
            <AlertDescription>
              Importerte {result.imported} avtaler
              {result.skipped > 0 && ` (${result.skipped} hoppet over)`}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending || !file}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Laster opp…
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              Last opp
            </>
          )}
        </Button>
      </form>

      {status?.lastUploadAt && (
        <p className="text-xs text-muted-foreground">
          Sist lastet opp: {new Date(status.lastUploadAt).toLocaleString('nb-NO')}
        </p>
      )}
    </div>
  );
}
