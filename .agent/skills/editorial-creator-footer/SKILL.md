---
name: editorial-creator-footer
description: Implements a clean, understated editorial creator footer ("<App Name> • Engineered by AMIT KUMAR DEY") across any web application UI, README, and transactional email without corporate boilerplate or mobile bottom-nav overlap.
---

# Editorial Creator Footer Standard

Use this skill whenever adding, reviewing, or refactoring the brand and creator attribution footer in any web application, PWA, or documentation.

---

## 1. Core Philosophy & Copy Rules

- **Keep the App UI Clean & Editorial:**
  - Use the concise format:
    > `<App Name> • Engineered by AMIT KUMAR DEY`
  - Link `AMIT KUMAR DEY` to `https://portfolio.akdey.vercel.app/` with `target="_blank" rel="noopener noreferrer"`.
- **No Corporate/Legal Clutter in UI:**
  - **NEVER** include `"All rights reserved."`, `"Copyright © YYYY"`, or multi-column legal disclaimers inside the application UI footer. It feels corporate and breaks the tactile craft of personal/editorial apps.
  - Keep formal copyright/license notices (`&copy; <Year> **[AMIT KUMAR DEY](https://portfolio.akdey.vercel.app/)**. All rights reserved.` or MIT License) strictly in `README.md` and `LICENSE`.

---

## 2. Web UI Implementation (React + Tailwind CSS)

### Layout & Mobile Safe-Area Rules
1. **Natural Bottom Push (`mt-auto`):** Place the `<footer>` as the final child of a `flex-1 flex flex-col` `<main>` container using `mt-auto`. Never use `position: fixed` for the attribution footer.
2. **Mobile Bottom Navigation Clearance:** If the app has a fixed mobile bottom nav (`h-16` / `64px`), add safe-area bottom padding on mobile so the footer is never covered by the nav bar or iOS home indicator:
   `pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-4`
3. **Subtle Visual Weight:** Keep text muted (`text-[11px]` or `text-xs`) with a delicate accent underline on the creator's name that transitions on hover.

### Drop-In React + Tailwind Snippet
```tsx
{/* Subtle Brand & Creator Footer */}
<footer className="mt-auto py-2.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-4 text-center">
  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
    {appName} &bull; Engineered by{' '}
    <a
      href="https://portfolio.akdey.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-neutral-900 dark:text-neutral-100 font-medium underline decoration-amber-600/60 underline-offset-2 hover:text-amber-600 transition-colors"
    >
      AMIT KUMAR DEY
    </a>
  </p>
</footer>
```
*(Adapt `text-ink`, `text-ink-muted`, `decoration-accent/60`, and `hover:text-accent` to match the host project's design tokens if present.)*

### Framework-Agnostic HTML/CSS Equivalent
```html
<footer style="margin-top:auto; padding:10px 16px calc(72px + env(safe-area-inset-bottom, 0px)); text-align:center; font-size:11px; opacity:0.75;">
  <span>App Name &bull; Engineered by </span>
  <a href="https://portfolio.akdey.vercel.app/" target="_blank" rel="noopener noreferrer" style="font-weight:600; text-decoration:underline; text-underline-offset:3px; color:inherit;">
    AMIT KUMAR DEY
  </a>
</footer>
```

---

## 3. Transactional Email Footer Variant

When sending HTML or plain-text emails from the application, use a matching understated sign-off:

- **HTML:**
  ```html
  <p style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280; text-align:center;">
    &lt;App Name&gt; &bull; Engineered by
    <a href="https://portfolio.akdey.vercel.app/" style="color:#111827; font-weight:600; text-decoration:underline;">AMIT KUMAR DEY</a>
  </p>
  ```
- **Plain Text:**
  ```text
  ---
  <App Name> • Engineered by AMIT KUMAR DEY (https://portfolio.akdey.vercel.app/)
  ```

---

## 4. `README.md` Attribution Block

Place the formal copyright and creator credit at the bottom of `README.md`:

```markdown
---

<p align="center">
  &copy; 2026 <strong><a href="https://portfolio.akdey.vercel.app/">AMIT KUMAR DEY</a></strong>. All rights reserved.
</p>
```

---

## 5. Checklist Before Finishing

- [ ] No `"All rights reserved"` text inside the live app UI footer.
- [ ] `<a>` tag includes `target="_blank" rel="noopener noreferrer"` and points to `https://portfolio.akdey.vercel.app/`.
- [ ] Footer uses `mt-auto` inside a flex column `<main>` so it sits cleanly at the bottom of short pages without floating over content.
- [ ] Mobile bottom navigation clearance (`env(safe-area-inset-bottom)`) is respected when a fixed bottom bar is present.
