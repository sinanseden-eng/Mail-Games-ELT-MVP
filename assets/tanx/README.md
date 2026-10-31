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


## Fracture Arenas art

- `industrial-city.webp`: clean background matte painting of a fictional dark
  industrial city, neon towers, storm clouds, haze and distant furnace glow.
- `desert-frontier.webp`: fictional desert urban fringe, traditional sandstone
  architecture, domes/minarets and refinery stacks under a dusty afternoon sky.
- `industrial-materials.webp`: three horizontal material bands: rubble/asphalt,
  worn concrete, and rusty steel. The desert renderer warms these materials;
  sandbags are drawn from their physical pixels with a fabric-like block pattern.

These assets were created with the built-in image-generation tool using the
user's reference images for mood/composition. The normalized production prompts
specified wide side-view game backdrops, readable sky for projectile arcs,
atmospheric depth, and no tanks, people, UI, labels, projectile arcs or foreground
platforms. The material prompt specified exactly three equal horizontal bands,
flat diffuse orthographic textures, and no labels, objects, frames or lighting
hotspots. Image-generation outputs were optimized into project WebP files.
They are embedded into the offline file, so no outside asset server is needed.
Gameplay terrain, structures, tanks, explosions and HUD are drawn separately;
the generated backgrounds do not represent collidable geometry.
