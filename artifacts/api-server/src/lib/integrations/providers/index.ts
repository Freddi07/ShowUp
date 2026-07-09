/**
 * Registers all implemented booking-source providers into the registry.
 * Call `registerBookingProviders()` once at startup. Providers not registered
 * here surface in the dashboard as "coming soon" (connect/sync report 501).
 */
import { registerProvider } from "../registry";
import { createGenericWebhookProvider } from "./generic-webhook";
import { createGoogleCalendarProvider } from "./google-calendar";

let registered = false;

export function registerBookingProviders(): void {
  if (registered) return;
  registered = true;
  registerProvider("generic_webhook", createGenericWebhookProvider);
  registerProvider("google_calendar", createGoogleCalendarProvider);
}
