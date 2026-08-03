# Creative Brand Redesign — MVP 0.4

MVP 0.4 changes the Teacher Studio from a conventional card dashboard into an illustration-led creative workspace while preserving the existing question editor and Mission Control behaviour.

## Design system

- **Illustration-led:** original SVG turkey, goalkeeper, football, and email artwork lives in `assets/`.
- **Asymmetrical:** the desktop workspace uses offset panels, rotated notes, uneven card sizes, and a poster-style lower section.
- **Expressive typography:** Bangers is used for display headlines, with Manrope for readable controls and body text. System fallbacks remain available.
- **Layered graphics:** tape, torn-paper edges, paperclips, paint strokes, doodles, and floating decorative marks are implemented in CSS.
- **Motion:** mascot floating, brush drift, rotating marks, and ball motion are lightweight CSS animations.
- **Accessibility:** animations are disabled when `prefers-reduced-motion` is enabled; the forms retain labels, focus indicators, and keyboard operation.
- **Responsive:** the side rail becomes a compact top rail on smaller screens, and the asymmetrical grid becomes a single-column workflow.

## Files changed

- `index.html` — redesigned Teacher Studio markup, without changing existing form IDs or backend hooks.
- `styles.css` — teacher-route visual system and responsive rules.
- `app.js` — route styling, studio section navigation, and setup-checklist status updates.
- `assets/*.svg` — original decorative illustrations.

## Editing the brand

The main colours and fonts are defined near the start of the Teacher Studio section in `styles.css`:

```css
--studio-navy
--studio-purple
--studio-blue
--studio-mint
--studio-yellow
--display-font
--studio-font
```

The existing home page, classroom demo, game engines, question storage, and Netlify Functions remain unchanged.
