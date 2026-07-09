import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Check, Loader2, CreditCard, Sparkles, Crown, Zap } from "lucide-react";

type Tier = "gratis" | "pro" | "bedrift";

interface BillingSummary {
  plan: Tier;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
  hasSubscription: boolean;
  canManageBilling: boolean;
  usage: {
    competitorCount: number;
    competitorLimit: number | null;
    generationCount: number;
    generationLimit: number | null;
  };
  catalog: Array<{ tier: Tier; amount: number; currency: string }>;
}

const TIER_ORDER: Record<Tier, number> = { gratis: 0, pro: 1, bedrift: 2 };

const PLAN_META: Record<
  Tier,
  { name: string; tagline: string; icon: typeof Sparkles; features: string[] }
> = {
  gratis: {
    name: "Gratis",
    tagline: "Kom i gang og hold øye med én konkurrent.",
    icon: Sparkles,
    features: [
      "1 konkurrent overvåket",
      "5 AI-genereringer i måneden",
      "Google-anmeldelser",
      "Varsler i appen",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "For voksende lokalbedrifter som vil ligge i forkant.",
    icon: Zap,
    features: [
      "10 konkurrenter overvåket",
      "100 AI-genereringer i måneden",
      "SEO-analyse og forslag",
      "E-postvarsler",
      "14 dagers gratis prøveperiode",
    ],
  },
  bedrift: {
    name: "Bedrift",
    tagline: "For større virksomheter uten grenser.",
    icon: Crown,
    features: [
      "Ubegrenset antall konkurrenter",
      "Ubegrensede AI-genereringer",
      "Alt i Pro",
      "Prioritert support",
    ],
  },
};

function formatPrice(amount: number, currency: string): string {
  const value = amount / 100;
  const nice = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${nice} ${currency.toUpperCase()}`;
}

function formatEpoch(epoch: number | null): string {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function errMessage(e: unknown, fallback: string): string {
  const cause = (e as { cause?: { error?: string } } | undefined)?.cause;
  return cause?.error ?? fallback;
}

function StatusBadge({ summary }: { summary: BillingSummary }) {
  if (summary.plan === "gratis") {
    return <Badge variant="secondary">Gratis</Badge>;
  }
  if (summary.status === "trialing") {
    return <Badge className="bg-blue-500 hover:bg-blue-500">Prøveperiode</Badge>;
  }
  if (summary.status === "past_due") {
    return <Badge variant="destructive">Betaling feilet</Badge>;
  }
  if (summary.cancelAtPeriodEnd) {
    return <Badge variant="outline">Avsluttes snart</Badge>;
  }
  return <Badge className="bg-green-600 hover:bg-green-600">Aktiv</Badge>;
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limit ?? "∞"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: limit ? `${pct}%` : "100%" }}
        />
      </div>
    </div>
  );
}

export default function AbonnementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifiedRef = useRef(false);
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["lokal-billing-summary"],
    queryFn: () => apiFetch<BillingSummary>("/api/lokalradar/billing/summary"),
  });

  const refetchSummary = () =>
    queryClient.invalidateQueries({ queryKey: ["lokal-billing-summary"] });

  // Handle return from Stripe Checkout.
  useEffect(() => {
    if (verifiedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    verifiedRef.current = true;

    const cleanUrl = `${import.meta.env.BASE_URL}abonnement`.replace(
      /\/\//g,
      "/",
    );
    window.history.replaceState({}, "", cleanUrl);

    if (checkout === "cancelled") {
      toast({
        title: "Betaling avbrutt",
        description: "Ingen endringer ble gjort på abonnementet ditt.",
      });
      return;
    }
    if (checkout === "success") {
      const sessionId = params.get("session_id");
      (async () => {
        try {
          let verified = false;
          if (sessionId) {
            const result = await apiFetch<{ verified: boolean }>(
              "/api/lokalradar/billing/verify",
              { method: "POST", body: JSON.stringify({ sessionId }) },
            );
            verified = result.verified === true;
          }
          await refetchSummary();
          if (verified) {
            toast({
              title: "Takk! Abonnementet er aktivt 🎉",
              description: "Planen din er oppdatert.",
            });
          } else {
            toast({
              title: "Behandler betalingen …",
              description:
                "Vi oppdaterer planen din straks. Last siden på nytt om et øyeblikk hvis den ikke vises.",
            });
          }
        } catch {
          await refetchSummary();
          toast({
            title: "Behandler betalingen …",
            description: "Vi oppdaterer planen din straks.",
          });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: (tier: Tier) =>
      apiFetch<{ url?: string; updated?: boolean; alreadyOnPlan?: boolean }>(
        "/api/lokalradar/billing/checkout",
        { method: "POST", body: JSON.stringify({ tier }) },
      ),
    onSuccess: async (data) => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.updated) {
        await refetchSummary();
        toast({
          title: "Planen er endret",
          description: "Abonnementet ditt er oppdatert.",
        });
      }
      setPendingTier(null);
    },
    onError: (e) => {
      setPendingTier(null);
      toast({
        variant: "destructive",
        title: "Noe gikk galt",
        description: errMessage(e, "Kunne ikke starte betaling."),
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>("/api/lokalradar/billing/portal", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => {
      toast({
        variant: "destructive",
        title: "Noe gikk galt",
        description: errMessage(e, "Kunne ikke åpne kundeportalen."),
      });
    },
  });

  if (isLoading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const priceFor = (tier: Tier) =>
    summary.catalog.find((c) => c.tier === tier) ?? null;

  const startCheckout = (tier: Tier) => {
    setPendingTier(tier);
    checkoutMutation.mutate(tier);
  };

  const currentRank = TIER_ORDER[summary.plan];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Abonnement</h1>
        <p className="text-muted-foreground">
          Administrer planen din, se forbruk og oppgrader når du vokser.
        </p>
      </div>

      {/* Current plan */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {PLAN_META[summary.plan].name}-plan
                <StatusBadge summary={summary} />
              </CardTitle>
              <CardDescription className="mt-1">
                {summary.status === "trialing" && summary.trialEnd
                  ? `Prøveperioden din varer til ${formatEpoch(summary.trialEnd)}.`
                  : summary.cancelAtPeriodEnd && summary.currentPeriodEnd
                    ? `Abonnementet avsluttes ${formatEpoch(summary.currentPeriodEnd)}.`
                    : summary.hasSubscription && summary.currentPeriodEnd
                      ? `Neste betaling: ${formatEpoch(summary.currentPeriodEnd)}.`
                      : "Du er på gratisplanen — ingen betaling."}
              </CardDescription>
            </div>
            {summary.canManageBilling && (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Administrer abonnement
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Separator />
          <div className="grid gap-5 sm:grid-cols-2">
            <UsageBar
              label="Konkurrenter"
              used={summary.usage.competitorCount}
              limit={summary.usage.competitorLimit}
            />
            <UsageBar
              label="AI-genereringer denne måneden"
              used={summary.usage.generationCount}
              limit={summary.usage.generationLimit}
            />
          </div>
          {summary.canManageBilling && (
            <p className="text-xs text-muted-foreground">
              Fakturahistorikk, betalingsmetode og oppsigelse finner du i
              kundeportalen.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">
          Sammenlign planer
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {(Object.keys(PLAN_META) as Tier[]).map((tier) => {
            const meta = PLAN_META[tier];
            const Icon = meta.icon;
            const isCurrent = summary.plan === tier;
            const price = priceFor(tier);
            const isUpgrade = TIER_ORDER[tier] > currentRank;
            const highlight = tier === "pro";

            let cta: React.ReactNode = null;
            if (isCurrent) {
              cta = (
                <Button className="w-full" variant="outline" disabled>
                  Nåværende plan
                </Button>
              );
            } else if (tier === "gratis") {
              // Downgrading to free = cancel the subscription (portal).
              cta = summary.canManageBilling ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  Si opp i kundeportalen
                </Button>
              ) : null;
            } else {
              const loading =
                checkoutMutation.isPending && pendingTier === tier;
              cta = (
                <Button
                  className="w-full"
                  variant={highlight ? "default" : "outline"}
                  onClick={() => startCheckout(tier)}
                  disabled={loading}
                >
                  {loading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isUpgrade ? `Oppgrader til ${meta.name}` : `Bytt til ${meta.name}`}
                </Button>
              );
            }

            return (
              <Card
                key={tier}
                className={cn(
                  "shadow-sm flex flex-col relative",
                  highlight && "border-primary shadow-md",
                  isCurrent && "ring-2 ring-primary/40",
                )}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary hover:bg-primary">
                      Mest populær
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{meta.name}</CardTitle>
                  <CardDescription>{meta.tagline}</CardDescription>
                  <div className="mt-2">
                    {tier === "gratis" ? (
                      <span className="text-3xl font-bold">0 kr</span>
                    ) : price ? (
                      <>
                        <span className="text-3xl font-bold">
                          {formatPrice(price.amount, price.currency)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {" "}
                          / mnd
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Ikke tilgjengelig
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {meta.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {cta}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Priser er oppgitt per måned. Du kan når som helst oppgradere,
          nedgradere eller si opp. Betaling håndteres sikkert av Stripe.
        </p>
      </div>
    </div>
  );
}
