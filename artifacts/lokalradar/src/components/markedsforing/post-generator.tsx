import { useState } from "react";
import {
  useGenerateLokalPosts,
  useGenerateLokalPostImage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  Copy,
  CheckCheck,
  PenLine,
  ImageIcon,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHANNELS = [
  { value: "google", label: "Google Bedriftsprofil" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
];

const TONES = [
  "Vennlig og uformell",
  "Profesjonell",
  "Entusiastisk",
  "Rolig og tillitsvekkende",
  "Leken og morsom",
];

export function PostGenerator({
  atLimit,
  onGenerated,
}: {
  atLimit: boolean;
  onGenerated: () => void;
}) {
  const { toast } = useToast();
  const generate = useGenerateLokalPosts();
  const generateImage = useGenerateLokalPostImage();

  const [channel, setChannel] = useState("facebook");
  const [industry, setIndustry] = useState("");
  const [season, setSeason] = useState("");
  const [tone, setTone] = useState("Vennlig og uformell");
  const [keywords, setKeywords] = useState("");

  const [posts, setPosts] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [imgPendingIdx, setImgPendingIdx] = useState<number | null>(null);

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleGenerateImage = async (idx: number, post: string) => {
    setImgPendingIdx(idx);
    try {
      const res = await generateImage.mutateAsync({ data: { post, channel } });
      setImages((prev) => ({ ...prev, [idx]: res.image }));
      onGenerated();
    } catch (err: any) {
      toast({
        title: "Kunne ikke lage bilde",
        description: err?.data?.error || "Prøv igjen om litt.",
        variant: "destructive",
      });
    } finally {
      setImgPendingIdx(null);
    }
  };

  const handleDownload = (idx: number, dataUrl: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `innlegg-bilde-${idx + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await generate.mutateAsync({
        data: {
          channel,
          industry: industry || null,
          season: season || null,
          tone: tone || null,
          keywords: keywords || null,
        },
      });
      setPosts(res.posts);
      onGenerated();
    } catch (err: any) {
      toast({
        title: "Kunne ikke lage innlegg",
        description: err?.data?.error || "Prøv igjen om litt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={handleGenerate}
        className="space-y-5 bg-card border rounded-2xl p-6 shadow-sm h-fit"
      >
        <div className="space-y-2">
          <Label>Kanal</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">
            Bransje eller tema{" "}
            <span className="text-muted-foreground font-normal">(valgfritt)</span>
          </Label>
          <Input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="F.eks. frisør, kafé, bilverksted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="season">
            Sesong eller anledning{" "}
            <span className="text-muted-foreground font-normal">(valgfritt)</span>
          </Label>
          <Input
            id="season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="F.eks. sommer, Black Friday, nyåpning"
          />
        </div>

        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">
            Nøkkelord{" "}
            <span className="text-muted-foreground font-normal">(valgfritt)</span>
          </Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="F.eks. tilbud, timebestilling, kortreist"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={generate.isPending || atLimit}
        >
          {generate.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Lag innlegg
        </Button>
        {atLimit && (
          <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
            Du har nådd grensen for AI-genereringer denne måneden.
          </p>
        )}
      </form>

      <div className="min-h-[300px]">
        {generate.isPending ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Skriver ferdige innlegg til deg …</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center border border-dashed rounded-2xl bg-muted/20 p-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <PenLine className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ferdige innlegg på sekunder</h3>
            <p className="text-muted-foreground max-w-sm">
              Fyll inn litt om hva du vil fremme, så lager vi flere forslag du kan
              kopiere rett inn i kanalen din.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <div
                key={i}
                className="bg-card border rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-3"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed flex-1">
                    {post}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(i, post)}
                  >
                    {copiedIdx === i ? (
                      <CheckCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {images[i] ? (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <img
                      src={images[i]}
                      alt="AI-generert bilde til innlegget"
                      className="w-full rounded-xl border"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={imgPendingIdx === i || atLimit}
                        onClick={() => handleGenerateImage(i, post)}
                      >
                        {imgPendingIdx === i ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Nytt bilde
                      </Button>
                      <Button size="sm" onClick={() => handleDownload(i, images[i])}>
                        <Download className="w-4 h-4 mr-2" />
                        Last ned
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 border-t pt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      Lag et passende bilde til innlegget med AI.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={imgPendingIdx === i || atLimit}
                      onClick={() => handleGenerateImage(i, post)}
                    >
                      {imgPendingIdx === i ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4 mr-2" />
                      )}
                      Generer bilde
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
