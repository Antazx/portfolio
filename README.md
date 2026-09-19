# Portfolio

Monorepo con Sanity Studio standalone en `studio/` y web Astro en `web/`.

## Desarrollo

```sh
pnpm install
pnpm dev
pnpm dev:studio
pnpm build
pnpm build:studio
pnpm preview
```

La web usa `http://localhost:4321`. Configuración local Sanity: `web/.env.example`. Los secretos no se versionan.

Configura `PUBLIC_SITE_URL` con el origen público real para generar canonical, `hreflang`, sitemap, robots, `llms.txt` y JSON-LD absolutos. No se incluye un dominio por defecto.

CI valida typegen y los builds de Astro y Studio. Netlify usa `pnpm build` y publica `web/dist`.

Consulta [AGENTS.md](./AGENTS.md) para la estructura, convenciones, integraciones y criterios de validación.
