import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  useUpdateLokalBusiness, 
  useCreateLokalCompetitor, 
  getGetLokalBusinessQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Store, Users, Bell, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: "business", title: "Din bedrift", icon: Store },
  { id: "competitor", title: "Første konkurrent", icon: Users },
  { id: "notifications", title: "Varsler", icon: Bell },
];

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateBusiness = useUpdateLokalBusiness();
  const createCompetitor = useCreateLokalCompetitor();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [businessData, setBusinessData] = useState({
    name: "",
    industry: "",
    location: "",
    website: "",
  });

  const [competitorData, setCompetitorData] = useState({
    name: "",
    website: "",
    location: "",
  });

  const [notifyData, setNotifyData] = useState({
    notifyEmail: true,
    notifyInApp: true,
    alertFrequency: "daily",
  });

  const handleNextStep = async () => {
    setIsSubmitting(true);
    
    try {
      if (currentStep === 0) {
        // Save business info
        await updateBusiness.mutateAsync({
          data: {
            name: businessData.name,
            industry: businessData.industry,
            location: businessData.location,
            website: businessData.website,
          }
        });
        setCurrentStep(1);
      } 
      else if (currentStep === 1) {
        // Save competitor (if provided)
        if (competitorData.name.trim() !== "") {
          try {
            await createCompetitor.mutateAsync({
              data: {
                name: competitorData.name,
                website: competitorData.website,
                location: competitorData.location,
              }
            });
          } catch (err: any) {
            toast({
              title: "Kunne ikke legge til konkurrent",
              description: err?.cause?.error || "Ukjent feil oppstod.",
              variant: "destructive"
            });
            // We still proceed even if this fails
          }
        }
        setCurrentStep(2);
      }
      else if (currentStep === 2) {
        // Save notify prefs and mark complete
        await updateBusiness.mutateAsync({
          data: {
            ...notifyData,
            onboardingCompleted: true
          }
        });
        queryClient.invalidateQueries({ queryKey: getGetLokalBusinessQueryKey() });
        setLocation("/dashboard");
      }
    } catch (err) {
      toast({
        title: "Noe gikk galt",
        description: "Vennligst prøv igjen.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipCompetitor = () => {
    setCurrentStep(2);
  };

  const isStepValid = () => {
    if (currentStep === 0) return businessData.name.trim().length > 0;
    return true; // Other steps are optional or have defaults
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
            L
          </div>
          <span className="font-bold tracking-tight">LokalRadar</span>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          Steg {currentStep + 1} av {STEPS.length}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 py-12">
        <div className="w-full max-w-xl">
          
          {/* Progress Indicators */}
          <div className="flex justify-between items-center mb-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10 -translate-y-1/2 rounded-full"></div>
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -z-10 -translate-y-1/2 transition-all duration-500 ease-in-out rounded-full"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            ></div>
            
            {STEPS.map((step, index) => {
              const isPast = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-background">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                    isPast ? "bg-primary border-primary text-primary-foreground" : 
                    isCurrent ? "bg-card border-primary text-primary" : 
                    "bg-card border-muted text-muted-foreground"
                  )}>
                    {isPast ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium absolute -bottom-6 whitespace-nowrap",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-card border shadow-sm rounded-3xl p-8 md:p-12 min-h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Step 1: Business */}
            {currentStep === 0 && (
              <div className="flex-1 flex flex-col">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Fortell oss om din bedrift</h2>
                  <p className="text-muted-foreground">Vi trenger litt informasjon for å gi deg relevante anbefalinger.</p>
                </div>
                
                <div className="space-y-5 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="b-name">Bedriftsnavn <span className="text-destructive">*</span></Label>
                    <Input 
                      id="b-name" 
                      placeholder="F.eks. Løkka Frisør" 
                      value={businessData.name}
                      onChange={e => setBusinessData(s => ({...s, name: e.target.value}))}
                      className="bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="b-industry">Bransje</Label>
                      <Input 
                        id="b-industry" 
                        placeholder="F.eks. Frisør" 
                        value={businessData.industry}
                        onChange={e => setBusinessData(s => ({...s, industry: e.target.value}))}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="b-location">Sted</Label>
                      <Input 
                        id="b-location" 
                        placeholder="F.eks. Grünerløkka" 
                        value={businessData.location}
                        onChange={e => setBusinessData(s => ({...s, location: e.target.value}))}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-website">Nettside (valgfritt)</Label>
                    <Input 
                      id="b-website" 
                      placeholder="https://..." 
                      value={businessData.website}
                      onChange={e => setBusinessData(s => ({...s, website: e.target.value}))}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Competitor */}
            {currentStep === 1 && (
              <div className="flex-1 flex flex-col">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Hvem vil du holde et øye med?</h2>
                  <p className="text-muted-foreground">Legg til din første konkurrent. Du kan legge til flere senere.</p>
                </div>
                
                <div className="space-y-5 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="c-name">Konkurrentens navn</Label>
                    <Input 
                      id="c-name" 
                      placeholder="F.eks. Salong Sentrum" 
                      value={competitorData.name}
                      onChange={e => setCompetitorData(s => ({...s, name: e.target.value}))}
                      className="bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-website">Deres nettside</Label>
                    <Input 
                      id="c-website" 
                      placeholder="https://..." 
                      value={competitorData.website}
                      onChange={e => setCompetitorData(s => ({...s, website: e.target.value}))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-location">Deres beliggenhet</Label>
                    <Input 
                      id="c-location" 
                      placeholder="F.eks. Storgata" 
                      value={competitorData.location}
                      onChange={e => setCompetitorData(s => ({...s, location: e.target.value}))}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Notifications */}
            {currentStep === 2 && (
              <div className="flex-1 flex flex-col">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Hvordan vil du holdes oppdatert?</h2>
                  <p className="text-muted-foreground">Vi sier fra når noe viktig skjer. Du kan endre dette når som helst.</p>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div className="space-y-0.5">
                      <Label className="text-base">E-postvarsler</Label>
                      <p className="text-sm text-muted-foreground">Få oppsummeringer rett i innboksen.</p>
                    </div>
                    <Switch 
                      checked={notifyData.notifyEmail} 
                      onCheckedChange={c => setNotifyData(s => ({...s, notifyEmail: c}))} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                    <div className="space-y-0.5">
                      <Label className="text-base">Inne i appen</Label>
                      <p className="text-sm text-muted-foreground">Vis varsler i LokalRadar-panelet.</p>
                    </div>
                    <Switch 
                      checked={notifyData.notifyInApp} 
                      onCheckedChange={c => setNotifyData(s => ({...s, notifyInApp: c}))} 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base">Hvor ofte vil du høre fra oss?</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "instant", label: "Umiddelbart" },
                        { id: "daily", label: "Daglig" },
                        { id: "weekly", label: "Ukentlig" },
                      ].map(freq => (
                        <div 
                          key={freq.id}
                          className={cn(
                            "border rounded-xl p-3 text-center cursor-pointer transition-all",
                            notifyData.alertFrequency === freq.id 
                              ? "bg-primary/10 border-primary text-primary font-medium" 
                              : "bg-background hover:bg-muted"
                          )}
                          onClick={() => setNotifyData(s => ({...s, alertFrequency: freq.id}))}
                        >
                          {freq.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t flex items-center justify-between gap-4">
              {currentStep === 1 ? (
                <Button variant="ghost" onClick={handleSkipCompetitor} disabled={isSubmitting}>
                  Hopp over dette
                </Button>
              ) : (
                <div></div> // Placeholder to keep Next button on the right
              )}
              
              <Button 
                onClick={handleNextStep} 
                disabled={!isStepValid() || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {currentStep === STEPS.length - 1 ? "Fullfør" : "Neste steg"}
                {currentStep < STEPS.length - 1 && !isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
