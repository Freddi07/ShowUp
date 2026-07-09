import { Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AIChatPage() {
  return (
    <div className="p-6 md:p-8 h-[calc(100vh-64px)] md:h-screen flex flex-col animate-in fade-in duration-500">
      <div className="flex-1 rounded-3xl border bg-card shadow-sm flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-background border shadow-md flex items-center justify-center mb-8 relative">
            <Sparkles className="w-10 h-10 text-primary" />
            <div className="absolute -bottom-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-border">
              Snart
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Din personlige rådgiver</h1>
          
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Vi bygger en AI-assistent som kjenner din bedrift, ditt nabolag og dine konkurrenter. Snart kan du chatte direkte med den for å få strategiske råd og skreddersydde tiltak.
          </p>
          
          <div className="bg-background border rounded-2xl p-6 w-full text-left space-y-4 shadow-sm mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Ting du kan spørre om senere:</p>
            <div className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              "Konkurrenten har satt ned prisene, hvordan bør vi svare?"
            </div>
            <div className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-xl">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              "Lag et tilbud for en rolig tirsdag formiddag."
            </div>
          </div>
          
          <Button variant="outline" className="rounded-full px-8">
            Få beskjed når lansert
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
