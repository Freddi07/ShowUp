import { useState, useEffect } from "react";
import { useGetLokalBusiness, useUpdateLokalBusiness, getGetLokalBusinessQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, Bell, Check, MapPin, Building2 } from "lucide-react";

export default function InnstillingerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: business, isLoading } = useGetLokalBusiness({
    query: { queryKey: getGetLokalBusinessQueryKey() }
  });
  
  const updateBusiness = useUpdateLokalBusiness();

  const [formData, setFormData] = useState({
    name: "",
    orgNumber: "",
    industry: "",
    location: "",
    website: "",
    notifyEmail: true,
    notifyInApp: true,
    alertFrequency: "daily",
  });

  // Sync server data to local form state on load
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || "",
        orgNumber: business.orgNumber || "",
        industry: business.industry || "",
        location: business.location || "",
        website: business.website || "",
        notifyEmail: business.notifyEmail,
        notifyInApp: business.notifyInApp,
        alertFrequency: business.alertFrequency || "daily",
      });
    }
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBusiness.mutateAsync({
        data: {
          name: formData.name,
          orgNumber: formData.orgNumber || null,
          industry: formData.industry || null,
          location: formData.location || null,
          website: formData.website || null,
          notifyEmail: formData.notifyEmail,
          notifyInApp: formData.notifyInApp,
          alertFrequency: formData.alertFrequency,
        }
      });
      toast({
        title: "Innstillinger lagret",
        description: "Dine endringer er nå aktiv.",
      });
      queryClient.invalidateQueries({ queryKey: getGetLokalBusinessQueryKey() });
    } catch (err) {
      toast({
        title: "Kunne ikke lagre",
        description: "En feil oppstod. Prøv igjen.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Innstillinger</h1>
        <p className="text-muted-foreground">Administrer bedriftens profil og hvordan vi varsler deg.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        {/* Business Profile */}
        <section>
          <div className="flex items-center gap-3 mb-6 pb-2 border-b">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Bedriftsprofil</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Bedriftsnavn *</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
              <Input 
                id="orgNumber" 
                value={formData.orgNumber}
                onChange={e => setFormData({...formData, orgNumber: e.target.value})}
                placeholder="F.eks. 999 999 999"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Bransje</Label>
              <Input 
                id="industry" 
                value={formData.industry}
                onChange={e => setFormData({...formData, industry: e.target.value})}
                placeholder="F.eks. Tannlege"
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Sted</Label>
              <Input 
                id="location" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="bg-card"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Nettside</Label>
              <Input 
                id="website" 
                value={formData.website}
                onChange={e => setFormData({...formData, website: e.target.value})}
                placeholder="https://"
                className="bg-card"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <div className="flex items-center gap-3 mb-6 pb-2 border-b">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Varslingspreferanser</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-5 border rounded-2xl bg-card">
              <div className="space-y-1">
                <Label className="text-base">E-postvarsler</Label>
                <p className="text-sm text-muted-foreground">Motta oppsummeringer og viktige hendelser på e-post.</p>
              </div>
              <Switch 
                checked={formData.notifyEmail}
                onCheckedChange={c => setFormData({...formData, notifyEmail: c})}
              />
            </div>

            <div className="flex items-center justify-between p-5 border rounded-2xl bg-card">
              <div className="space-y-1">
                <Label className="text-base">Varsler i appen</Label>
                <p className="text-sm text-muted-foreground">Vis varsler i LokalRadar-panelet.</p>
              </div>
              <Switch 
                checked={formData.notifyInApp}
                onCheckedChange={c => setFormData({...formData, notifyInApp: c})}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-base">Varslingsfrekvens</Label>
              <div className="flex gap-4">
                {['instant', 'daily', 'weekly'].map(freq => (
                  <label key={freq} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="frequency" 
                      value={freq}
                      checked={formData.alertFrequency === freq}
                      onChange={e => setFormData({...formData, alertFrequency: e.target.value})}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-sm font-medium">
                      {freq === 'instant' ? 'Umiddelbart' : freq === 'daily' ? 'Daglig' : 'Ukentlig'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section>
          <div className="flex items-center gap-3 mb-6 pb-2 border-b">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Integrasjoner</h2>
          </div>
          
          <div className="p-6 border rounded-2xl bg-card space-y-4">
            <div>
              <Label htmlFor="googlePlaces" className="text-base font-semibold">Google Places API-nøkkel (Valgfritt)</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                LokalRadar bruker sin egen tilkobling, men hvis du har en egen Google Places nøkkel kan du oppgi den her for høyere grenser.
              </p>
            </div>
            <Input 
              id="googlePlaces" 
              value={business?.googlePlaceId || ""}
              disabled
              placeholder="Konfigurert av systemansvarlig"
              className="bg-muted font-mono text-sm max-w-md"
            />
          </div>
        </section>

        {/* Form Actions */}
        <div className="sticky bottom-6 flex justify-end gap-4 p-4 bg-background/80 backdrop-blur-sm border rounded-2xl shadow-lg">
          <Button type="button" variant="ghost" onClick={() => setFormData({
              name: business?.name || "",
              orgNumber: business?.orgNumber || "",
              industry: business?.industry || "",
              location: business?.location || "",
              website: business?.website || "",
              notifyEmail: business?.notifyEmail ?? true,
              notifyInApp: business?.notifyInApp ?? true,
              alertFrequency: business?.alertFrequency || "daily",
          })}>
            Angre endringer
          </Button>
          <Button type="submit" disabled={updateBusiness.isPending}>
            {updateBusiness.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Lagre innstillinger
          </Button>
        </div>
      </form>
    </div>
  );
}
