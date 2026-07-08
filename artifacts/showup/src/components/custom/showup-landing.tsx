'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    id: 'setup-time',
    question: 'Hvor lang tid tar oppsettet?',
    answer:
      'De fleste bedrifter er i gang på under 10 minutter. Bare sett din timeplan, importer kundelisten, og BookPling håndterer resten automatisk.',
  },
  {
    id: 'reminder-types',
    question: 'Hvilke typer påminnelser kan jeg sende?',
    answer:
      'BookPling sender SMS, e-post og tale-påminnelser gjennom en flerkanals tilnærming. Kunder mottar påminnelser via sin foretrukne kanal og kan bekrefte eller endre en avtale med et enkelt svar.',
  },
  {
    id: 'reschedule',
    question: 'Hva om en kunde trenger å endre avtalen?',
    answer:
      'Kunder kan svare direkte på enhver påminnelse for å bekrefte eller be om ny tid. Du får et varsel med deres respons, så du holder kontrollen på kalenderen din.',
  },
  {
    id: 'cost',
    question: 'Hvor mye koster BookPling?',
    answer:
      'BookPling er laget for små bedrifter, med priser som passer for lokale butikker. Fra 199 kr/mnd med planer for alle behov — ingen skjulte gebyrer, ingen bindingstid.',
  },
  {
    id: 'technical',
    question: 'Trenger jeg teknisk kunnskap for å bruke BookPling?',
    answer:
      'Nei, absolutt ikke. BookPling er designet for bedrifter uten teknisk ekspertise. Hvis du kan sette en timeplan og sende en e-post, kan du bruke BookPling.',
  },
];

export function ShowUpLandingClient() {
  return (
    <>
      {/* FAQ Section */}
      <section id="faq" className="section border-t border-border">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow mb-3">Ofte stilte spørsmål</p>
            <h2 className="font-display text-h2 tracking-tight">Alt du trenger å vite</h2>
            <p className="mt-4 text-muted-foreground text-body-lg">
              Har du spørsmål? Vi har svar. Hvis du ikke finner det du trenger her, ta kontakt
              direkte.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-2xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left text-body font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section border-t border-border">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center shadow-lg md:px-12 md:py-20">
            {/* Decorative background shapes */}
            <div className="absolute inset-0 -z-0 opacity-50">
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[oklch(var(--brand-200))] blur-3xl" />
              <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[oklch(var(--brand-300))] blur-3xl" />
            </div>
            <div className="relative z-10">
              <Badge variant="secondary" className="mb-6">
                Ingen kredittkort nødvendig
              </Badge>
              <h2 className="font-display text-h1 tracking-tight">Klar til å fylle kalenderen?</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-body-lg">
                Bli med lokale servicebedrifter som allerede bruker BookPling for å eliminere glemte
                avtaler og holde kundene kommer tilbake.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <a href="/signup">Kom i gang gratis</a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/#features">Les mer</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
