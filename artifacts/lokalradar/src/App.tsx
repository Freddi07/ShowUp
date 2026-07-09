import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import OnboardingWizard from '@/pages/onboarding';

import DashboardPage from '@/pages/dashboard';
import KonkurrenterPage from '@/pages/konkurrenter';
import MarkedsforingPage from '@/pages/markedsforing';
import AIChatPage from '@/pages/ai-chat';
import VarslerPage from '@/pages/varsler';
import InnstillingerPage from '@/pages/innstillinger';

import { Shell } from '@/components/shell';
import { AuthGuard } from '@/components/auth-guard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      
      {/* Protected Setup Route */}
      <Route path="/onboarding">
        <AuthGuard>
          <OnboardingWizard />
        </AuthGuard>
      </Route>

      {/* App Shell Routes */}
      <Route path="/dashboard">
        <AuthGuard>
          <Shell>
            <DashboardPage />
          </Shell>
        </AuthGuard>
      </Route>
      <Route path="/konkurrenter">
        <AuthGuard>
          <Shell>
            <KonkurrenterPage />
          </Shell>
        </AuthGuard>
      </Route>
      <Route path="/markedsforing">
        <AuthGuard>
          <Shell>
            <MarkedsforingPage />
          </Shell>
        </AuthGuard>
      </Route>
      <Route path="/ai-chat">
        <AuthGuard>
          <Shell>
            <AIChatPage />
          </Shell>
        </AuthGuard>
      </Route>
      <Route path="/varsler">
        <AuthGuard>
          <Shell>
            <VarslerPage />
          </Shell>
        </AuthGuard>
      </Route>
      <Route path="/innstillinger">
        <AuthGuard>
          <Shell>
            <InnstillingerPage />
          </Shell>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
