/**
 * Marketing-assistant generation helpers. Each function asks Claude for
 * ready-to-use Norwegian (bokmål) marketing content for a local small business.
 * All output is professional Norwegian without emojis. On failure the callers
 * decide how to surface the error; these helpers throw or return empty so a
 * failed generation is never silently logged as success.
 */
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { BusinessContext } from "./analyze";

const MODEL = "claude-sonnet-4-6";

function businessLine(b: BusinessContext): string {
  return [
    b.name && `Bedriften heter ${b.name}.`,
    b.industry && `Bransje: ${b.industry}.`,
    b.location && `Sted: ${b.location}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function messageText(msg: { content: Array<{ type: string; text?: string }> }): string {
  const block = msg.content[0];
  return block && block.type === "text" && block.text ? block.text : "";
}

// ---------------------------------------------------------------------------
// Post generator (Google Business / social media)
// ---------------------------------------------------------------------------

export interface PostRequest {
  /** google | facebook | instagram */
  channel: string;
  industry?: string | null;
  season?: string | null;
  tone?: string | null;
  keywords?: string | null;
}

const CHANNEL_LABEL: Record<string, string> = {
  google: "innlegg til Google Bedriftsprofil",
  facebook: "Facebook-innlegg",
  instagram: "Instagram-innlegg",
};

export async function generatePosts(
  business: BusinessContext,
  req: PostRequest,
): Promise<string[]> {
  const channelLabel = CHANNEL_LABEL[req.channel] ?? "innlegg for sosiale medier";
  const facts = [
    req.industry && `Bransje eller tema: ${req.industry}.`,
    req.season && `Sesong eller anledning: ${req.season}.`,
    req.tone && `Ønsket tone: ${req.tone}.`,
    req.keywords && `Nøkkelord som bør være med: ${req.keywords}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const system = `Du er en erfaren norsk markedsfører for lokale småbedrifter. ${businessLine(business)}

Du skal skrive ${channelLabel} på norsk (bokmål). ${facts}

Krav:
- Lag 4 forskjellige, ferdige innlegg som eieren kan publisere direkte.
- Hvert innlegg skal være konkret, lokalt forankret og oppfordre kunden til handling.
- Variér lengde og vinkling mellom innleggene.
- ${req.channel === "instagram" ? "Du kan avslutte med noen få relevante hashtags som ren tekst." : "Ikke bruk hashtags med mindre det faller helt naturlig."}
- Ingen emojis. Ikke nummerer innleggene og ikke sett overskrift på dem.
- Svar KUN med gyldig JSON på formatet: { "posts": ["innlegg 1", "innlegg 2", "innlegg 3", "innlegg 4"] }.`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: "Lag innleggene nå." }],
  });
  const text = messageText(msg);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { posts?: unknown };
    if (!Array.isArray(parsed.posts)) return [];
    return parsed.posts
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.trim());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Review-reply assistant
// ---------------------------------------------------------------------------

export interface ReviewForReply {
  author: string | null;
  rating: number | null;
  text: string | null;
}

export async function generateReviewReply(
  business: BusinessContext,
  review: ReviewForReply,
): Promise<string> {
  const critical = typeof review.rating === "number" && review.rating <= 3;
  const system = `Du er eier eller ansvarlig for en norsk lokal småbedrift og svarer profesjonelt på en kundeanmeldelse. ${businessLine(business)}

Skriv ett høflig og profesjonelt svar på norsk (bokmål) til anmeldelsen under.

Krav:
- Takk kunden og vær personlig og imøtekommende.
- ${critical
      ? "Anmeldelsen er kritisk: beklag oppriktig, ta ansvar og tilby å rette opp, uten å være defensiv."
      : "Anmeldelsen er positiv: uttrykk ekte takknemlighet og inviter kunden gjerne tilbake."}
- 2-5 setninger. Ingen emojis. Ingen overskrift. Svar kun med selve svarteksten.`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          author: review.author,
          rating: review.rating,
          text: review.text,
        }),
      },
    ],
  });
  return messageText(msg).trim();
}

// ---------------------------------------------------------------------------
// SEO / website analysis
// ---------------------------------------------------------------------------

export async function analyzeSeo(
  business: BusinessContext,
  url: string,
  pageText: string,
): Promise<string> {
  const system = `Du er en norsk SEO- og nettsideekspert som hjelper lokale småbedrifter med å bli lettere å finne på nett. ${businessLine(business)}

Du får det synlige tekstinnholdet fra bedriftens egen nettside (${url}). Gi konkrete, praktiske forbedringsforslag på norsk (bokmål) for søkemotoroptimalisering (SEO) og nettsiden generelt.

Krav:
- Skriv en punktliste med 6-10 konkrete forslag. Start hver linje med "- ".
- Dekk gjerne: sidetittel og metabeskrivelse, overskrifter, lokale søkeord (sted kombinert med tjeneste), Google Bedriftsprofil, innhold eller sider som mangler, tydelig kontaktinfo og oppfordring til handling.
- Vær spesifikk for nettopp denne bedriften ut fra innholdet, ikke generisk.
- Ingen emojis. Kun punktlisten som ren tekst.`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: pageText }],
  });
  return messageText(msg).trim();
}
