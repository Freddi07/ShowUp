import { useState } from "react";
import { Link, useLocation } from "wouter";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signUp.email({ email, password, name });
      if (res.error) {
        setError(res.error.message || "Kunne ikke opprette konto. Prøv igjen.");
      } else {
        setLocation("/onboarding");
      }
    } catch (err) {
      setError("Det oppstod en ukjent feil. Prøv igjen senere.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-2xl mx-auto mb-4">
            L
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kom i gang</h1>
          <p className="text-muted-foreground mt-2">Opprett din LokalRadar-konto på under ett minutt.</p>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Ditt navn</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kari Nordmann" 
                required 
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-postadresse</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="post@bedrift.no" 
                required 
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tegn"
                minLength={8}
                required 
                className="bg-background"
              />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Opprett konto
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Ved å opprette konto godtar du våre vilkår og personvernerklæring.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Har du allerede konto?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Logg inn her
          </Link>
        </p>
      </div>
    </div>
  );
}
