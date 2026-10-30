# Tanx tank sprites

These two compact RGBA sprites were baked from Sinan's uploaded Meshy models:

- `tank-a.png`: Meshy_AI_Tank_1029141134_texture.glb
- `tank-b.png`: Meshy_AI_Tank_1029141210_texture.glb

The original GLBs total about 154 MB and are not required at runtime. The model's
fixed barrel is removed during baking; the renderer draws an independently
pivoting barrel on the tank body. Players 3 and 4 reuse these hulls with different
colour markers. The offline HTML embeds both PNGs as data URLs.

To rebake: `python3 scripts/tanx/render-models.py INPUT.glb OUTPUT.png`
(Python, NumPy and Pillow). No Blender is needed. Then `node scripts/build-tanx.mjs`.

The battlefield edition uses brighter 160×96 maximum sprite bakes for crisp
2× rendering and vehicle portraits. `battlefield-preview.webp` is a static
export of the same Canvas renderer for the game hub card.
