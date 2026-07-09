'use client';

import type { ReactNode } from 'react';

export interface ProviderGuide {
  /** Short banner shown at the top of the guide dialog. */
  intro: ReactNode;
  /** Ordered setup steps. */
  steps: ReactNode[];
  /** Whether this provider is wired through the generic webhook. */
  usesGenericWebhook: boolean;
}

/**
 * Setup guidance per booking system, based on what each vendor actually offers:
 * - Onlinebooq has native outbound webhooks → concrete steps to point them at us.
 * - Timma / Fresha / Booksy have no open realtime booking API → honest fallback
 *   guidance (generic webhook if the system can send one, otherwise CSV import).
 */
export const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  onlinebooq: {
    usesGenericWebhook: true,
    intro: (
      <>
        Onlinebooq støtter <strong>utgående webhooks</strong>. Du kobler dem direkte
        til BookPling — da blir nye bookinger automatisk til påminnelser.
      </>
    ),
    steps: [
      <>
        Koble til <strong>Generisk webhook</strong> her i BookPling først (knappen
        «Koble til» på det kortet). Du får da en unik <strong>URL</strong> og en{' '}
        <strong>hemmelig nøkkel</strong>.
      </>,
      <>
        Logg inn i Onlinebooq og gå til{' '}
        <strong>Innstillinger → Integrasjoner / Webhooks</strong>.
      </>,
      <>
        Opprett en ny webhook og lim inn <strong>URL-en</strong> fra BookPling. Velg
        hendelsen «Ny booking» (og gjerne «Booking endret»).
      </>,
      <>
        Legg den hemmelige nøkkelen i feltet for <strong>signatur/secret</strong> hvis
        Onlinebooq har det, slik at forespørslene signeres med HMAC-SHA256.
      </>,
      <>
        Lagre. Send en testbooking — den skal dukke opp i «Siste bookinger» nederst.
      </>,
    ],
  },
  timma: {
    usesGenericWebhook: true,
    intro: (
      <>
        Timma har i dag <strong>ikke</strong> et åpent utvikler- eller partner-API
        for sanntidsbookinger. Har Timma-oppsettet ditt mulighet for utgående
        webhooks (via en automasjonstjeneste som Zapier/Make), kan du bruke den
        generiske webhooken. Ellers anbefaler vi fil-import.
      </>
    ),
    steps: [
      <>
        Koble til <strong>Generisk webhook</strong> her for å få URL og hemmelig
        nøkkel.
      </>,
      <>
        Sett opp en automasjon (f.eks. Zapier/Make) som lytter på nye Timma-bookinger
        og sender dem som en signert POST til URL-en.
      </>,
      <>
        Har du ikke mulighet for webhooks: bruk <strong>CSV-import</strong> under
        «Importer kunder» for å hente inn kundene manuelt.
      </>,
    ],
  },
  fresha: {
    usesGenericWebhook: false,
    intro: (
      <>
        Fresha tilbyr <strong>ikke</strong> et offentlig partner-API for
        sanntidsbookinger (kun en data-/rapport-kobling). Direkte live-integrasjon er
        derfor ikke mulig i dag.
      </>
    ),
    steps: [
      <>
        Bruk <strong>CSV-import</strong> under «Importer kunder» for å hente inn
        kundelisten din fra Fresha.
      </>,
      <>
        Har du en automasjonstjeneste som klarer å hente Fresha-bookinger, kan du
        sende dem til den <strong>generiske webhooken</strong> — men Fresha har ingen
        offisiell støtte for dette.
      </>,
    ],
  },
  booksy: {
    usesGenericWebhook: false,
    intro: (
      <>
        Booksy har <strong>ikke</strong> et offisielt offentlig API eller
        partnerprogram. Vi bruker ikke uoffisielle metoder, så en direkte kobling
        støttes ikke.
      </>
    ),
    steps: [
      <>
        Bruk <strong>CSV-import</strong> under «Importer kunder» for å hente inn
        kundene dine fra Booksy.
      </>,
      <>
        Legg gjerne inn en forespørsel til Booksy om offisiell API-tilgang — får du
        det, kan bookinger sendes til den <strong>generiske webhooken</strong>.
      </>,
    ],
  },
};

export function hasGuide(provider: string): boolean {
  return provider in PROVIDER_GUIDES;
}
