# Mail Games ELT 0.9F2 — Penalty unified visual hotfix

## What this fixes

0.9F1 still rendered the legacy cartoon scene underneath the photographic frames. When a photographic frame faded, the cartoon players became visible again.

0.9F2 gives the realistic replay exclusive ownership of the canvas for the complete resolved penalty:

- realistic establishing and run-up frames;
- full-screen boot-contact frame;
- programmed ball flight over the realistic scene;
- full-screen goal, save or miss camera;
- the final realistic result remains on screen after playback.

The original cartoon renderer remains available only as an image-loading fallback and for the interactive shot-selection screen.

## Deployment

1. Keep the current working deployment as a rollback copy.
2. Deploy the complete `mailgames-elt-mvp-0.9f2` folder.
3. Wait for Netlify to report **Published**.
4. Hard-refresh the site with `Ctrl + F5`.
5. Create a fresh penalty match and test goal, save and miss.

No Supabase migration or environment-variable change is required.
