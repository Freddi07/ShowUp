import { useState } from "react";
import {
  useListLokalReviews,
  getListLokalReviewsQueryKey,
  useCreateLokalReview,
  useGenerateLokalReviewReply,
  useImportLokalGoogleReviews,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Star,
  Sparkles,
  Copy,
  CheckCheck,
  MessageSquareQuote,
  Download,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewReplies({
  atLimit,
  onGenerated,
}: {
  atLimit: boolean;
  onGenerated: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListLokalReviews({
    query: { queryKey: getListLokalReviewsQueryKey() },
  });
  const createReview = useCreateLokalReview();
  const generateReply = useGenerateLokalReviewReply();
  const importGoogle = useImportLokalGoogleReviews();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ author: "", rating: "5", text: "", source: "" });
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reviews = data?.items || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    try {
      await createReview.mutateAsync({
        data: {
          author: form.author || null,
          rating: Number(form.rating),
          text: form.text,
          source: form.source || null,
        },
      });
      toast({ title: "Anmeldelse lagt til" });
      setIsAddOpen(false);
      setForm({ author: "", rating: "5", text: "", source: "" });
      queryClient.invalidateQueries({ queryKey: getListLokalReviewsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Kunne ikke lagre",
        description: err?.data?.error || undefined,
        variant: "destructive",
      });
    }
  };

  const handleSuggest = async (reviewId: string) => {
    setPendingId(reviewId);
    try {
      const res = await generateReply.mutateAsync({ data: { reviewId } });
      setReplies((prev) => ({ ...prev, [reviewId]: res.reply }));
      onGenerated();
    } catch (err: any) {
      toast({
        title: "Kunne ikke lage svar",
        description: err?.data?.error || "Prøv igjen om litt.",
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImportGoogle = async () => {
    try {
      const res = await importGoogle.mutateAsync();
      toast({
        title: res.imported > 0 ? "Import fullført" : "Ingen nye anmeldelser",
        description: res.message,
      });
      queryClient.invalidateQueries({ queryKey: getListLokalReviewsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Kunne ikke importere fra Google",
        description: err?.data?.error || "Prøv igjen om litt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Få forslag til profesjonelle svar på kundeanmeldelser. Rediger fritt før du
          publiserer.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleImportGoogle}
            disabled={importGoogle.isPending}
          >
            {importGoogle.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Importer fra Google
          </Button>
          <Button variant="outline" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Legg til anmeldelse
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center border border-dashed rounded-2xl bg-muted/20 p-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <MessageSquareQuote className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ingen anmeldelser ennå</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Lim inn en anmeldelse du har fått, så foreslår vi et gjennomtenkt svar du kan
            sende tilbake.
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Legg til din første
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold truncate">
                    {review.author || "Anonym kunde"}
                  </span>
                  <Stars rating={review.rating} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {review.source || "manuell"}
                </span>
              </div>
              {review.text && (
                <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                  {review.text}
                </p>
              )}

              {replies[review.id] !== undefined ? (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Foreslått svar (rediger fritt)
                  </Label>
                  <Textarea
                    value={replies[review.id]}
                    onChange={(e) =>
                      setReplies((prev) => ({ ...prev, [review.id]: e.target.value }))
                    }
                    className="resize-none min-h-[110px] leading-relaxed"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === review.id || atLimit}
                      onClick={() => handleSuggest(review.id)}
                    >
                      {pendingId === review.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Nytt forslag
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCopy(review.id, replies[review.id])}
                    >
                      {copiedId === review.id ? (
                        <CheckCheck className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copiedId === review.id ? "Kopiert" : "Kopier svar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(review.createdAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingId === review.id || atLimit}
                    onClick={() => handleSuggest(review.id)}
                  >
                    {pendingId === review.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Foreslå svar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Legg til anmeldelse</DialogTitle>
              <DialogDescription>
                Lim inn en anmeldelse du har mottatt, så hjelper vi deg å svare.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">Navn på kunde</Label>
                  <Input
                    id="author"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Valgfritt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vurdering</Label>
                  <Select
                    value={form.rating}
                    onValueChange={(v) => setForm({ ...form, rating: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} stjerne{n === 1 ? "" : "r"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Kilde</Label>
                <Input
                  id="source"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="F.eks. Google, Facebook (valgfritt)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text">Anmeldelsestekst *</Label>
                <Textarea
                  id="text"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Lim inn hva kunden skrev …"
                  className="resize-none h-28"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={createReview.isPending || !form.text.trim()}>
                {createReview.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Lagre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
