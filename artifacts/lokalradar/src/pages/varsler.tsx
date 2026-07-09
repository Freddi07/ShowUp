import { useListLokalAlerts, useUpdateLokalAlert, getListLokalAlertsQueryKey, getGetLokalOverviewQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/utils";
import { Bell, Check, Loader2, AlertCircle, Info, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VarslerPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListLokalAlerts({
    query: { queryKey: getListLokalAlertsQueryKey() }
  });
  const updateAlert = useUpdateLokalAlert();

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      // Optimistic-like UI update could go here, but we'll just await mutation and invalidate
      await updateAlert.mutateAsync({ id, data: { read: !currentRead } });
      queryClient.invalidateQueries({ queryKey: getListLokalAlertsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    if (!data?.items) return;
    const unreads = data.items.filter(a => !a.read);
    // In a real app we'd have a bulk endpoint, but here we loop
    for (const a of unreads) {
      await updateAlert.mutateAsync({ id: a.id, data: { read: true } });
    }
    queryClient.invalidateQueries({ queryKey: getListLokalAlertsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
  };

  const alerts = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'warning': return <ArrowUpCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Varsler</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold -mt-2">
                {unreadCount} nye
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Alt som skjer i nabolaget i kronologisk rekkefølge.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} size="sm">
            <Check className="w-4 h-4 mr-2" />
            Marker alle som lest
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center p-16 border border-dashed rounded-3xl bg-muted/10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ingen varsler</h2>
          <p className="text-muted-foreground max-w-sm">
            Alt er rolig. Vi gir deg beskjed når vi fanger opp noe nytt.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`flex gap-4 p-5 rounded-2xl border transition-all ${
                !alert.read 
                  ? 'bg-card shadow-sm border-primary/20' 
                  : 'bg-background/50 text-muted-foreground border-transparent'
              }`}
            >
              <div className="shrink-0 mt-1">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`font-semibold text-lg ${!alert.read ? 'text-foreground' : ''}`}>
                    {alert.title}
                  </h3>
                  <span className="text-xs font-medium whitespace-nowrap opacity-80">
                    {formatDateTime(alert.createdAt)}
                  </span>
                </div>
                {alert.body && (
                  <p className={`leading-relaxed ${!alert.read ? 'text-muted-foreground' : ''}`}>
                    {alert.body}
                  </p>
                )}
                {/* Meta row */}
                <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border/50 text-sm font-medium">
                  {alert.type && (
                    <span className="uppercase tracking-wider text-[10px] opacity-70">
                      Kategori: {alert.type}
                    </span>
                  )}
                  <button 
                    onClick={() => handleToggleRead(alert.id, alert.read)}
                    className="ml-auto text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {alert.read ? 'Marker som ulest' : 'Marker som lest'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
