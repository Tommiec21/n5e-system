# ICONS1: feature icons

King 2026-11-25: "creating simple, icons/art to represent each feature ... show me in batches"; then "Apply the icons we have so far to each of the given features for the class/clan associated."

Status: **batches 1–4 applied (0.110.0-alpha.1).** Style and process: context file 14-feature-icon-design.md.

## How it works

- Drafts are drawn by `tools/icons/make_*.py` (SVG, 512 tile) and shown to King per batch.
- Approved SVGs live in `assets/icons/clans/<clan>/` and `assets/icons/classes/<class>/<core|subclass>/`.
- `content/icons/icons.json`: pack → item identifier (or `_id` where classes share one: Extra Attack) → image.
- `tools/content/apply-icons.mjs` writes them onto the pack sources (run it before `apply-automation.mjs`: automation effects take their feature's image); `--check` (in `npm run check`) fails when a key matches no item, several items or a missing file, or an icon isn't applied (a rebuilt pack).

## Applied

- **Aburame (14):** the clan, its 5 features, the 8 Symbiotic Hive options.
- **Scout-Nin core (15):** the class and its 14 core features.
- **Arbiter Scout, Assault Scout (8 each):** the subclass and 7 features.
- **Barrier Scout (9), Cloning Scout (8):** the subclass and its features.

## Next

- Elemental, Pathfinder, Phantom, Tactical, Void Heart Scout; the Scout maneuvers; the other classes and clans. Each batch adds rows to the table once King approves it.

## Progress log
- 2026-11-25 King: "Apply the icons we have so far". Claude: icon table and apply tool; 62 icons applied, published 0.110.0-alpha.1.
