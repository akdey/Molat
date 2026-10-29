---
name: anti-vibe-ui
description: Mandatory design and frontend craft standards for every screen or component in the Personal Library. Prevents generic AI-generated aesthetics, repetitive cards, arbitrary decoration, shallow interactions, and unpolished responsive behavior.
---

# Anti-Vibe UI Craft

## Mission

Build an interface that feels intentionally art-directed, editorial, tactile, calm, and credible—not like a generic “AI-generated SaaS dashboard.” Visual polish must come from hierarchy, typography, spacing, content, interaction, and consistency, not a pile of gradients, glass panels, shadows, and animated cards.

Do not equate “modern” with neon gradients, excessive blur, glowing borders, giant rounded cards, floating blobs, or a sidebar-plus-card-dashboard template. Avoid these unless a concrete design rationale makes them appropriate.

## Required first steps

Before writing UI code:

1. Inspect existing routes, components, styles, dependencies, and assets.
2. Read `PROJECT_BRIEF.md`.
3. Identify the primary job of the screen and its main action.
4. Establish a small design system before styling individual pages.
5. Sketch the layout in terms of hierarchy and responsive behavior.
6. Check which information is real, missing, optional, or derived.
7. Build the actual interaction states—not just a static screenshot.

Do not replace the project's design system without first understanding what exists.

## Art direction

### Design concept: “A considered personal library”

The product should feel like a personal collection catalogued with care: warm, literary, quiet, contemporary, and useful. The UI can borrow from editorial book catalogues and museum collection systems without pretending to be a physical antique library.

Use a restrained visual vocabulary:
- warm paper / parchment-like neutral surfaces as an option, balanced by clean modern surfaces;
- ink-like primary text;
- one deliberate accent color drawn from bookbinding, library labels, or a subtle botanical/oxblood/forest palette;
- natural cover art supplies much of the color;
- fine separators, carefully chosen borders, and subtle elevation only where hierarchy requires it;
- deliberate typographic contrast between editorial headings and highly legible interface text.

Do not hard-code this exact palette if the repository already has a strong system. Define semantic tokens so light/dark themes remain coherent.

### Avoid visual clichés

Do not default to:
- purple/blue AI gradients;
- glassmorphism on every surface;
- glowing borders around cards;
- enormous hero sections that push the actual library below the fold;
- identical rounded cards for every piece of content;
- random decorative icons or emoji as navigation;
- fake charts, fake avatars, fake activity feeds, or invented collection statistics;
- excessive pill-shaped controls;
- over-rounded everything;
- shadows on every component;
- random animation added only to make a page feel “alive”;
- gradients behind every heading;
- generic landing-page copy inside an authenticated utility;
- placeholder book data that looks like real inventory.

A visual bookshelf is a feature, not permission to turn every screen into a skeuomorphic wooden shelf. Use realistic spine/shelf presentation only where it improves discovery. Ensure a practical grid/list view remains available.

## Design system requirements

Create or document semantic tokens for:
- page background;
- primary and secondary surfaces;
- primary/secondary text;
- muted text;
- borders/dividers;
- primary accent and hover/active variants;
- success, warning, error, and informational states;
- focus ring;
- radius scale;
- spacing scale;
- typography scale;
- shadow/elevation scale;
- motion durations/easing;
- content max widths and breakpoints.

Use CSS variables or the existing theme mechanism. Do not scatter raw hex values across components. Do not create many near-identical colors, radii, or spacing values.

### Typography

- Use a clear hierarchy: page title, section title, body, metadata, and microcopy.
- Consider one distinctive heading face paired with a highly legible UI/body face, but only if loading it is practical and licensing/availability is acceptable.
- Avoid using a novelty typeface for small UI text.
- Do not use all-caps labels everywhere.
- Keep line length comfortable for explanatory text.
- Numbers in metrics should be readable, not oversized merely for decoration.
- Book titles may wrap; do not truncate important titles without an accessible way to see the full value.

### Layout and spacing

- Use a consistent spacing scale, not arbitrary margin values on every component.
- Give the primary content a clear width and alignment.
- Do not waste the first viewport on a giant welcome banner.
- Prioritize the collection and its next action.
- Use whitespace to separate concepts, not to create empty luxury space that hides useful content.
- Align labels, controls, card edges, and headings consistently.
- Keep action placement predictable across screens.

