# Gate operativo del contacto del portfolio

Estado: **bloqueado por validación humana externa**.

PB-06 deja preparado el control local del formulario y su activación separada
de newsletter. Las comprobaciones locales no consultan Brevo, no crean
contactos, no envían mensajes y no cambian el modo `off`.

## Comprobaciones locales

```sh
pnpm test:contact
pnpm test:contact-gate
pnpm check:contact-gate
```

`check:contact-gate` nunca imprime valores de variables. Con
`PORTFOLIO_CONTACT_MODE=off` confirma el estado seguro y termina correctamente.
Con `test` exige API key, sender, destino de pruebas, origen HTTPS y la
confirmación de evidencia humana. Con `production` exige además contexto
production, control de abuso real, privacidad aprobada y aprobación explícita.

Para revisar el HTML público ya desplegado, sin llamar a Brevo:

```sh
PUBLIC_SITE_URL=https://origen-real.example pnpm verify:contact:public
```

La comprobación exige HTTP 200 sin redirección en `/es/` y `/en/`, idioma
correcto y formulario nativo POST con nombre, email, mensaje, privacidad e
idioma. `pnpm audit:a11y` y la prueba Playwright de JavaScript desactivado
completan la revisión de teclado, móvil y accesibilidad; el proveedor externo
queda fuera de esas pruebas.

## Evidencia humana pendiente

No se puede cerrar el gate con evidencia local. Falta registrar, en la issue
PB-06 o en un runbook privado, sin claves, mensajes ni listas de direcciones:

- cuenta Brevo personal del portfolio, plan/cuota, dominio y sender verificados;
- API key transaccional propia guardada solo en Netlify Functions;
- destinatario de pruebas autorizado y destinatario fijo de producción;
- envío de prueba recibido, `replyTo` comprobado y respuesta dirigida al visitante;
- interfaz ES/EN revisada con teclado, móvil y JavaScript desactivado;
- privacidad aprobada para el contacto, sin consentimiento de marketing;
- control real de cinco solicitudes por diez minutos e IP verificado en la
  plataforma, sin usar el limiter en memoria como protección de producción;
- prueba con email ya suscrito y otro nuevo, confirmando que no hay altas,
  bajas, cambios de idioma, atributos ni listas de marketing;
- deploy, commit, variables revisadas sin valores secretos y resultado de cada
  prueba.

La recepción real y el `replyTo` son evidencias diferentes de que Brevo acepte
la petición. Un timeout conserva el resultado desconocido y no dispara un
reenvío automático.

## Activación controlada

1. Mantener `PORTFOLIO_CONTACT_MODE=off` y las tres aprobaciones en `false`.
2. Configurar solo `test`, con sender, destinatario y credencial propios; hacer
   la prueba autorizada fuera de este checkout y registrar la evidencia sin
   datos personales.
3. Marcar `PORTFOLIO_CONTACT_TEST_EVIDENCE_CONFIRMED=true` únicamente después
   de comprobar recepción, `replyTo`, privacidad y separación de marketing.
4. Tras aprobación explícita del gate, configurar producción con
   `PORTFOLIO_CONTACT_MODE=production`, `PORTFOLIO_CONTACT_RATE_LIMIT_CONFIGURED=true`,
   `PORTFOLIO_CONTACT_PRIVACY_APPROVED=true` y
   `PORTFOLIO_CONTACT_PRODUCTION_APPROVED=true` en el contexto production.
5. Separar activación de merge y deploy. Para desactivar, apagar el modo y
   redesplegar; no borrar evidencia ni inventar una recepción.

Newsletter puede permanecer apagada durante todo este proceso. No copiar
recursos, contactos, dominios, destinatarios ni secretos de Ecooperación.
