import { useState } from "react";
import { useGenerateLokalSeo } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Copy, CheckCheck, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SeoAnalysis({
  atLimit,
  onGenerated,
}: {
  atLimit: boolean;
  onGenerated: () => void;
}) {
  const { toast } = useToast();
  const analyze = useGenerateLokalSeo();

  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ url: string; suggestions: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const res = await analyze.mutateAsync({ data: { url } });
      setResult({ url: res.url, suggestions: res.suggestions });
      onGenerated();
    } catch (err: any) {
      toast({
        title: "Kunne ikke analysere",
        description: err?.data?.error || "Sjekk at adressen er riktig og prøv igjen.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.suggestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines =
    result?.suggestions
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleAnalyze} className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="seo-url">Din nettadresse</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="seo-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="dinbedrift.no"
              className="flex-1"
            />
            <Button type="submit" disabled={analyze.isPending || atLimit || !url.trim()}>
              {analyze.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Analyser nettsiden
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Vi henter innholdet på siden din og gir konkrete forslag til hvordan du blir
            lettere å finne på nett.
          </p>
          {atLimit && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Du har nådd grensen for AI-genereringer denne måneden.
            </p>
          )}
        </div>
      </form>

      {analyze.isPending ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3 py-16">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Leser nettsiden din og finner forbedringer …</p>
        </div>
      ) : result ? (
        <div className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b">
            <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">{result.url.replace(/^https?:\/\//, "")}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <CheckCheck className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Kopiert" : "Kopier alle"}
            </Button>
          </div>
          <ul className="space-y-3">
            {lines.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center border border-dashed rounded-2xl bg-muted/20 p-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sjekk hvordan nettsiden din står</h3>
          <p className="text-muted-foreground max-w-sm">
            Skriv inn adressen til din egen nettside, så får du en konkret liste med
            forbedringer for søk og synlighet.
          </p>
        </div>
      )}
    </div>
  );
}
