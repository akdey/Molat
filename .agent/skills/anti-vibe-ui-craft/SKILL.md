---
name: anti-vibe-ui-craft
description: Visual craft and responsive design standards for Ondorpata / Molat Personal Book Library.
---

# Anti-Vibe UI Craft

## Visual Identity: Archival Literary Atmosphere
- **Canvas / Paper**: Warm archival paper (`#FBF9F5` light, `#121316` dark).
- **Ink & Typography**: High-contrast warm ink (`#1E293B` light, `#F1F5F9` dark), editorial serif headings (`Newsreader` / `Georgia`) paired with highly legible UI grotesque (`Inter` / system sans-serif).
- **Accent**: Terracotta / bookcloth oxblood (`#C2410C` / `#8B3A1F`).
- **No Vibe Clichés**: No purple/blue AI gradients, no floating glassmorphism blobs, no neon cards, no decorative charts without real data.

## Book Cover Craft
- **Aspect Ratio**: Strict `aspect-[2/3]` preserving dimensions to eliminate layout shifts.
- **Fallbacks**: Designed typographic bookcloth fallback with initial, title, and author when cover image is unavailable or failing.
- **1x1 Pixel Guard**: Detect empty/transparent placeholder pixels from metadata providers and render the designed fallback.

## 6 Viewport Targets (Mobile-First)
1. **Small Mobile**: 320 x 720
2. **Typical Mobile**: 390 x 844
3. **Tablet Portrait**: 768 x 1024
4. **Tablet Landscape**: 1024 x 768
5. **Laptop**: 1366 x 768
6. **Wide Desktop**: 1600 x 900

