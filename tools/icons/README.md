# Feature icons (drafts)

Generators for the class and clan feature icons (King 2026-11-25). The style and process are in the context file `14-feature-icon-design.md`.

- `common.py`: the tile, palettes and reusable shapes.
- `make_<clan|class>.py`: one batch; writes `<batch>/*.svg` next to it.
- `sheet.py <batch> "<title>" key=Name ...`: a preview page (render it with Playwright).

Nothing here is used by the system until King approves a batch; approved SVGs go to `assets/icons/`.
