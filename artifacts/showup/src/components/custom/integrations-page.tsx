'use client';

import { FileUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiIngestCard } from './api-ingest-card';
import { ImportCustomersDialog } from './import-customers-dialog';
import { PlatformGuides } from './platform-guides';

function CsvImportCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileUp className="size-5 text-brand-500" />
          <CardTitle className="text-base">Importer fra fil (CSV / Excel)</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Eksporter kundelisten din fra hvilken som helst plattform — Fiken, Tripletex, Fresha,
          Opus Dental, HubSpot, Excel og lignende — og last den opp her. Vi gjenkjenner automatisk
          kolonnene for navn, telefon og e-post, og hopper over duplikater.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={() => setOpen(true)} className="h-11 w-full sm:w-auto">
          Last opp CSV-fil
        </Button>
      </CardContent>
      <ImportCustomersDialog open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

export function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 font-semibold">Integrasjoner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Få kundene dine inn i ShowUp fra andre systemer — enten ved å laste opp en fil, eller
          ved å koble til automatisk via API/Zapier.
        </p>
      </div>

      <CsvImportCard />

      <ApiIngestCard />

      <PlatformGuides />

      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Har du en plattform som ikke er nevnt?</CardTitle>
          <CardDescription className="text-sm">
            De fleste bookings- og regnskapssystemer (Fresha, Timma, Calendly, Microsoft Bookings,
            HubSpot, Salesforce, Pipedrive, Zoho m.fl.) kan sende nye kunder automatisk til ShowUp
            via Zapier eller Make ved hjelp av API-nøkkelen over. Har du et system uten slik støtte,
            eksporterer du bare en CSV-fil og laster den opp. Ta kontakt hvis du ønsker hjelp med et
            spesifikt oppsett.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
