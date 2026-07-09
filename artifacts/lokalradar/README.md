# LokalRadar

LokalRadar er et norsk verktøy for små lokalbedrifter som vil holde øye med
konkurrentene sine og få hjelp til markedsføring. Appen består av to moduler som
bindes sammen av en AI-rådgiver:

1. **Konkurrentovervåking** — legg til konkurrenter, skann nettsidene og
   Google-profilene deres, og få varsler når priser, tjenester, kampanjer eller
   vurderinger endrer seg.
2. **Markedsføringsassistent** — generer ferdige innlegg (Google/Facebook/
   Instagram), AI-bilder til innleggene, svar på anmeldelser og SEO-tips.
3. **AI-rådgiver (`/ai-chat`)** — en samtale-assistent som kjenner bedriften din,
   konkurrentene og de siste varslene, og gir konkrete råd på norsk. Svarene
   strømmes inn i sanntid.

Alt brukervendt innhold og all AI-generert tekst er på norsk (bokmål).

## Arkitektur

LokalRadar er en artifact i et pnpm-monorepo og deler backend med resten av
prosjektet:

- **Frontend:** `artifacts/lokalradar` — React + Vite + Tailwind + shadcn/ui,
  ruting med `wouter`. Serveres under sin egen base-path (`BASE_PATH`).
- **Backend:** `artifacts/api-server` — Express. LokalRadar-endepunktene ligger
  under `/api/lokalradar/*` (`artifacts/api-server/src/routes/lokalradar.ts`).
- **Database:** delt Postgres via Drizzle. LokalRadar-tabellene ligger i
  `lib/db/src/schema/lokalradar.ts` og er alle prefikset `Lokal`.
- **Auth:** delt better-auth (samme brukerkonto som resten av prosjektet).

Frontenden snakker med backend på samme origin: generert React-Query-klient
(`@workspace/api-client-react`) for vanlige endepunkter, og direkte `fetch` for
den strømmende chatten (Server-Sent Events).

## Miljøvariabler og secrets

| Nøkkel | Påkrevd | Brukes til |
| --- | --- | --- |
| `DATABASE_URL` | Ja | Postgres-tilkobling (håndteres av Replit). |
| `BETTER_AUTH_SECRET` / `SESSION_SECRET` | Ja | Innlogging/sesjoner. |
| `ENCRYPTION_KEY` | Ja | Kryptering av integrasjons-credentials. |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` + `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Ja | Claude — AI-rådgiver, innleggsgenerering, anmeldelsessvar, SEO. Settes automatisk av Replit AI-integrasjonen. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL` | Ja for bilder | OpenAI `gpt-image-1` — AI-bilder til innlegg. Settes av Replit AI-integrasjonen. |
| `GOOGLE_PLACES_API_KEY` | Valgfri | Import av egne Google-anmeldelser og henting av konkurrenters vurderinger. Uten den svarer import-endepunktet 503 med en vennlig melding. |

Secrets settes i Replit (Secrets-panelet) — ikke i kode. AI-nøklene kommer fra
Replits AI-integrasjoner og belastes Replit-kredittene til brukeren; bilde- og
tekstgenerering teller mot den månedlige planbegrensningen (gratis 5 / pro 100 /
bedrift ubegrenset).

## Databaseoppsett (Drizzle/Postgres)

Skjemaet defineres i `lib/db/src/schema/lokalradar.ts`. Sentrale tabeller:

- `LokalBusiness` — én bedriftsprofil per bruker (bransje, sted, plan, o.l.).
- `LokalCompetitor` — konkurrenter brukeren følger.
- `LokalSnapshot` — rå/strukturerte øyeblikksbilder (`web` og `reviews`) per skann.
- `LokalAlert` — varsler som genereres når noe endrer seg.
- `LokalGeneration` — logg over AI-genereringer (teller mot planbegrensningen).
- `LokalReview` — anmeldelser (egne + konkurrenters).
- `LokalChatMessage` — meldingshistorikk for AI-rådgiveren (én rullerende samtale
  per bruker; «Ny samtale» tømmer den).

Etter en skjemaendring: bygg db-pakken (`cd lib/db && npx tsc --build`) og
opprett/oppdater tabellene i Postgres. Additiv DDL kan kjøres direkte med SQL
(f.eks. `CREATE TABLE IF NOT EXISTS ...`); Drizzle-push er interaktiv.

## Kjøre lokalt (i Replit)

Workflowene starter automatisk. Manuelt:

```bash
pnpm --filter @workspace/api-server run dev   # backend (Express)
pnpm --filter @workspace/lokalradar run dev   # frontend (Vite)
```

Frontenden krever `PORT` og `BASE_PATH` (settes av Replit-artifact-oppsettet).
Typesjekk: `pnpm --filter @workspace/lokalradar run typecheck` og
`pnpm --filter @workspace/api-server run typecheck`.

## Sanntidsvarsler

Varsler-siden (`/varsler`) og varsel-feeden på oversikten poller backend hvert
30. sekund (React Query `refetchInterval`), så nye varsler dukker opp uten manuell
oppdatering. (Supabase Realtime brukes ikke; polling er den godkjente løsningen.)

## PWA (installerbar app)

Appen har web-app-manifest (`public/manifest.webmanifest`), ikoner
(`public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) og en service
worker (`public/sw.js`). Service workeren registreres kun i produksjonsbygg
(`import.meta.env.PROD`) — en service worker i dev forstyrrer Vite HMR. Etter
publisering kan appen installeres på mobil («Legg til på hjemskjerm») og kjører i
standalone-modus. Service workeren cacher app-skallet (network-first) og lar
aldri `/api/*` bli cachet, så data er alltid ferske.

## Deploy

Publiser via Replit. Sørg for at alle påkrevde secrets finnes i
produksjonsmiljøet, og at produksjonsdatabasen har LokalRadar-tabellene (kjør den
samme additive DDL-en der ved behov). Konkurrentskanning kjører som en
in-prosess-poller i backend — deploy backend som en Reserved VM (ikke autoscale),
slik at polleren holder seg i live.

## Forbedre skrapingen senere

Konkurrentskanningen ligger i `artifacts/api-server/src/lib/lokalradar/`:

- `web-scrape.ts` — henter synlig tekst fra nettsider. Kan gjøres mer robust med
  en headless-nettleser for JS-tunge sider, samt bedre pris-/tjeneste-parsing.
- `google-places.ts` — bruker Google Places API. Merk: Places returnerer kun ca.
  5 av de mest relevante anmeldelsene per sted. Full anmeldelseshistorikk krever
  Google Business Profile API (med OAuth).
- `scan.ts` / `analyze.ts` — diff-logikk og varselgenerering. Nye endringstyper
  legges til her.

Respekter alltid `robots.txt` og rate-limits, og hold en SSRF-vakt på alle
bruker-oppgitte URL-er (allerede på plass for skanning).
