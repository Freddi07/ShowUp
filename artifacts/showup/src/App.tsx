import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AppProviders } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav, SiteFooter } from '@/components/custom/site-nav';
import { GlobalMounts } from '@/components/custom/global-mounts';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { DashboardShell } from '@/components/custom/dashboard/dashboard-shell';
import NotFound from '@/app/not-found';

// @ts-ignore
import SetupPage from '@/app/(setup)/page';
// @ts-ignore
import LoginPage from '@/app/(auth)/login/page';
// @ts-ignore
import SignupPage from '@/app/(auth)/signup/page';
// @ts-ignore
import SignupPaymentPage from '@/app/(auth)/signup/payment/page';
// @ts-ignore
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';
// @ts-ignore
import ResetPasswordPage from '@/app/(auth)/reset-password/page';
// @ts-ignore
import ProfilePage from '@/app/(auth)/profile/page';
// @ts-ignore
import DashboardPage from '@/app/(dashboard)/dashboard/page';
// @ts-ignore
import StatistikkPage from '@/app/(dashboard)/dashboard/statistikk/page';
// @ts-ignore
import SvarPage from '@/app/(dashboard)/dashboard/svar/page';
// @ts-ignore
import MalerPage from '@/app/(dashboard)/dashboard/maler/page';
// @ts-ignore
import IntegrationsPage from '@/app/(dashboard)/dashboard/integrations/page';
// @ts-ignore
import KunderPage from '@/app/(dashboard)/dashboard/kunder/page';
// @ts-ignore
import KunderDetailPage from '@/app/(dashboard)/dashboard/kunder/[id]/page';
// @ts-ignore
import KontoPage from '@/app/(dashboard)/dashboard/konto/page';
// @ts-ignore
import VarslerPage from '@/app/(dashboard)/dashboard/innstillinger/varsler/page';
// @ts-ignore
import AdminPage from '@/app/(dashboard)/admin/page';
// @ts-ignore
import UpgradePage from '@/app/(dashboard)/upgrade/page';
// @ts-ignore
import ExamplePage from '@/app/(custom)/example/page';

const queryClient = new QueryClient();

function DashboardRoute({ Component }: { Component: React.ComponentType<any> }) {
  return (
    <DashboardShell>
      <Component />
    </DashboardShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SetupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup/payment" component={SignupPaymentPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/example" component={ExamplePage} />

      {/* Dashboard routes — wrapped in DashboardShell which handles auth */}
      <Route path="/dashboard/statistikk">
        {() => <DashboardRoute Component={StatistikkPage} />}
      </Route>
      <Route path="/dashboard/svar">
        {() => <DashboardRoute Component={SvarPage} />}
      </Route>
      <Route path="/dashboard/maler">
        {() => <DashboardRoute Component={MalerPage} />}
      </Route>
      <Route path="/dashboard/integrations">
        {() => <DashboardRoute Component={IntegrationsPage} />}
      </Route>
      <Route path="/dashboard/kunder/:id">
        {(params: { id?: string }) => (
          <DashboardShell>
            {/* @ts-ignore */}
            <KunderDetailPage params={Promise.resolve({ id: params.id ?? '' })} />
          </DashboardShell>
        )}
      </Route>
      <Route path="/dashboard/kunder">
        {() => <DashboardRoute Component={KunderPage} />}
      </Route>
      <Route path="/dashboard/innstillinger/varsler">
        {() => <DashboardRoute Component={VarslerPage} />}
      </Route>
      <Route path="/dashboard/konto">
        {() => <DashboardRoute Component={KontoPage} />}
      </Route>
      <Route path="/dashboard">
        {() => <DashboardRoute Component={DashboardPage} />}
      </Route>
      <Route path="/admin">
        {() => <DashboardRoute Component={AdminPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppProviders>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <SiteNav />
            <Router />
            <SiteFooter />
            <Toaster />
            <GlobalMounts />
          </WouterRouter>
        </AppProviders>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
