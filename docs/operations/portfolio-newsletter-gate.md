# Gate operativo de la newsletter del portfolio

Estado: **bloqueado por validación humana externa**.

PB-05 deja preparado el control local y la verificación de las rutas públicas.
No consulta Brevo, no crea campañas y no envía mensajes. La configuración
versionada mantiene `PORTFOLIO_NEWSLETTER_MODE=off`, la captación desactivada y
`PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED=false`.

## Comprobaciones locales

Las pruebas del flujo y las del gate están separadas:

```sh
pnpm test:newsletter
pnpm test:newsletter-gate
pnpm check:newsletter-gate
```

`check:newsletter-gate` no imprime valores de variables. Con `off` confirma el
estado seguro y termina correctamente. Con `test` o `production` exige la
configuración completa, la separación de listas y segmentos, y la confirmación
humana de la campaña de prueba. La aprobación de producción requiere además
`PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED=true` y
`PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED=true`.

Para comprobar las dos páginas de una publicación ya desplegada, usar una
variable temporal con el slug real, sin guardarla en Git:

```sh
PUBLIC_SITE_URL=https://origen-real.example \
PORTFOLIO_NEWSLETTER_VERIFY_SLUG=slug-real \
pnpm verify:newsletter:public
```

La comprobación exige HTTP 200, `lang` correcto y canonical exacto para las
rutas `/es/blog/{slug}/` y `/en/blog/{slug}/`. No sigue redirecciones.

## Acciones humanas pendientes

No se puede cerrar el gate con evidencia local. Falta registrar, en la issue
PB-05 o en el runbook operativo privado, sin claves ni listas de direcciones:

- cuenta Brevo personal del portfolio, plan/cuota, dominio y senders verificados;
- API key de newsletter y API key transaccional de alertas, guardadas solo en
  Netlify Functions;
- lista y segmento de producción, lista y segmento de pruebas, atributo
  `PORTFOLIO_LANGUAGE` y reglas de exclusión;
- double opt-in ES/EN, cambio de idioma, baja, preferencias y contactos de
  prueba autorizados;
- URLs de privacidad ES/EN, deploy y commit comprobados;
- campaña de prueba recibida por destinatarios ES y EN, contenido localizado,
  enlaces públicos, baja y preferencias verificadas;
- comprobaciones de webhook duplicado, concurrencia, timeout, reconciliación,
  reintentos, errores terminales y estado de Netlify Blobs.

`accepted` solo demuestra aceptación por Brevo. La recepción en el buzón y la
baja son evidencias separadas.

## Activación controlada

1. Mantener `off` y `false` mientras falte cualquier evidencia.
2. Configurar únicamente el entorno `test`, con su lista, segmento,
   formularios, destinatarios y credenciales propios; ejecutar las pruebas y
   registrar resultados sin datos personales.
3. Tras aprobar el gate newsletter, configurar producción con listas y
   segmentos distintos, marcar `PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED=true`
   y `PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED=true`, y habilitar la
   captación. El runtime rechaza producción si falta cualquiera de esas marcas.
4. Separar la activación de merge y deploy; para desactivar, apagar los flags y
   redesplegar sin borrar los registros de idempotencia.

No copiar recursos, contactos, dominios, destinatarios ni secretos de
Ecooperación.
