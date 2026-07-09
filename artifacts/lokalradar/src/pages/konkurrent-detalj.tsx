import { useParams, Link, useLocation } from "wouter";
import {
  useGetLokalCompetitor,
  getGetLokalCompetitorQueryKey,
  useScanLokalCompetitor,
  getListLokalCompetitorsQueryKey,
  getListLokalAlertsQueryKey,
  getGetLokalOverviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Globe,
  MapPin,
  RefreshCw,
  Loader2,
  Tag,
  Sparkles,
  Star,
  AlertCircle,
  Info,
  ArrowUpCircle,
  TrendingDown,
  MessageSquareText,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function statusBadge(status: string) {
  switch (status) {
    case "ok":
      return <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/15 border-green-500/20">Overvåkes</Badge>;
    case "error":
      return <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/20">Feil ved skanning</Badge>;
    default:
      return <Badge variant="secondary">Ikke skannet ennå</Badge>;
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    case "warning":
      return <ArrowUpCircle className="w-5 h-5 text-amber-500" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
}

const chartDate = (iso: string) =>
  new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" }).format(new Date(iso));

export default function KonkurrentDetaljPage() {
  const params = useParams();
  const id = params.id as string;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError } = useGetLokalCompetitor(id, {
    query: { queryKey: getGetLokalCompetitorQueryKey(id) },
  });
  const scan = useScanLokalCompetitor();

  const handleScan = async () => {
    try {
      const result = await scan.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetLokalCompetitorQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListLokalCompetitorsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListLokalAlertsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
      if (result.status === "error") {
        toast({ title: "Skanning feilet", description: result.message || undefined, variant: "destructive" });
      } else if (result.createdAlerts > 0) {
        toast({ title: `${result.createdAlerts} ny${result.createdAlerts === 1 ? "" : "e"} endring${result.createdAlerts === 1 ? "" : "er"} oppdaget` });
      } else {
        toast({ title: "Skanning fullført", description: "Ingen nye endringer siden sist." });
      }
    } catch {
      toast({ title: "Kunne ikke skanne", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Link href="/konkurrenter" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Tilbake til konkurrenter
        </Link>
        <div className="text-center p-16 border border-dashed rounded-3xl">
          <h2 className="text-xl font-semibold mb-2">Fant ikke konkurrenten</h2>
          <p className="text-muted-foreground">Den kan ha blitt fjernet.</p>
        </div>
      </div>
    );
  }

  const { competitor, latestWeb, latestReviews, alerts, reviews, priceHistory, ratingHistory } = data;

  const priceSeries = priceHistory
    .filter((p) => p.minPrice !== null)
    .map((p) => ({ dato: chartDate(p.capturedAt), pris: p.minPrice }));
  const ratingSeries = ratingHistory
    .filter((r) => r.rating !== null)
    .map((r) => ({ dato: chartDate(r.capturedAt), vurdering: r.rating, antall: r.reviewCount }));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <button
          onClick={() => navigate("/konkurrenter")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Tilbake til konkurrenter
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{competitor.name}</h1>
              {statusBadge(competitor.status)}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
              {competitor.location && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {competitor.location}</span>
              )}
              {competitor.website && (
                <a
                  href={competitor.website.startsWith("http") ? competitor.website : `https://${competitor.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Globe className="w-4 h-4" /> {competitor.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span>
                {competitor.lastCheckedAt ? `Sist sjekket ${formatDateTime(competitor.lastCheckedAt)}` : "Aldri sjekket"}
              </span>
            </div>
          </div>
          <Button onClick={handleScan} disabled={scan.isPending} className="shrink-0">
            {scan.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Skann nå
          </Button>
        </div>
      </div>

      {competitor.status === "error" && competitor.lastError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{competitor.lastError}</span>
        </div>
      )}

      {competitor.status === "idle" && (
        <div className="bg-muted/40 border border-dashed p-6 rounded-2xl text-center">
          <p className="text-muted-foreground mb-4">Denne konkurrenten er ikke skannet ennå. Kjør en skanning for å hente priser, tilbud og anmeldelser.</p>
          <Button onClick={handleScan} disabled={scan.isPending}>
            {scan.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Skann nå
          </Button>
        </div>
      )}

      {/* Charts */}
      {(priceSeries.length >= 2 || ratingSeries.length >= 2) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {priceSeries.length >= 2 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-primary" /> Prisutvikling (laveste pris)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dato" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [`${v} kr`, "Laveste pris"]} />
                    <Line type="monotone" dataKey="pris" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {ratingSeries.length >= 2 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Vurderingsutvikling</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dato" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [`${v} ★`, "Vurdering"]} />
                    <Line type="monotone" dataKey="vurdering" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: current data */}
        <div className="lg:col-span-2 space-y-6">
          {latestReviews && (latestReviews.rating !== null || latestReviews.reviewCount !== null) && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Google-anmeldelser</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-3xl font-bold">{latestReviews.rating?.toFixed(1) ?? "–"}<span className="text-amber-500 text-xl"> ★</span></div>
                    <div className="text-sm text-muted-foreground">{latestReviews.reviewCount ?? 0} anmeldelser</div>
                  </div>
                </div>
                {latestReviews.reviews.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {latestReviews.reviews.map((r, i) => (
                      <div key={i} className="border-l-2 border-muted pl-3 py-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{r.author ?? "Anonym"}</span>
                          {r.rating !== null && <span className="text-amber-500">{"★".repeat(Math.round(r.rating))}</span>}
                          {r.relativeTime && <span className="text-xs text-muted-foreground">{r.relativeTime}</span>}
                        </div>
                        {r.text && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{r.text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {latestWeb && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Fra nettsiden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {latestWeb.summary && <p className="text-sm text-muted-foreground leading-relaxed">{latestWeb.summary}</p>}

                {latestWeb.prices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Tag className="w-4 h-4" /> Priser</h4>
                    <div className="space-y-1.5">
                      {latestWeb.prices.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">{p.label}</span>
                          <span className="font-medium">{p.amount !== null ? `${p.amount.toLocaleString("nb-NO")} kr` : p.raw}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {latestWeb.promotions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Kampanjer og tilbud</h4>
                    <ul className="space-y-1.5">
                      {latestWeb.promotions.map((o, i) => (
                        <li key={i} className="text-sm bg-amber-500/10 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-lg">{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestWeb.offers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tjenester og produkter</h4>
                    <div className="flex flex-wrap gap-2">
                      {latestWeb.offers.map((o, i) => (
                        <Badge key={i} variant="secondary" className="font-normal">{o}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {competitor.notes && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Dine notater</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{competitor.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right: change history */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><MessageSquareText className="w-5 h-5" /> Endringslogg</h2>
          {alerts.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Ingen endringer oppdaget ennå. Vi varsler deg når noe skjer.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <Card key={a.id} className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">{severityIcon(a.severity)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm leading-snug">{a.title}</p>
                        <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                      </div>
                    </div>
                    {a.body && (
                      <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 flex gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{a.body}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Anmeldelseshistorikk</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reviews.slice(0, 20).map((r) => (
              <div key={r.id} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{r.author ?? "Anonym"}</span>
                  {r.rating !== null && <span className="text-amber-500">{"★".repeat(r.rating)}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{r.reviewedAt ? formatDate(r.reviewedAt) : ""}</span>
                </div>
                {r.text && <p className="text-sm text-muted-foreground mt-1">{r.text}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
