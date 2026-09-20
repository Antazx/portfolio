# Portfolio

Portfolio profesional bilingüe de Guillermo Anta Alonso. Monorepo con:

- `web/`: frontend Astro + Tailwind CSS.
- `studio/`: Sanity Studio standalone para contenido editorial.
- `scripts/`: comprobaciones contra la web desplegada.
- `docs/`: decisiones y runbooks del proyecto.

## Requisitos

- Node.js `>=22.12.0`.
- pnpm `11.10.0`.

## Desarrollo local

```sh
pnpm install
```

Crea `web/.env` a partir de [`web/.env.example`](./web/.env.example) y completa el proyecto y dataset de Sanity. `PUBLIC_SITE_URL` puede quedar vacío en local; configúralo para generar URLs públicas absolutas.

```sh
pnpm dev          # web en http://localhost:4321
pnpm dev:studio   # Studio en http://localhost:3333
```

Variables disponibles:

- `PUBLIC_SANITY_PROJECT_ID`: identificador público del proyecto Sanity.
- `PUBLIC_SANITY_DATASET`: dataset Sanity, normalmente `production`.
- `PUBLIC_SITE_URL`: origen público, por ejemplo `https://portfolio.example.com`.

No guardes tokens ni secretos en Git.

## Comandos

```sh
pnpm typegen       # regenera web/sanity.types.ts desde el schema de Studio
pnpm build         # build de Astro; salida en web/dist
pnpm build:studio  # build de Sanity Studio
pnpm preview       # sirve el build de Astro
pnpm audit:a11y    # build + auditoría Playwright/axe-core
```

Tras desplegar, verifica el origen real:

```sh
PUBLIC_SITE_URL=https://portfolio.example.com pnpm verify:production
```

Comprueba redirección raíz, rutas `es`/`en`, blog, sitemap, robots, `llms.txt`, accesibilidad y responsive. Falla si no se proporciona `PUBLIC_SITE_URL`.

## CI y despliegue

CI ejecuta typegen, builds de web y Studio, instalación de Chromium y auditoría de accesibilidad. Netlify usa:

- Build command: `pnpm build`
- Publish directory: `web/dist`
- Node.js: `22.14.0`

Configura las variables de Sanity y `PUBLIC_SITE_URL` en el entorno de Netlify. No hay dominio público por defecto.

Documentación adicional: [criterios del repositorio](./AGENTS.md), [accesibilidad](./docs/accessibility.md), [verificación de producción](./docs/production-verification.md) y [contexto de dominio](./CONTEXT.md).
