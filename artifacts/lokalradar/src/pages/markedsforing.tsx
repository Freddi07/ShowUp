import { useListLokalGenerations, getListLokalGenerationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Copy, CheckCheck } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "@/lib/utils";

export default function MarkedsforingPage() {
  const { data, isLoading } = useListLokalGenerations({
    query: { queryKey: getListLokalGenerationsQueryKey() }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generations = data?.items || [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Markedsføringsassistent</h1>
          <p className="text-muted-foreground">Ferdigskrevne innlegg og svar, klare til bruk.</p>
        </div>
        <Button className="shrink-0 group">
          <Sparkles className="w-4 h-4 mr-2 group-hover:text-amber-200 transition-colors" />
          Nytt innlegg
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center p-16 md:p-24 border border-dashed rounded-3xl bg-card flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">La AI ta seg av skrivingen</h2>
          <p className="text-muted-foreground max-w-md mb-10 text-lg leading-relaxed">
            Når vi oppdager trender hos dine konkurrenter, eller når du trenger inspirasjon, tryller vi frem ferdige innlegg for Facebook, Instagram og Google.
          </p>
          <Button size="lg" className="rounded-full px-8 shadow-md">
            <Sparkles className="w-5 h-5 mr-2" />
            Generer ditt første innlegg
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {generations.map((gen, i) => (
            <div key={gen.id} className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                    {gen.channel || gen.kind}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatDateTime(gen.createdAt)}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(gen.id, gen.content)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copiedId === gen.id ? <CheckCheck className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedId === gen.id ? "Kopiert!" : "Kopier"}
                </Button>
              </div>
              
              {gen.prompt && (
                <div className="text-sm font-medium text-muted-foreground mb-4 pb-4 border-b">
                  Ledetekst: "{gen.prompt}"
                </div>
              )}
              
              <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                {gen.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
