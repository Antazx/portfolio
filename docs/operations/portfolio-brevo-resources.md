# Recursos Brevo del portfolio

Estado: **PB-01 preparado; validación externa pendiente**.

Este inventario pertenece únicamente al portfolio. Newsletter y contacto usan
flujos, credenciales, audiencias y gates separados. No contiene claves, IDs de
proveedor ni direcciones de prueba. Los valores reales se configuran en el
entorno de Functions de Netlify, nunca en Git.

## Contrato seguro local

Los nombres de configuración y el estado inicial seguro quedan definidos en
este documento. No se añaden todavía al ejemplo de entorno:

| Flujo | Modo | Captación | Efecto permitido |
| --- | --- | --- | --- |
| Newsletter | `off` | `false` | Ninguna llamada de campaña o alta pública |
| Contacto | `off` | n/a | Ninguna llamada transaccional |

Los modos válidos previstos son `off`, `test` y `production`. Un entorno sin
credenciales o recursos completos debe permanecer desactivado. Las claves no
llevan prefijo `PUBLIC_` y no se exponen al navegador.

## Newsletter

| Recurso | Contrato del portfolio | Estado PB-01 | Evidencia necesaria |
| --- | --- | --- | --- |
| Cuenta | Cuenta Brevo personal del portfolio, independiente de Ecooperación | Pendiente de acceso | Cuenta y contexto confirmados en Brevo |
| API key | `PORTFOLIO_BREVO_NEWSLETTER_API_KEY`, exclusiva de campañas | No verificada | Clave creada y guardada solo en Netlify |
| Lista de producción | `portfolio-newsletter-production` | ID pendiente | Lista propia e ID registrado sin clave |
| Lista de pruebas | `portfolio-newsletter-test` | ID pendiente | Lista distinta de producción |
| Segmento de producción | Confirmados, idioma `es`/`en`, sin baja/bloqueo y fuera de test | ID pendiente | Criterios y pertenencia comprobados |
| Segmento de pruebas | Misma regla, limitado a contactos autorizados | ID pendiente | Criterios y pertenencia comprobados |
| Atributo | `PORTFOLIO_LANGUAGE`, únicamente `es` o `en` | Pendiente de crear/verificar | Tipo, valores y cambio comprobados |
| Remitente/dominio | Identidad del portfolio verificada | Pendiente | Dominio y sender verificados |
| Formulario ES/EN | URLs `PORTFOLIO_NEWSLETTER_FORM_URL_ES/EN` | Pendiente | Formulario, DOI y páginas de resultado revisados |
| Privacidad ES/EN | URLs `PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES/EN` | Pendiente | Páginas aprobadas y accesibles |
| Webhook | `PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET` | Pendiente | Firma comprobada sobre el cuerpo original |
| Cuota/acceso | Permiso de campañas y cuota suficiente para test | Pendiente | Captura o registro operativo sin secretos |

La validación real debe cubrir double opt-in, baja, cambio de idioma,
repetición de alta, idioma inválido y exclusión de la lista de pruebas. No se
activa captación ni envío productivo desde este ticket.

## Contacto

| Recurso | Contrato del portfolio | Estado PB-01 | Evidencia necesaria |
| --- | --- | --- | --- |
| API key | `PORTFOLIO_BREVO_CONTACT_API_KEY`, exclusiva de Transactional Email API | No verificada | Clave separada y guardada solo en Netlify |
| Remitente | `PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL/NAME` | Pendiente | Sender verificado en la cuenta del portfolio |
| Destino de producción | `guillermoantataz@gmail.com` | Confirmado por el propietario; falta configurar | Variable fija del servidor, no aceptada desde el navegador |
| Destino de pruebas | `PORTFOLIO_CONTACT_TEST_TO` | Pendiente de autorización | Buzón autorizado y registrado sin contenido privado |
| `replyTo` | Email validado del visitante | Contrato definido | Prueba de respuesta al visitante |
| Marketing | Ninguna lista, alta o actualización de contacto | Pendiente de prueba | Comparativa de estado antes/después con email nuevo y suscrito |

