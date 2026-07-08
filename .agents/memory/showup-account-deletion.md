---
name: ShowUp account deletion cascade
description: Order/scope rules for deleting a user and all tenant data (self-service + admin)
---

# Account deletion cascade

Both self-service account deletion and the admin "delete user" action share one
helper that removes a user and all tenant-owned rows in a single transaction.

**Rule:** delete in FK-safe order and cover every user-owned table:
- `Appointment` has **no `userId` column** and references `Customer.id` via a FK
  **without cascade**. Delete a user's appointments FIRST — scoped through a
  subquery of their customers (`customerId IN (SELECT id FROM Customer WHERE userId=...)`)
  — then delete the customers. Deleting customers first throws an FK violation
  and aborts the whole transaction, so deletion silently fails for any user who
  has appointments.
- Include ALL plain-`userId` tables (notification settings, password-reset
  tokens, message templates, synced appointments, integrations, push tokens,
  user profile). These are NOT FK-cascaded from the user row.
- `session` / `account` DO cascade via FK when the `user` row is removed.

**Why:** a code review caught that the first version deleted customers before
appointments and omitted push tokens — real users (who all have appointments)
could not be deleted, and orphaned device tokens lingered.

**How to apply:** whenever a new user-owned table is added to the schema, add it
to the deletion helper. Any table referencing `Customer`/`Appointment` without
`onDelete: cascade` must be deleted before its parent.
