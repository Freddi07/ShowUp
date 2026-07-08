---
name: ShowUp push notifications
description: How instant push alerts to professionals work (Expo push, token registration, SMS-reply trigger) and the api-client codegen quirk
---

# ShowUp push notifications

Professionals get an instant push when a customer SMS reply flips an appointment
status (CONFIRMED / CANCELLED / RESCHEDULE_REQUESTED).

## Key decisions
- **Delivery = Expo Push API** (`https://exp.host/--/api/v2/push/send`), no
  credentials/integration needed. Server helper sends best-effort and prunes any
  token Expo reports as `DeviceNotRegistered`.
  **Why:** avoids managing FCM/APNs keys; matches the Expo mobile stack.
- **Ownership chain for "who to notify":** appointment → `Customer.customerId` →
  `Customer.userId`. Inbound SMS is public/unauthed, so the owner is resolved via
  the linked customer. Appointments with no `customerId` can't be attributed and
  are skipped.
- **Mobile token registration uses direct `fetch`** (like `lib/auth.ts`), NOT the
  generated api-client-react. **Why:** avoids touching openapi.yaml/codegen for a
  simple authed POST. Endpoints: `POST /api/push/{register,unregister}` (bearer).
- Remote push only works on a physical device + EAS projectId; helper returns
  null (no error) on web/simulator/denied/no-projectId. It won't fire in the
  Replit web preview — that's expected, not a bug.
- Deep-link on tap: notification `data.customerId` → `router.push(/customer/{id})`,
  handled in `app/_layout.tsx` (both warm listener + cold-start
  `getLastNotificationResponseAsync`).

## api-client-react codegen quirk (bit me here)
- `lib/api-client-react/src/generated/*` is produced by orval from
  `lib/api-spec/openapi.yaml`, NOT auto-regenerated reliably. A stale generated
  client makes mobile `typecheck` fail with "no exported member useGetCustomer"
  etc. — these are NOT your errors.
- Fix: `pnpm --filter @workspace/api-spec run codegen` (runs orval + typecheck:libs).
- Also: `@workspace/db` is a composite TS project; after adding a schema table,
  rebuild its declarations (`tsc -p lib/db/tsconfig.json`) or api-server typecheck
  won't see the new export even though runtime (src exports) is fine.
