import { useState } from "react";
import {
  useGetLokalOverview,
  getGetLokalOverviewQueryKey,
  useListLokalGenerations,
  getListLokalGenerationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PenLine,
  MessageSquareQuote,
  Search,
  Sparkles,
  Copy,
  CheckCheck,
  History,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { PostGenerator } from "@/components/markedsforing/post-generator";
import { ReviewReplies } from "@/components/markedsforing/review-replies";
import { SeoAnalysis } from "@/components/markedsforing/seo-analysis";

const KIND_LABELS: Record<string, string> = {
  google_post: "Google-innlegg",
  social_post: "Sosiale medier",
  review_reply: "Anmeldelsessvar",
  seo_tip: "SEO-analyse",
};

export default function MarkedsforingPage() {
  const queryClient = useQueryClient();
  const { data: overview } = useGetLokalOverview();
  const { data: gens } = useListLokalGenerations({
    query: { queryKey: getListLokalGenerationsQueryKey() },
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const limit = overview?.generationLimit ?? null;
  const used = overview?.generationCountThisMonth ?? 0;
  const atLimit = limit !== null && used >= limit;

  const onGenerated = () => {
    queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListLokalGenerationsQueryKey() });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generations = gens?.items || [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Markedsføringsassistent
          </h1>
          <p className="text-muted-foreground">
            Ferdige innlegg, gjennomtenkte svar og konkrete nettsideråd, klare til bruk.
          </p>
        </div>
        {limit !== null && (
          <div className="w-full sm:w-56 shrink-0">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">AI denne måneden</span>
              <span className="font-medium">
                {used} / {limit}
              </span>
            </div>
            <Progress value={Math.min(100, (used / Math.max(1, limit)) * 100)} />
          </div>
        )}
      </div>

      {atLimit && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm font-medium">
            Du har brukt opp AI-genereringene dine denne måneden. Oppgrader for å lage mer
            innhold.
          </span>
          <Link href="/innstillinger">
            <Button
              variant="outline"
              size="sm"
              className="bg-background text-foreground border-amber-500/20"
            >
              Oppgrader plan
            </Button>
          </Link>
        </div>
      )}

      <Tabs defaultValue="innlegg" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="innlegg">
            <PenLine className="w-4 h-4 mr-2" />
            Innlegg
          </TabsTrigger>
          <TabsTrigger value="anmeldelser">
            <MessageSquareQuote className="w-4 h-4 mr-2" />
            Anmeldelser
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Search className="w-4 h-4 mr-2" />
            SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="innlegg">
          <PostGenerator atLimit={atLimit} onGenerated={onGenerated} />
        </TabsContent>
        <TabsContent value="anmeldelser">
          <ReviewReplies atLimit={atLimit} onGenerated={onGenerated} />
        </TabsContent>
        <TabsContent value="seo">
          <SeoAnalysis atLimit={atLimit} onGenerated={onGenerated} />
        </TabsContent>
      </Tabs>

      {generations.length > 0 && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="w-4 h-4" />
            Tidligere generert
          </div>
          <div className="space-y-3">
            {generations.slice(0, 10).map((gen) => (
              <div key={gen.id} className="bg-card border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                      {KIND_LABELS[gen.kind] || gen.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(gen.createdAt)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(gen.id, gen.content)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === gen.id ? (
                      <CheckCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {gen.prompt && (
                  <p className="text-xs text-muted-foreground mb-2 italic">{gen.prompt}</p>
                )}
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {gen.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
