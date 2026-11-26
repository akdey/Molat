---
name: editorial-creator-footer
description: >
  Implements a clean, understated editorial creator footer
  ("‹App Name› • Engineered by AMIT KUMAR DEY") across any web application UI,
  README, and transactional email without corporate boilerplate or mobile
  bottom-nav overlap.
---

# Editorial Creator Footer Skill

## Purpose

Add a consistent, minimal creator attribution footer to any web app,
transactional email, or project README. The footer reads:

> **‹App Name› • Engineered by AMIT KUMAR DEY**

It must be:

- Understated — no corporate boilerplate, no copyright year maintenance
- Responsive — avoids overlap with mobile bottom navigation bars
- Consistent — identical wording in UI, emails, and documentation

---

## Rules

1. **Exact wording** — always `‹App Name› • Engineered by AMIT KUMAR DEY`.
   Never "Built by", "Made by", "Developed by", or "© 20xx".
2. **Link target** — `https://portfolio.akdey.vercel.app/`
3. **UI placement** — render at the very bottom of the page content area
   (`mt-auto`), above any fixed/sticky mobile bottom nav, with generous
   bottom padding (`pb-20` mobile, `pb-6` desktop) to avoid thumb-zone overlap.
4. **Email placement** — inside the final `<p>` within the email's inner
   container `<div>`, separated from body content with a `border-top`.
5. **README placement** — a single line at the bottom of the file, preceded
   by a horizontal rule.
6. **Typography** — smallest legible size (`text-3xs` / 10–11 px), muted ink
   colour, `tracking-wide`, `select-none` on the container so it doesn't
   distract from content when selecting text.
7. **Dark mode** — use `dark:` Tailwind variants for muted text and rule
   border colours.
8. **Never add** — version numbers, copyright symbols, "All rights reserved",
   social links, or analytics trackers to the footer.

---

## Implementation Patterns

### React / Tailwind CSS

```tsx
export const Footer: React.FC = () => (
  <footer className="w-full border-t border-rule/40 dark:border-rule-dark/40 mt-auto pt-4 pb-20 md:pb-6">
    <p className="text-center text-3xs text-ink-muted dark:text-ink-dark-muted tracking-wide select-none">
      ‹App Name› <span className="mx-1 opacity-50">&bull;</span> Engineered by{' '}
      <a
        href="https://portfolio.akdey.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-ink-secondary hover:text-accent underline underline-offset-2"
      >
        AMIT KUMAR DEY
      </a>
    </p>
  </footer>
);
```

### Transactional Email (inline styles)

```html
<p style="margin-top:24px; padding-top:16px; border-top:1px solid #E2D9C8;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          font-size:12px; color:#78716C; text-align:center;">
  ‹App Name› &bull; Engineered by
  <a href="https://portfolio.akdey.vercel.app/"
     style="color:#1C1917; font-weight:600; text-decoration:underline;">
    AMIT KUMAR DEY
  </a>
</p>
```

### README.md

```markdown
---

‹App Name› • Engineered by [AMIT KUMAR DEY](https://portfolio.akdey.vercel.app/)
```

---

## Checklist

- [ ] Footer component created and imported into main layout
- [ ] Footer renders below all content, above mobile bottom nav
- [ ] Dark mode variant tested
- [ ] Emails include footer inside the inner container
- [ ] README ends with the footer line
- [ ] No corporate boilerplate or copyright symbols present
