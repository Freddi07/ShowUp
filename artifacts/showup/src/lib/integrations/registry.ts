// @polsia:user-owned

import { AutomasterProvider } from './automaster/provider';
import type { IntegrationProvider } from './base';
import { BooksyProvider } from './booksy/provider';
import { ClinikoProvider } from './cliniko/provider';
import { EmekanikerProvider } from './emekaniker/provider';
import { FikenProvider } from './fiken/provider';
import { FreshaProvider } from './fresha/provider';
import { GoogleCalendarProvider } from './google-calendar/provider';
import { MicrosoftOutlookProvider } from './microsoft-outlook/provider';
import { OpusDentalProvider } from './opus-dental/provider';
import { TripletexProvider } from './tripletex/provider';
import { VismaProvider } from './visma/provider';

type Credentials = Record<string, unknown>;

export function createProvider(provider: string, credentials: Credentials): IntegrationProvider {
  switch (provider) {
    case 'tripletex':
      return new TripletexProvider(credentials as { token: string });
    case 'opus_dental':
      return new OpusDentalProvider();
    case 'google_calendar':
      return new GoogleCalendarProvider(
        credentials as {
          accessToken?: string;
          refreshToken?: string;
          expiresAt?: number;
          integrationId?: string;
          syncToken?: string;
          channelId?: string;
          resourceId?: string;
          watchExpiry?: number;
        },
      );
    case 'microsoft_outlook':
      return new MicrosoftOutlookProvider(
        credentials as {
          accessToken?: string;
          refreshToken?: string;
          expiresAt?: number;
          integrationId?: string;
          deltaLink?: string;
          subscriptionId?: string;
          subscriptionExpiry?: number;
          clientState?: string;
        },
      );
    case 'fresha':
      return new FreshaProvider(credentials as { apiKey: string });
    case 'booksy':
      return new BooksyProvider(credentials as { apiKey: string });
    case 'cliniko':
      return new ClinikoProvider(credentials as { apiKey: string });
    case 'automaster':
      return new AutomasterProvider();
    case 'emekaniker':
      return new EmekanikerProvider();
    case 'visma':
      return new VismaProvider(
        credentials as {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
          integrationId?: string;
        },
      );
    case 'fiken':
      return new FikenProvider(
        credentials as {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
          companySlug: string;
          integrationId?: string;
        },
      );
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function createWebhookHandler(provider: string): IntegrationProvider {
  return createProvider(provider, {});
}
