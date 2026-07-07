'use client';

import { CheckCircle, FileUp, Loader2, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type {
  OpusDentalStatusResponse,
  OpusDentalUploadResponse,
} from '@/lib/contracts/opus-dental';

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

export function OpusDentalSetupForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<OpusDentalUploadResponse | null>(null);
  const [status, setStatus] = useState<OpusDentalStatusResponse | null>(null);
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
      const data = await apiFetch<OpusDentalUploadResponse>(
        '/api/integrations/opus-dental/upload',
        {
          method: 'POST',
          body: formData,
        },
      );

      setResult(data);
      setSuccess(true);

      // Refresh status
      const newStatus = await apiFetch<OpusDentalStatusResponse>(
        '/api/integrations/opus-dental/status',
        { method: 'GET' },
      );
      setStatus(newStatus);
    } catch (err) {
      const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
      if (cause && typeof cause === 'object') {
        const errObj = cause as Record<string, unknown>;
        setError((errObj.error as string) || 'Kunne ikke laste opp filen');
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
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xml'))) {
      setFile(droppedFile);
    } else {
      setError('Bare CSV- og XML-filer er støttet');
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  // Load status on mount
  useState(() => {
    apiFetch<OpusDentalStatusResponse>('/api/integrations/opus-dental/status', {
      method: 'GET',
    })
      .then(setStatus)
      .catch(() => {});
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Opus Dental</h3>
          {status && <StatusBadge connected={status.connected} />}
        </div>

        <ol className="mb-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </span>
            <span>Åpne Opus Dental og gå til Rapporter → Timeplan</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </span>
            <span>Velg dato og eksporter som CSV (semikolon-separert)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </span>
            <span>Last opp filen her — ShowUp leser Navn, Telefon, Dato og Klokkeslett</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              4
            </span>
            <span>Påminnelser settes opp automatisk for alle importerte timer</span>
          </li>
        </ol>

        <form onSubmit={handleUpload} className="flex flex-col gap-3" noValidate>
          <label
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xml"
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
              <p className="text-sm text-muted-foreground">
                Dra en fil hit, eller klikk for å velge
              </p>
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
          <p className="mt-3 text-xs text-muted-foreground">
            Sist lastet opp: {new Date(status.lastUploadAt).toLocaleString('nb-NO')}
          </p>
        )}
      </div>
    </div>
  );
}
