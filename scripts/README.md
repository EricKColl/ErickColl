# Profile build system

The profile README is plain Markdown; everything visual is an SVG under `assets/`, generated from code so the
design stays consistent and editable.

| Path | Produced by | When |
|:--|:--|:--|
| `assets/hero/`, `assets/panels/`, `assets/modules/`, `assets/ui/` | `scripts/build-assets.mjs` | By hand, after editing content |
| `assets/telemetry/` | `scripts/generate-cards.mjs` | Daily by `.github/workflows/profile-cards.yml` |

- **Content** lives in `scripts/data/profile.mjs` (stack layers, project modules, terminal lines, trajectory).
- **Design tokens and primitives** (colours, fonts, panel frame, header bar) live in `scripts/lib/theme.mjs` and are
  shared by both generators.

## Update static assets

```bash
npm install            # Michroma (display type, SIL OFL 1.1), opentype.js, Simple Icons (CC0)
npm run build:assets   # rewrites every static SVG; pass a name to build one: node scripts/build-assets.mjs forja
```

Display type is converted to outlines at build time because SVGs loaded through `<img>` cannot fetch web fonts.

## Telemetry

`generate-cards.mjs` has no dependencies and only needs `GITHUB_TOKEN` (the workflow's own token, read-only use).
If any request fails, nothing is written, so the last good panels stay published. The workflow commits only when
the rendered SVGs changed.

```bash
npm run preview:cards  # renders both panels from synthetic data into .preview/ (no token, no network)
```

## Conventions

- Every animation is decorative and CSS-driven where possible; `prefers-reduced-motion` disables it and every
  element's resting state is its final state.
- Panels are self-contained dark "screens", so they read the same on GitHub's light and dark themes.
- Facts in the assets must come from this README, the linked repositories or the published portfolio.
