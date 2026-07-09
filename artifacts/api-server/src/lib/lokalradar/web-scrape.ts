/**
 * Website fetch + structured extraction for LokalRadar.
 *
 * We fetch the competitor's page with the built-in fetch (with a timeout and a
 * body-size cap), reduce the HTML to human-visible text with cheerio, and ask
 * Claude to pull out prices, offers and promotions as strict JSON. All failures
 * are surfaced explicitly via thrown Errors so the caller can record them.
 */
import * as cheerio from "cheerio";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { LokalWebData, LokalPrice } from "./types";

const MODEL = "claude-sonnet-4-6";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 14_000;
const MAX_REDIRECTS = 5;

/**
 * SSRF guard: decide whether a resolved IP points at a private/internal target
 * that a public web scraper must never be able to reach.
 */
function isBlockedIp(ip: string): boolean {
  let addr = ip;
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) addr = mapped[1];

  if (net.isIPv4(addr)) {
    const [a, b] = addr.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved (224.0.0.0/3)
    return false;
  }
  if (net.isIPv6(addr)) {
    const low = addr.toLowerCase();
    if (low === "::1" || low === "::") return true; // loopback / unspecified
    if (/^f[cd]/.test(low)) return true; // unique local fc00::/7
    if (/^fe[89ab]/.test(low)) return true; // link-local fe80::/10
    if (/^ff/.test(low)) return true; // multicast
    return false;
  }
  return true; // anything unparseable is blocked
}

/**
 * Custom DNS lookup used for outbound scrape requests. Every resolved address
 * is validated before the socket connects, so redirect hops and DNS-rebinding
 * both go through the same block-list on the actual connection target.
 */
function safeLookup(
  hostname: string,
  options: Parameters<typeof dnsLookup>[1],
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dnsLookup(hostname, options as any, (err: NodeJS.ErrnoException | null, address: any, family: any) => {
    if (err) return callback(err, address, family);
    const opts = (typeof options === "object" && options) || {};
    if ((opts as any).all) {
      const list = address as LookupAddress[];
      for (const a of list) {
        if (isBlockedIp(a.address)) return callback(new Error("Blokkert intern adresse"), address, family);
      }
      return callback(null, list);
    }
    if (isBlockedIp(address as string)) return callback(new Error("Blokkert intern adresse"), address, family);
    callback(null, address as string, family);
  });
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  buf: Buffer;
}

/** Perform a single GET (no redirect following) with SSRF-safe DNS + limits. */
function requestOnce(urlStr: string): Promise<RawResponse> {
  return new Promise<RawResponse>((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      return reject(new Error("Ugyldig nettadresse"));
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return reject(new Error("Ugyldig protokoll"));
    }
    // IP-literal hosts skip DNS entirely, so the custom lookup never runs.
    // Validate them synchronously here to close that SSRF bypass.
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isBlockedIp(host)) {
      return reject(new Error("Blokkert intern adresse"));
    }
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup as any,
        timeout: FETCH_TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LokalRadar/1.0; +https://lokalradar.no)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_HTML_BYTES) {
            req.destroy(new Error("Nettsiden er for stor til å analyseres"));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, buf: Buffer.concat(chunks) }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("Tidsavbrudd ved henting av nettsiden")));
    req.on("error", (err) => reject(err));
    req.end();
  });
}

/** Fetch HTML, following redirects manually so each hop is SSRF-validated. */
async function safeFetchHtml(startUrl: string): Promise<Buffer> {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const { status, headers, buf } = await requestOnce(current);
    if (status >= 300 && status < 400 && headers.location) {
      current = new URL(headers.location, current).toString();
      continue;
    }
    if (status < 200 || status >= 300) {
      throw new Error(`Nettsiden svarte med feil (${status})`);
    }
    const ct = String(headers["content-type"] ?? "");
    if (!ct.includes("html") && !ct.includes("text")) {
      throw new Error("Nettadressen peker ikke til en nettside");
    }
    return buf;
  }
  throw new Error("For mange videresendinger");
}

