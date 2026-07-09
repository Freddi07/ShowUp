---
name: LokalRadar marketing media (AI images + Google review import)
description: How runtime AI image generation and Google review import are wired in the LokalRadar marketing assistant
---

## Runtime AI image generation (marketing posts)
- Uses the **OpenAI AI integration** (`@workspace/integrations-openai-ai-server/image`
  `generateImageBuffer`, model `gpt-image-1`) — the Anthropic AI integration cannot
  generate images, so a separate provider is required for any runtime image feature.
- Only the **server** package was copied (`lib/integrations-openai-ai-server`), NOT the
  react voice package or the `conversations`/`messages` DB schema — images need neither.
  **Why:** copying the template's db schema barrel would add unused tables. When you only
  need one capability, copy just that package + add tsconfig refs + api-server dep.
- The generated image is returned to the client as a base64 `data:image/png;base64,...`
  URL and is **not persisted** (no object storage). The generation-cap row logs a short
  label, never the base64. **Why:** keeps the DB light and the history readable.
- Image generation **counts as one generation** against the monthly plan cap, enforced
  atomically through the same `logGenerationWithLimit` helper as text tools.

## Google review import (own reviews)
- Reuses `lib/lokalradar/google-places.ts` (Google Places API New). Resolves the
  business's Place ID from `LokalBusiness.googlePlaceId`, else `resolvePlaceId(name,
  location)` and persists the resolved id.
- **Limitation:** Places API returns only ~5 of the most relevant reviews per place and
  cannot page. Full review history would require the Google Business Profile API (OAuth).
- Requires `GOOGLE_PLACES_API_KEY`; endpoint returns 503 with a Norwegian message when
  the key is absent (`isPlacesConfigured()` gate). Dedup on re-import is heuristic
  (`author|text`), source is set to `"google"`.
