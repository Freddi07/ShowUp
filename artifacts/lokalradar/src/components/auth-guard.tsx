import { useSession } from "@/lib/auth-client";
import { useGetLokalBusiness, getGetLokalBusinessQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const isAuthReady = !sessionPending;
  const isAuthenticated = !!session?.user;

  // We only fetch the business if authenticated
  const { data: business, isLoading: businessLoading } = useGetLokalBusiness({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetLokalBusinessQueryKey()
    }
  });

  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    // Check onboarding status once business data is loaded
    if (business && !businessLoading) {
      if (!business.onboardingCompleted && location !== "/onboarding") {
        setLocation("/onboarding");
      } else if (business.onboardingCompleted && location === "/onboarding") {
        setLocation("/dashboard");
      }
    }
  }, [isAuthReady, isAuthenticated, business, businessLoading, location, setLocation]);

  if (!isAuthReady || (isAuthenticated && businessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Laster inn LokalRadar...</p>
        </div>
      </div>
    );
  }

  // Double check, rendering null if about to redirect
  if (!isAuthenticated || (business && !business.onboardingCompleted && location !== "/onboarding")) {
    return null; 
  }

  return <>{children}</>;
}
