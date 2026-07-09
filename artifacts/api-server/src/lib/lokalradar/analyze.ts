/**
 * Turns detected changes into actionable Norwegian advice with Claude.
 * A single call analyses all of a scan's changes at once (fewer LLM round-trips)
 * and returns one suggestion per change, in the same order. On any failure it
 * falls back to a generic suggestion so alerts are always created.
 */
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { LokalChange } from "./types";

const MODEL = "claude-sonnet-4-6";

export interface BusinessContext {
  name: string | null;
  industry: string | null;
  location: string | null;
}

const FALLBACK =
  "Vurder hvordan denne endringen påvirker deg, og om du bør justere egne priser, tilbud eller markedsføring.";

function buildSystem(business: BusinessContext, competitorName: string): string {
  const who = [
    business.name && `Bedriften heter ${business.name}.`,
    business.industry && `Bransje: ${business.industry}.`,
    business.location && `Sted: ${business.location}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return `Du er en rolig, kompetent lokal markedsrådgiver for en norsk småbedrift. ${who} Du overvåker konkurrenten "${competitorName}".

Du får en liste med endringer som er oppdaget hos konkurrenten. For HVER endring skal du skrive et kort, konkret råd på norsk (bokmål) som svarer på: "Hva betyr dette for deg, og hva bør du gjøre?".

Krav:
- 2-4 setninger per råd. Konkret og praktisk, ikke generisk.
- Snakk direkte til eieren ("du").
- Ingen emojis. Ingen overskrifter. Kun rådet som ren tekst.
- Svar KUN med gyldig JSON på formatet: { "suggestions": ["råd for endring 1", "råd for endring 2", ...] }
- Nøyaktig like mange elementer som antall endringer, i samme rekkefølge.`;
}

export async function analyzeChanges(
  business: BusinessContext,
  competitorName: string,
  changes: LokalChange[],
): Promise<string[]> {
  if (changes.length === 0) return [];

  const userContent = JSON.stringify({
    changes: changes.map((c, i) => ({ index: i + 1, type: c.type, detail: c.detail })),
  });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: buildSystem(business, competitorName),
      messages: [{ role: "user", content: userContent }],
    });
    const block = msg.content[0];
    const text = block && block.type === "text" ? block.text : "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        suggestions?: unknown;
      };
      if (Array.isArray(parsed.suggestions)) {
        return changes.map((_, i) => {
          const s = parsed.suggestions as unknown[];
          return typeof s[i] === "string" && (s[i] as string).trim()
            ? (s[i] as string).trim()
            : FALLBACK;
        });
      }
    }
  } catch (err) {
    console.error("[lokalradar] analyzeChanges failed:", err);
  }
  return changes.map(() => FALLBACK);
}