### Shape and elevation

- Use a restrained radius system. Not every container needs a large radius.
- Use borders and surface contrast before shadows.
- Shadows should clarify layering, not decorate every item.
- Menus, dialogs, popovers, and drawers must have clear stacking and dismissal behavior.

## Book cover and image craft

Book covers are content, not decoration.

- Preserve the correct cover aspect ratio; do not stretch images.
- Reserve image dimensions/aspect ratio to prevent layout shift.
- Use `object-fit: cover` only when cropping is acceptable; otherwise use `contain` with an intentional background.
- Lazy-load below-the-fold covers.
- Give each image meaningful alt text where useful; decorative duplicates can use empty alt text.
- Build a designed fallback for missing, blocked, malformed, or failed cover URLs. It should look intentional and show a book glyph/title initial without pretending to be an actual cover.
- Do not display broken-image icons.
- Avoid forcing every cover into the same crop if this hides edition artwork.
- Avoid overlaid text that makes titles unreadable.
- Ensure text contrast on cover overlays.
- Never use generated fake covers as if they were the actual cover for a catalogued edition.
- For a bookshelf/spine view, use available title/author data and a restrained visual system; random spine colors should not imply real cover colors.

## Interaction quality

Every visible control must work or be clearly disabled with an explanation. No dead buttons, decorative search fields, fake filters, or non-functional menu items.

Implement:
- visible hover, focus, active, selected, disabled, loading, success, and error states as relevant;
- keyboard operation and focus management for menus, dialogs, dropdowns, and scanner flows;
- form validation near the relevant field;
- helpful error messages with a recovery action;
- confirmation for destructive actions and bulk changes;
- clear save state (saving / saved / failed);
- empty states that tell the user what to do next;
- success feedback that does not block the workflow;
- sensible undo where safe;
- search clear action and visible active filters;
- stable layout while loading;
- camera permission explanation and a manual-entry fallback.

Do not use alert boxes as the primary UX for ordinary validation or success. Use the project's established toast/inline-message patterns if they are accessible and appropriate.

### Motion

- Motion should communicate cause and effect: drawer opening, view transition, saved state, or subtle book-card feedback.
- Keep transitions short and purposeful.
- Respect `prefers-reduced-motion`.
- Do not animate every card on page load.
- Avoid parallax, springy bouncing, infinite floating, or dramatic transitions in a utility application.
- If using Framer Motion, justify it with actual interaction needs; do not add it solely as a trend.
- Motion must not delay scanning, searching, saving, or keyboard navigation.

## Screen-specific quality bars

### Home
- The collection and next action should be visible quickly.
- Use a small set of meaningful metrics, not a wall of cards.
- A “continue reading” module should appear only when such records exist.
- Avoid fake activity and decorative charts.

### Collection
- Book covers should be visually prominent but not so large that only a few books fit on screen.
- Search and filtering must be easy to find.
- Filters should be clear, combinable, removable, and keyboard accessible.
- Keep the grid aligned; varying title lengths must not cause chaotic card heights.
- Include a compact list view for data-heavy maintenance tasks.
- Preserve the user's current search/filter state when opening and returning from details when practical.

### Book details
- Present the book identity first; separate bibliographic, ownership, reading, physical condition, and loan data into clear groups.
- Do not render every field as an equally important card.
- Empty values should be described as not recorded, not replaced with fabricated examples.
- Edit mode should preserve unsaved input on validation failure.

### Add / scan
- Make Scan ISBN the primary action on mobile, but retain search and manual entry.
- Ask for camera permission only after the user chooses scanning.
- Show scanner guidance and a clear cancel/close control.
- Provide a robust manual path for devices without camera support.
- Show metadata candidates and let the user confirm the correct edition before saving.
- Do not create a long form with every optional field visible at once; group optional details progressively.

### Wishlist
- Distinguish expected budget from actual purchase price.
- Prioritize title, author, priority, and expected cost without turning every record into a marketing card.
- Make “Mark as purchased” a clear, safe workflow.

