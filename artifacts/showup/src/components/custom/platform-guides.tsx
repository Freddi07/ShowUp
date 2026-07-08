'use client';

import { Workflow } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlatformGuide {
  id: string;
  name: string;
  /** Which trigger the professional picks in Zapier/Make. */
  trigger: string;
  /** Platform-specific tip (field mapping, app name, caveats). */
  note: string;
  /** Use Make instead of Zapier as the primary path. */
  makeFirst?: boolean;
}

const PLATFORMS: PlatformGuide[] = [
  {
    id: 'fresha',
    name: 'Fresha',
    trigger: '«New Client» (ny kunde)',
    note: 'Søk etter «Fresha» som trigger-app i Zapier. Map kundens navn, telefon og e-post.',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    trigger: '«Invitee Created» (ny booking)',
    note: 'Map «Invitee Name» → navn og «Invitee Email» → e-post. Telefon hentes fra et bookingspørsmål om du har lagt det til.',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    trigger: '«New Contact»',
    note: 'Slå sammen «First name» + «Last name» til navn, og map «Phone» og «Email».',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    trigger: '«New Person»',
    note: 'Map «Name», «Phone» og «Email».',
  },
  {
    id: 'ms-bookings',
    name: 'Microsoft Bookings',
    trigger: '«New Booking» (via Microsoft 365)',
    note: 'Bruk Microsoft 365-appen i Zapier. Map kundenavn, e-post og telefon fra bookingen.',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    trigger: '«New Contact» eller «New Lead»',
    note: 'Map «Name», «Phone» og «Email».',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    trigger: '«New Contact»',
    note: 'Map «Full Name», «Phone» og «Email».',
  },
  {
    id: 'timma',
    name: 'Timma',
    trigger: 'Webhook / HTTP-modul',
    note: 'Timma har ikke egen Zapier-app. Bruk Make (modulen «HTTP → Make a request») eller Timma sine webhooks, og send til URL-en fra kortet over.',
    makeFirst: true,
  },
];

function Steps({ platform }: { platform: PlatformGuide }) {
  if (platform.makeFirst) {
    return (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Opprett et nytt scenario i Make (make.com).</li>
        <li>
          Legg til en trigger som fanger opp nye kunder i {platform.name} (webhook eller planlagt
          henting).
        </li>
        <li>
          Legg til modulen <span className="font-medium">HTTP → Make a request</span>.
        </li>
        <li>
          Metode: <span className="font-mono">POST</span>. URL: lim inn endepunktet fra kortet over.
        </li>
        <li>
          Legg til header <span className="font-mono">x-api-key</span> med din API-nøkkel.
        </li>
        <li>
          Body (JSON):{' '}
          <span className="font-mono">{'{ "name": "…", "phone": "…", "email": "…" }'}</span> — map
          feltene fra {platform.name}.
        </li>
        <li>Kjør en test, og slå på scenariet.</li>
      </ol>
    );
  }
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
      <li>Opprett en ny Zap i Zapier (zapier.com).</li>
      <li>
        Velg <span className="font-medium">{platform.name}</span> som trigger, hendelse{' '}
        {platform.trigger}, og koble til kontoen din.
      </li>
      <li>
        Legg til en action → søk etter <span className="font-medium">«Webhooks by Zapier»</span> →
        velg <span className="font-medium">POST</span>.
      </li>
      <li>
        <span className="font-medium">URL:</span> lim inn endepunktet fra kortet over.
      </li>
      <li>
        <span className="font-medium">Payload Type:</span> <span className="font-mono">JSON</span>.
      </li>
      <li>
        <span className="font-medium">Data:</span> legg til feltene{' '}
        <span className="font-mono">name</span>, <span className="font-mono">phone</span> og{' '}
        <span className="font-mono">email</span> — {platform.note}
      </li>
      <li>
        Under <span className="font-medium">Headers:</span> legg til{' '}
        <span className="font-mono">x-api-key</span> med din API-nøkkel fra kortet over.
      </li>
      <li>Test steget, og slå på Zap-en.</li>
    </ol>
  );
}

export function PlatformGuides() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Workflow className="size-5 text-brand-500" />
          <CardTitle className="text-base">Steg-for-steg: koble til plattformen din</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Sett opp automatisk overføring én gang, så havner hver nye kunde rett i kundebasen —
          uten filopplasting. Velg plattformen din under. Du trenger API-nøkkelen og endepunktet
          fra kortet over.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {PLATFORMS.map((p) => (
            <AccordionItem key={p.id} value={p.id}>
              <AccordionTrigger>{p.name}</AccordionTrigger>
              <AccordionContent>
                <Steps platform={p} />
              </AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="other" className="border-b-0">
            <AccordionTrigger>Annen plattform</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Støtter plattformen Zapier eller Make, følger du samme oppskrift: velg «ny
                kunde»-hendelsen som trigger, legg til en webhook/HTTP-action med POST til
                endepunktet over, sett headeren <span className="font-mono">x-api-key</span>, og map
                navn, telefon og e-post. Har du et system uten slik støtte, kan du eksportere en
                CSV-fil og laste den opp i stedet.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