/** Normalise a user-provided website value into an absolute http(s) URL. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Tom nettadresse");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProto);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Ugyldig nettadresse");
  }
  return url.toString();
}

/** Fetch a page and return the reduced, human-visible text content. */
export async function fetchVisibleText(url: string): Promise<string> {
  const buf = await safeFetchHtml(url);
  const html = new TextDecoder("utf-8").decode(buf);

  const $ = cheerio.load(html);

  // Title + meta description give useful context even on JS-heavy sites.
  const parts: string[] = [];
  const title = $("title").first().text().trim();
  if (title) parts.push(`TITTEL: ${title}`);
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  if (metaDesc) parts.push(`BESKRIVELSE: ${metaDesc}`);

  // JSON-LD structured data often carries offers, priceRange and ratings even
  // when the visible DOM is rendered client-side. Keep it compact.
  const jsonLd: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (raw && raw.length < 8000) jsonLd.push(raw);
  });
  if (jsonLd.length) {
    parts.push(`STRUKTURERTE DATA: ${jsonLd.join(" ").slice(0, 6000)}`);
  }

  // Reduce the DOM to human-visible text.
  $("script, style, noscript, svg, iframe, head").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  if (bodyText) parts.push(`INNHOLD: ${bodyText}`);

  const combined = parts.join("\n\n").trim();
  if (!combined) throw new Error("Fant ikke noe innhold på nettsiden");
  return combined.slice(0, MAX_TEXT_CHARS);
}

/** Best-effort parse of a Norwegian price string into a number (NOK). */
function parseAmount(raw: string): number | null {
  const m = raw.match(/(\d[\d\s.]*\d|\d)(?:[,.](\d{1,2}))?/);
  if (!m) return null;
  const whole = m[1].replace(/[\s.]/g, "");
  const frac = m[2] ? `.${m[2]}` : "";
  const n = Number.parseFloat(`${whole}${frac}`);
  return Number.isFinite(n) ? n : null;
}

const EXTRACTION_SYSTEM = `Du er en presis dataekstraktor for norske småbedrifter. Du får ren tekst fra en konkurrents nettside. Trekk ut strukturert informasjon og svar KUN med gyldig JSON (ingen forklaring, ingen markdown-kodeblokk).

JSON-formatet skal være nøyaktig:
{
  "prices": [{ "label": "kort beskrivelse av tjenesten/varen", "raw": "pristeksten slik den står" }],
  "offers": ["konkrete tjenester eller produkter bedriften tilbyr"],
  "promotions": ["tidsbegrensede tilbud, kampanjer, rabatter eller nyheter"],
  "services": ["hovedkategorier av tjenester"],
  "summary": "1-2 setninger på norsk som oppsummerer hva bedriften tilbyr"
}

Regler:
- Ta kun med priser som faktisk står på siden. Ikke gjett.
- Hold hver liste til maks 15 elementer, de viktigste først.
- Hvis noe mangler, bruk tom liste [] eller null for summary.
- All tekst skal være på norsk.`;

/** Extract structured JSON from a snippet of naked HTML text using Claude. */
export async function extractWebData(text: string): Promise<LokalWebData> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  const block = msg.content[0];
  const rawJson = block && block.type === "text" ? block.text : "";
  const parsed = safeParseJson(rawJson);

  const rawPrices = Array.isArray(parsed.prices) ? parsed.prices : [];
  const prices: LokalPrice[] = rawPrices
    .filter((p): p is { label?: unknown; raw?: unknown } => !!p && typeof p === "object")
    .map((p) => {
      const raw = typeof p.raw === "string" ? p.raw : null;
      const amount = raw ? parseAmount(raw) : null;
      return {
        label: typeof p.label === "string" ? p.label : "Pris",
        amount,
        currency: amount !== null ? "NOK" : null,
        raw,
      };
    })
    .slice(0, 20);

  const toStrList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, 20)
      : [];

  return {
    prices,
    offers: toStrList(parsed.offers),
    promotions: toStrList(parsed.promotions),
    services: toStrList(parsed.services),
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
  };
}

/** Parse JSON that may be wrapped in prose or a code fence. */
function safeParseJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Fetch + extract in one call. */
export async function scrapeWebsite(url: string): Promise<LokalWebData> {
  const text = await fetchVisibleText(url);
  return extractWebData(text);
}