### Reading tracker
- Progress should be easy to update with keyboard and touch.
- Do not over-gamify reading.
- Use progress indicators only when total pages are known.
- Avoid streaks, badges, or social comparison by default.

### Maintenance / lending
- Condition and loan state must be scannable at a glance and not conveyed by color alone.
- Use clear return and edit actions.
- Do not expose unnecessary personal information about borrowers.
- Bulk changes must make their scope obvious.

### Insights
- Only visualize data that exists.
- Label missing-data limitations.
- Charts must answer a real question and work on small screens.
- Avoid 3D charts, decorative gradients, and chart junk.

### Settings
- Use straightforward sections and plain language.
- Never show secrets or tokens.
- Connection status should be understandable without revealing private configuration.

## Responsive behavior — mobile-first is mandatory

**Use a mobile-first implementation strategy, not a desktop layout that is patched for smaller screens.** Start every page and component at the narrowest supported viewport, then progressively enhance it for larger widths using the project's breakpoint system. Mobile and desktop are both first-class experiences; neither may feel like a reduced or secondary version.

Before implementing a screen, define its behavior at these viewport classes:
- **Small mobile:** 320–374 CSS px.
- **Typical mobile:** 375–430 CSS px.
- **Large mobile / small tablet:** 431–767 CSS px.
- **Tablet:** 768–1023 CSS px.
- **Laptop / desktop:** 1024–1439 CSS px.
- **Wide desktop:** 1440 CSS px and above.

These are review targets, not a mandate to add a breakpoint for every range. Prefer content-driven breakpoints and the existing project conventions.

### Mobile-first implementation rules

- Write base CSS for narrow screens first. Add `min-width` enhancements for wider layouts where appropriate; do not rely on desktop-first `max-width` patches as the primary strategy.
- Design the information hierarchy and task flow for one-handed use where practical. Prioritize search, scan, add, and the current task over secondary metadata.
- Never solve a narrow layout by merely shrinking desktop controls, fonts, spacing, or cards.
- Decide deliberately what moves, collapses, wraps, becomes a drawer, or is hidden at each width. Essential actions and information must not disappear without an accessible alternative.
- Prevent horizontal page overflow. Tables and dense data views must have a deliberate narrow-screen treatment (responsive rows/cards, selected columns, or a clearly labelled contained horizontal scroller).
- Use fluid grids and flexible sizing; avoid fixed widths that assume a particular device.
- Avoid layout shifts when covers load, filters open, validation errors appear, or navigation changes.
- Test long titles, long author names, missing cover art, large text settings, and translated/expanded labels where possible.
- Touch targets should be approximately 44 × 44 CSS px where feasible, with enough spacing to avoid accidental taps.
- Keep body text legible; do not shrink metadata to tiny text just to fit more content.
- Ensure sticky headers, bottom bars, and drawers do not obscure focused fields, validation messages, or content.
- Forms must remain usable when the on-screen keyboard is open. The active input, submit action, and error message should remain reachable.
- Use safe-area insets on devices with notches/home indicators when fixed bottom navigation or actions are present.
- Do not depend on hover for any action. Provide equivalent touch and keyboard interactions.
- Camera scanning must be designed mobile-first, but the app must provide search/manual entry when camera access is unavailable or denied.
- Prefer progressive disclosure for optional metadata on small screens without making important fields difficult to find.
- Do not force mobile users through desktop-style multi-column forms, tiny popovers, hover menus, or wide modal dialogs.

### Mobile navigation and actions

- Choose navigation based on actual task frequency. A compact bottom navigation may expose Home, Books, Scan, Wishlist, and More, but only if it improves reachability and does not crowd the viewport.
- Make the primary action reachable without covering content. Avoid floating action buttons that obscure book covers, save controls, or keyboard focus.
- Use full-screen or near-full-screen mobile flows for complex scanner/forms when that is clearer than a cramped dialog.
- Use bottom sheets only when their drag, dismissal, keyboard, focus, and screen-reader behavior are properly implemented.
- Preserve scroll position and active search/filter state when moving between collection and detail views where practical.
- Provide a visible route back from deep flows; do not make browser back the only recovery path.

