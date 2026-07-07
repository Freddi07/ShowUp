'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomasterSetupForm } from './automaster-setup-form';
import { BooksySetupForm } from './booksy-setup-form';
import { ClinikoSetupForm } from './cliniko-setup-form';
import { EmekanikerSetupForm } from './emekaniker-setup-form';
import { FikenSetupForm } from './fiken-setup-form';
import { FreshaSetupForm } from './fresha-setup-form';
import { GoogleCalendarSetupForm } from './google-calendar-setup-form';
import { MicrosoftOutlookSetupForm } from './microsoft-outlook-setup-form';
import { OpusDentalSetupForm } from './opus-dental-setup-form';
import { TripletexSetupForm } from './tripletex-setup-form';
import { VismaSetupForm } from './visma-setup-form';

interface IntegrationCard {
  title: string;
  description: string;
  form: React.ReactNode;
}

function IntegrationSection({ heading, cards }: { heading: string; cards: IntegrationCard[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.title} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{card.title}</CardTitle>
              <CardDescription className="text-sm">{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">{card.form}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 font-semibold">Integrasjoner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Koble til eksterne systemer for automatisk synkronisering av kunder og avtaler.
        </p>
      </div>

      <IntegrationSection
        heading="Kalender"
        cards={[
          {
            title: 'Google Kalender',
            description:
              'Koble til Google Kalender via OAuth 2.0 for å synkronisere avtaler og kunder automatisk.',
            form: <GoogleCalendarSetupForm />,
          },
          {
            title: 'Microsoft 365 / Outlook',
            description:
              'Koble til Microsoft 365 via OAuth 2.0 for å hente avtaler fra Outlook-kalenderen din.',
            form: <MicrosoftOutlookSetupForm />,
          },
        ]}
      />

      <IntegrationSection
        heading="Regnskapssystemer"
        cards={[
          {
            title: 'Tripletex',
            description:
              'Norges mest brukte ERP-system for små bedrifter. Koble til for å importere kunder og avtaler direkte fra Tripletex.',
            form: <TripletexSetupForm />,
          },
          {
            title: 'Fiken',
            description:
              'Norsk regnskapssystem for SMB. Koble til via OAuth for å hente kunder og fakturaer automatisk.',
            form: <FikenSetupForm />,
          },
          {
            title: 'Visma',
            description:
              'Hent kundelister og avtaleoversikt fra Visma via OAuth 2.0. Synkroniserer automatisk.',
            form: <VismaSetupForm />,
          },
        ]}
      />

      <IntegrationSection
        heading="Tannlege / Klinikk / Helse"
        cards={[
          {
            title: 'Opus Dental',
            description:
              'Norges ledende tannlegesystem. Last opp eksporten fra Opus Dental for å importere dagens timeplan og sette opp påminnelser automatisk.',
            form: <OpusDentalSetupForm />,
          },
          {
            title: 'Cliniko',
            description:
              'Brukt av tannleger, fysioterapeuter og kiropraktorer. Koble til med API-nøkkel for å hente avtaler og pasientinformasjon.',
            form: <ClinikoSetupForm />,
          },
        ]}
      />

      <IntegrationSection
        heading="Frisører / Spa"
        cards={[
          {
            title: 'Booksy',
            description:
              'Populær booking-app for frisører og spabehandlinger. Koble til med partner-API-nøkkel for sanntidsoppdatering av bookinger.',
            form: <BooksySetupForm />,
          },
          {
            title: 'Fresha',
            description:
              'Norges mest brukte booking-system for frisører og spa. Koble til med API-nøkkel for sanntidssynkronisering av bookinger og automatiske påminnelser.',
            form: <FreshaSetupForm />,
          },
        ]}
      />

      <IntegrationSection
        heading="Bilverksted"
        cards={[
          {
            title: 'Automaster',
            description:
              'Dominerer det norske bilverksted-markedet. Last opp CSV-eksport fra Automaster for å importere kunder og verkstedsavtaler.',
            form: <AutomasterSetupForm />,
          },
          {
            title: 'eMekaniker',
            description:
              'Norsk verkstedssystem. Last opp CSV-eksport fra eMekaniker for å importere kunder og bestillinger.',
            form: <EmekanikerSetupForm />,
          },
        ]}
      />
    </div>
  );
}
