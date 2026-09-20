# Production verification

The deployment issue is complete only after the validated commit is on `main`, Netlify reports a successful build, and the real public origin is configured as `PUBLIC_SITE_URL`.

Run the runtime evidence check against that origin:

```sh
PUBLIC_SITE_URL=https://the-real-public-origin.example pnpm verify:production
```

Record the commit SHA, Netlify deploy URL, web and Studio build results, the command output, and the production accessibility check. The command intentionally fails when the origin is absent; it never substitutes a guessed domain.