### Tablet

- Treat tablet as its own layout class, not a stretched phone or squeezed desktop.
- Use adaptive grids, optional collapsible navigation, and side-by-side panels only when each panel retains useful reading width.
- Avoid awkward intermediate states such as a desktop sidebar consuming half the viewport or a two-column form with cramped fields.
- Verify portrait and landscape behavior where relevant.

### Desktop

- Use available width for richer collection browsing, a persistent filter rail, or a details pane only when it improves the task.
- Keep the content area at a comfortable maximum width; do not stretch long forms or paragraphs across an ultrawide monitor.
- Avoid a permanently wide sidebar that squeezes the book grid.
- Support keyboard shortcuts only when discoverable, documented, and non-conflicting.
- Do not add desktop-only hover affordances without an equivalent click/touch/keyboard path.

### Responsive acceptance checks

For every implemented screen, test at least:
- 320 × 720 (small mobile);
- 390 × 844 (typical mobile);
- 768 × 1024 (tablet portrait);
- 1024 × 768 (small laptop / tablet landscape);
- 1366 × 768 (laptop);
- 1600 × 900 (wide desktop).

At each size, verify:
1. No unintended horizontal page overflow.
2. Primary action is visible and reachable.
3. Navigation is understandable and does not consume disproportionate space.
4. Cover cards remain readable and correctly proportioned.
5. Forms, dialogs, filters, dropdowns, and scanner controls fit and remain operable.
6. Sticky elements do not cover content or keyboard focus.
7. No essential information/action exists only on hover.
8. Loading, empty, error, and success states also fit—not only the happy path.
9. Text wrapping and dynamic content do not break alignment.
10. Keyboard and touch interactions both work.

Do not declare a screen responsive based solely on one desktop and one mobile screenshot. Record any known viewport limitations explicitly.

## Accessibility baseline

- Semantic HTML; buttons for actions, links for navigation.
- Logical heading order and landmarks.
- All controls reachable and usable with keyboard.
- Clear visible focus styles.
- Labels associated with inputs.
- Accessible names for icon-only controls.
- Errors associated with fields and summarized where appropriate.
- Contrast target WCAG AA for normal text where feasible.
- Never rely on color alone to convey condition, reading state, or errors.
- Respect reduced-motion settings.
- Use appropriate dialog semantics, focus trapping, escape handling, and focus restoration.
- Scanner permission and status must be announced accessibly.
- Chart data should have an accessible textual equivalent.

## Frontend engineering quality

- Use reusable components when they represent a stable concept, not to abstract every div.
- Keep components focused; avoid one huge page component.
- Separate domain logic, API calls, formatting, and presentation.
- Avoid unnecessary dependencies and overlapping component libraries.
- Do not mix multiple icon libraries. Choose one consistent set already installed or add one with a clear reason.
- Avoid inline styles for repeated design rules.
- Avoid arbitrary one-off utility piles when a semantic component or token would be clearer.
- Do not use fake data in production paths.
- No console errors, broken links, missing keys, or unhandled promise rejections.
- No hidden network calls or excessive re-renders caused by duplicated state.
- Avoid premature memoization; optimize measured bottlenecks.
- Keep type and form validation consistent with backend contracts.

## Mandatory UI review before declaring done

Review each changed screen mobile-first and at both narrow and wide widths:
- small mobile (~320 px);
- typical mobile (~390 px);
- tablet portrait (~768 px);
- small laptop / tablet landscape (~1024 px);
- laptop (~1366 px);
- wide desktop (~1600 px).

Check:
1. Is the primary action obvious?
2. Is the screen visually distinctive but restrained?
3. Is there an actual hierarchy, or are all elements cards?
4. Are cover ratios preserved?
5. Are empty/loading/error states designed?
6. Does every control work?
7. Can the full workflow be completed with a keyboard?
8. Does reduced motion work?
9. Is any real data hidden behind decorative space?
10. Does the interface remain coherent with long titles, missing metadata, no covers, and many filters?
11. Are mobile forms and camera controls usable?
12. Is there any generic AI-dashboard cliché that can be removed?

Do not declare the UI complete based on a screenshot of the happy path alone.