El contacto no crea ni modifica contactos de marketing y permanece apagado hasta
que el sender, destino de prueba y privacidad estén aprobados.

## Bloqueos humanos concretos

PB-01 no puede cerrarse como validación de recursos con evidencia únicamente
local. Falta que el responsable:

1. confirme acceso a la cuenta Brevo personal del portfolio y su plan/cuota;
2. verifique dominio y senders propios;
3. cree o confirme claves separadas, listas, segmentos, atributo y formularios;
4. autorice el buzón de pruebas del contacto y los contactos ES/EN de prueba;
5. apruebe privacidad ES/EN y responsable operativo.

No copiar datos, IDs, contactos, claves, dominios ni destinatarios de
Ecooperación. Hasta completar estos puntos, `off` es el único estado seguro para
los dos flujos.

## PB-02: estado de la suscripción newsletter

La rama de implementación prepara el formulario bilingüe, la preferencia
explícita `PORTFOLIO_LANGUAGE`, el consentimiento `OPT_IN`, el aviso de
double opt-in, los estados localizados de pendiente y confirmación y el enlace
desde el blog y el footer. La interfaz solo se activa en `test` cuando la
captación está habilitada, existe la lista de pruebas y las dos URLs de
formulario HTTPS pertenecen a Brevo; `production` permanece desactivado.

La validación externa sigue bloqueada hasta disponer de
`PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID` y de
`PORTFOLIO_NEWSLETTER_FORM_URL_ES`/`PORTFOLIO_NEWSLETTER_FORM_URL_EN`, revisar
que ambos formularios aplican double opt-in y redirigen a los estados propios,
y probar baja, cambio de idioma y exclusión de contactos no confirmados. No se
han inventado URLs, IDs ni valores de proveedor.

## PB-03: estado de automatización por publicación

La automatización permanece apagada con `PORTFOLIO_NEWSLETTER_MODE=off`. El
campo editorial `sendNewsletter` tiene `false` como valor inicial y la consulta
server-side usa perspectiva publicada, fecha válida y ambas traducciones. El
webhook de Sanity verifica HMAC antes de leer el payload; después recupera el
documento actual y comprueba las dos páginas públicas antes de crear una campaña.

El estado de cada publicación y entorno vive en un store fuerte de Netlify Blobs
con identidad determinista, reclamación mediante ETag, lease, campaña guardada
antes de `sendNow`, reconciliación ante reintentos y scheduler cada cinco
minutos. Los errores ambiguos quedan en `needs_review`; no se reenvía a ciegas.
La campaña usa solo el segmento configurado del entorno y HTML localizado por
`PORTFOLIO_LANGUAGE`, con enlaces de privacidad y gestión de preferencias
configurados explícitamente. Sin Blobs, recursos Brevo, origen público o URLs
de privacidad completos no se realiza ninguna llamada de campaña.

## PB-05: estado del gate newsletter

La implementación local del gate y la comprobación de rutas públicas están en
[`portfolio-newsletter-gate.md`](./portfolio-newsletter-gate.md). El estado es
**bloqueado por validación humana externa**: no hay cuenta Brevo, campaña de
prueba, recepción, baja ni aprobación productiva verificadas en este checkout.

`PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED` y
`PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED` son barreras adicionales de runtime;
sus valores seguros son `false`. La ausencia de recursos o aprobación mantiene
el webhook y el scheduler desactivados. No se crean campañas ni se envían
correos como parte de las comprobaciones locales.

## Registro de evidencia

Cuando el acceso humano esté disponible, completar el registro en la issue PB-01
con fecha, entorno, nombres/IDs propios sin secretos, resultado de cada prueba,
cuota observada y bloqueo restante. No adjuntar listas de emails, mensajes ni
claves a GitHub.
