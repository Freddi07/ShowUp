// @polsia:user-owned — theme color for the browser chrome.
// In Vite, the viewport meta tag is set in index.html; this file is kept as a reference.
import { brandVisual } from '@/lib/brand';

export const viewportConfig = {
  themeColor: brandVisual.themeColor,
} as const;
