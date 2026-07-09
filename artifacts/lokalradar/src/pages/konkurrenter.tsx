import { useState } from "react";
import { 
  useListLokalCompetitors, 
  getListLokalCompetitorsQueryKey,
  useCreateLokalCompetitor,
  useDeleteLokalCompetitor,
  useGetLokalOverview,
  getGetLokalOverviewQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Users, Globe, MapPin, Trash2, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function KonkurrenterPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading } = useListLokalCompetitors({
    query: { queryKey: getListLokalCompetitorsQueryKey() }
  });
  const { data: overview } = useGetLokalOverview();
  
  const createCompetitor = useCreateLokalCompetitor();
  const deleteCompetitor = useDeleteLokalCompetitor();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    location: "",
    notes: ""
  });

  const competitors = data?.items || [];
  const atLimit = overview?.competitorLimit !== null && (overview?.competitorCount ?? 0) >= (overview?.competitorLimit ?? 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await createCompetitor.mutateAsync({
        data: {
          name: formData.name,
          website: formData.website || null,
          location: formData.location || null,
          notes: formData.notes || null,
        }
      });
      toast({ title: "Konkurrent lagt til" });
      setIsAddOpen(false);
      setFormData({ name: "", website: "", location: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: getListLokalCompetitorsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
    } catch (err: any) {
      toast({
        title: "Kunne ikke legge til",
        description: err?.cause?.error || "Du har kanskje nådd grensen for din plan.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCompetitor.mutateAsync({ id: deleteId });
      toast({ title: "Konkurrent fjernet" });
      queryClient.invalidateQueries({ queryKey: getListLokalCompetitorsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLokalOverviewQueryKey() });
    } catch (err) {
      toast({ title: "Kunne ikke fjerne", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Konkurrenter</h1>
          <p className="text-muted-foreground">De vi holder øye med i nabolaget for deg.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shrink-0" disabled={atLimit}>
          <Plus className="w-4 h-4 mr-2" />
          Legg til konkurrent
        </Button>
      </div>

      {atLimit && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium">Du har nådd grensen på {overview?.competitorLimit} konkurrenter for din plan.</span>
          <Button variant="outline" size="sm" className="bg-background text-foreground border-amber-500/20">Oppgrader plan</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : competitors.length === 0 ? (
        <div className="text-center p-16 border border-dashed rounded-3xl bg-muted/20 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ingen konkurrenter ennå</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Legg til bedrifter du ønsker å overvåke, så sier vi ifra når de oppdaterer nettsidene sine eller får nye anmeldelser.
          </p>
          <Button onClick={() => setIsAddOpen(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Legg til din første
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((comp, i) => (
            <Card key={comp.id} className="shadow-sm group animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg line-clamp-1" title={comp.name}>{comp.name}</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2"
                    onClick={() => setDeleteId(comp.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {comp.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{comp.location}</span>
                    </div>
                  )}
                  {comp.website && (
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="w-4 h-4 shrink-0" />
                      <a href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`} target="_blank" rel="noreferrer" className="truncate">
                        {comp.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {comp.notes && (
                    <div className="text-sm bg-muted/50 p-3 rounded-lg mt-2 text-muted-foreground line-clamp-3">
                      {comp.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground pt-4 border-t">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Lagt til {formatDate(comp.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Ny konkurrent</DialogTitle>
              <DialogDescription>
                Skriv inn detaljer om bedriften du vil overvåke.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Navn *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="F.eks. Salong Sentrum" 
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Nettside</Label>
                <Input 
                  id="website" 
                  value={formData.website} 
                  onChange={e => setFormData({...formData, website: e.target.value})} 
                  placeholder="https://..." 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Sted</Label>
                <Input 
                  id="location" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  placeholder="F.eks. Storgata 12" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Egne notater (valgfritt)</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Hva er de spesielt gode på? Noe vi bør se etter?" 
                  className="resize-none h-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Avbryt</Button>
              <Button type="submit" disabled={createCompetitor.isPending || !formData.name.trim()}>
                {createCompetitor.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Legg til
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette fjerner konkurrenten fra overvåkingen din. Du vil ikke lenger motta varsler om deres aktivitet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCompetitor.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Fjern konkurrent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
