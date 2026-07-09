import { useGetLokalOverview, useListLokalAlerts, getListLokalAlertsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Bell, Sparkles, Star, ArrowRight, Loader2, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useGetLokalOverview();
  const { data: alertsData, isLoading: alertsLoading } = useListLokalAlerts({
    query: {
      queryKey: getListLokalAlertsQueryKey(),
    },
  });

  if (overviewLoading || alertsLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Konkurrenter overvåket",
      value: overview?.competitorCount ?? 0,
      icon: Eye,
      href: "/konkurrenter",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Uleste varsler",
      value: overview?.unreadAlertCount ?? 0,
      icon: Bell,
      href: "/varsler",
      color: "text-destructive",
      bg: "bg-destructive/10"
    },
    {
      title: "Svar & innlegg generert i år",
      value: overview?.generationCountThisMonth ?? 0,
      icon: Sparkles,
      href: "/markedsforing",
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      title: "Sporing av anmeldelser",
      value: overview?.reviewCount ?? 0,
      icon: Star,
      href: "/varsler",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  const recentAlerts = alertsData?.items?.slice(0, 5) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Oversikt</h1>
        <p className="text-muted-foreground">Velkommen tilbake! Her er status for nabolaget ditt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Link key={i} href={kpi.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm group">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">{kpi.value}</div>
                  <div className="text-sm font-medium text-muted-foreground">{kpi.title}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Siste hendelser</h2>
            <Link href="/varsler" className="text-sm font-medium text-primary hover:underline">
              Se alle
            </Link>
          </div>
          
          <Card className="shadow-sm">
            {recentAlerts.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Helt stille i nabolaget</h3>
                <p className="text-muted-foreground max-w-sm">
                  Akkurat nå er det ingen nye hendelser fra dine konkurrenter. Vi sier ifra når noe skjer.
                </p>
                {(overview?.competitorCount ?? 0) === 0 && (
                  <Link href="/konkurrenter">
                    <Button variant="outline" className="mt-6">Legg til en konkurrent</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {recentAlerts.map(alert => (
                  <div key={alert.id} className={`p-4 flex gap-4 transition-colors hover:bg-muted/50 ${!alert.read ? 'bg-primary/5' : ''}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!alert.read ? 'bg-primary' : 'bg-transparent'}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${!alert.read ? 'text-foreground' : 'text-foreground/80'}`}>
                          {alert.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(alert.createdAt)}
                        </span>
                      </div>
                      {alert.body && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {alert.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Hurtighandlinger</h2>
          
          <Card className="shadow-sm bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Trenger du innhold?
              </CardTitle>
              <CardDescription>La AI skrive ukens oppdatering for deg.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/markedsforing">
                <Button className="w-full">Generer innlegg</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                Ditt abonnement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold capitalize">{overview?.plan || 'Gratis'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Konkurrenter</span>
                <span className="font-medium">{overview?.competitorCount} / {overview?.competitorLimit || '∞'}</span>
              </div>
              <Link href="/innstillinger">
                <Button variant="outline" size="sm" className="w-full mt-2">Oppgrader plan</Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
