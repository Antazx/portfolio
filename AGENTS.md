# Repository Guidelines

## Git y ramas

Todo trabajo debe hacerse en una rama distinta de `main`, normalmente con prefijo `agent/`. Antes de editar, comprueba la rama actual y, si es `main`, crea una rama de trabajo desde ella. Haz commit y push únicamente en la rama de trabajo; `main` queda reservado para integrar cambios, porque cualquier push allí dispara el despliegue de Netlify y consume créditos.

## Stack and Structure

Use `pnpm` as the package manager and Node.js `>=22.12.0` (see `web/package.json`). This monorepo contains a standalone Sanity Studio in `studio/` and an Astro frontend in `web/`, styled with Tailwind CSS 4 through `@tailwindcss/vite` and deployed with `@astrojs/netlify`.

- `studio/`: standalone Sanity Studio, schema, CLI, and TypeGen configuration.
- `web/src/pages/`: Astro routes.
- `web/src/components/`, `web/src/layouts/`, `web/src/lib/`: create these only when the corresponding code appears.
- `web/src/styles/global.css`: global Tailwind entry point.
- `web/public/`: static files served unchanged.
- `web/astro.config.mjs`: Astro, Tailwind, Sanity, and Netlify configuration.
- `web/.env.example`: safe variable names and placeholders; real `.env*` files stay local.

Keep Sanity Studio separate unless embedding it is explicitly needed; embedding requires additional React and SSR decisions.

## Commands

Run from the repository root:

```sh
pnpm install       # install the locked dependency graph
pnpm dev           # local server at http://localhost:4321
pnpm dev:studio    # local Sanity Studio at http://localhost:3333
pnpm build         # production build; current validation gate
pnpm build:studio  # Studio production build
pnpm test:contact  # contact Function tests with a simulated Brevo provider
pnpm test:contact-gate # pruebas aisladas del gate y contrato público de contacto
pnpm check:contact-gate # validación local sin llamadas Brevo
pnpm verify:contact:public # comprueba el formulario en las rutas públicas desplegadas
pnpm typegen       # regenerate web/sanity.types.ts from Studio schema and queries
pnpm preview       # serve the production build locally
pnpm test:newsletter # pruebas node:test de la automatización newsletter
pnpm test:newsletter-gate # pruebas node:test del gate y rutas públicas
pnpm check:newsletter-gate # validación local sin llamadas Brevo
pnpm verify:newsletter:public # validación pública de ambas rutas de una publicación
git diff --check   # whitespace check before review
```

There is no linter or formatter. The accessibility audit uses Playwright and axe-core: run `pnpm audit:a11y` after a build. Add another runner only with its configuration and script; update this file and `README.md` at the same time.

## Integration Rules

- Tailwind: keep the v4 Vite plugin; do not add the deprecated `@astrojs/tailwind` integration.
- Sanity: keep Studio standalone. `web` uses `@sanity/astro` with real `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` values, a fixed API version, and `useCdn: false` for static builds. Tokens are server-only and never use the `PUBLIC_` prefix.
- Netlify: keep the adapter in `web/astro.config.mjs`; Netlify detects Astro and builds with root `pnpm build`. Set secrets in Netlify’s environment, never in Git.

## Style, Testing, and Review

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues; use `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

Use two spaces in JS/TS/Astro/CSS/JSON/YAML, semantic HTML, `PascalCase` components, `camelCase` functions/variables, and `kebab-case` route/assets names. Test observable behavior; until a runner exists, a successful `pnpm build` is the minimum gate. Commits use imperative subjects under 72 characters. Pull requests explain what/why, list checks and results, include screenshots for visual changes, and call out pending service configuration.
