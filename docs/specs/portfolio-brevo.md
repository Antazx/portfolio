# Brevo en el portfolio: newsletter y contacto

Estado: **borrador pendiente de aprobación de la spec y del desglose**.
Fecha: 2026-09-21.
Repositorio: `Antazx/portfolio`.
Base auditada: `7c0111743578395d3549a393124339451dbd9974`.
Rama documental: `agent/portfolio-brevo-spec`.

## 1. Objetivo y autorización

Validar Brevo con recursos propios del portfolio y diseñar dos flujos independientes:

1. Newsletter automática por publicación, recibida en el idioma elegido por cada suscriptor.
2. Formulario de contacto que envía consultas al correo personal de Guillermo.

Guillermo ha confirmado validar primero con una lista de pruebas y después automatizar por publicación, con preferencia individual ES/EN. El diseño técnico y el desglose siguientes siguen pendientes de aprobación.

Esta entrega contiene únicamente auditoría y propuesta documental. No autoriza implementar, crear issues, configurar proveedores, enviar pruebas, captar suscriptores ni activar producción. Tras aprobar spec y desglose se podrán crear las issues del portfolio; cada activación seguirá su propio gate.

Ecooperación queda fuera del trabajo. Se han leído exclusivamente como referencia su `spec.md` de newsletter y su ADR de Brevo. Sus decisiones, cuentas, datos, destinatarios, tickets y estado de aprobación no se heredan.

## 2. Auditoría del portfolio

| Área | Evidencia local | Consecuencia |
| --- | --- | --- |
| Sitio | `web/astro.config.mjs`, `netlify.toml`: Astro con adaptador Netlify; páginas generadas mediante `getStaticPaths()` | Publicar en Sanity no prueba que el artículo esté disponible en la web. |
| Contacto | `web/src/pages/[lang]/index.astro:116`: enlaces a email y LinkedIn; no hay formulario | El formulario y su endpoint serían nuevos. Se conserva el email como alternativa. |
| Correo público | `web/src/lib/portfolio.ts:192` y `:329`: `guillermoantataz@gmail.com` en ES/EN | Destinatario personal propuesto, pendiente de confirmación; no se ha enviado ningún correo. |
| Newsletter | Sin referencias de integración Brevo/newsletter ni formularios en el código auditado | No existe una integración propia que adaptar o dar por validada. |
| Contenido | `studio/schemaTypes/documents/post.ts`: documento `post`, slug común, `publishedAt`, `spanish` y `english` | Reutilizar el modelo bilingüe; no crear documentos duplicados por idioma. |
| Elegibilidad pública | `web/src/lib/sanity.ts`: excluye drafts y fechas futuras; exige título, entradilla y cuerpo por idioma | Estos filtros ya existen. La newsletter exigirá ambas traducciones completas. |
| Imágenes | Schema con `articleImage` dentro del cuerpo, sin portada de publicación | V1 enviará título, entradilla, fecha y enlace. No se inventa una imagen de portada. |
| Automatización | Sin Functions propias de correo, webhook de newsletter, estado de envíos ni scheduler versionados | Habría que incorporar estas piezas únicamente al portfolio. |
| Configuración | `web/.env.example` documenta Sanity y `PUBLIC_SITE_URL`; sin Brevo | Añadir después un contrato propio, con secretos de Functions y separación de entornos. |
| Privacidad | Sin páginas de privacidad en las rutas versionadas | Textos y páginas ES/EN serán requisito de activación, no se dan por aprobados. |
| Pruebas | Playwright/axe en `web/tests/a11y/public.spec.ts`; servidor de pruebas estático en `web/playwright.config.ts` | El audit actual no ejecuta Functions ni demuestra recepción de emails. |
| CI | `.github/workflows/ci.yml`: TypeGen, comprobación de tipos generados, builds y accesibilidad | Reutilizar estos controles y añadir pruebas de comportamiento del correo. |
| Issues | Consulta de solo lectura con `gh` a `Antazx/portfolio`: 13 issues, ninguna dedicada a Brevo o newsletter; la de contacto trata espaciado | El desglose tendrá issues propias, sin reutilizar tickets de Ecooperación. No se creó ni modificó ninguna. |

El checkout inicial estaba limpio en `agent/restrict-main-workflow`, un commit por delante de su upstream. Se creó la rama documental desde ese HEAD, conservando el trabajo existente.

No se han inspeccionado valores de secretos, paneles privados de Brevo/Netlify/Sanity, DNS ni buzones. Cuenta, dominio, cuotas, webhooks y entrega real quedan **sin verificar**. Tampoco se ha ejecutado un build: esta auditoría no certifica el estado desplegado.

## 3. Separación de recursos

| Recurso | Newsletter del portfolio | Contacto del portfolio |
| --- | --- | --- |
| Cuenta Brevo | Cuenta personal de Guillermo dedicada a los recursos del portfolio, independiente de Ecooperación | La misma cuenta del portfolio; flujo transaccional separado |
| API | Email Campaign API | Transactional Email API |
| Credencial | Key propia de newsletter | Key propia de contacto, con rotación independiente |
| Audiencia | Suscriptores confirmados, segmentados por criterios del portfolio | Un destinatario fijo configurado en servidor |
| Listas | Una de producción y otra de pruebas | Ninguna; no crea ni actualiza contactos de marketing |
| Remitente | Identidad del portfolio verificada en Brevo | Identidad del portfolio verificada en Brevo |
| Respuestas | Buzón personal confirmado | `replyTo` del visitante validado |
| Activación | Captación y envío controlados por separado | Activación independiente de newsletter |
| Estado | Campaña, reintentos y reconciliación | Resultado de la solicitud y referencia técnica |

Las dos keys facilitan separación y rotación; no se presupone que Brevo limite cada key a una lista o API. La cuenta comparte cuotas: validar que newsletter no impida el correo de contacto. No copiar IDs, claves, listas, contactos, dominios, destinatarios o secretos de Ecooperación, aunque los nombres parezcan equivalentes.

El correo Gmail del destinatario no se convierte automáticamente en remitente. El dominio y la identidad de envío del portfolio deben elegirse y verificarse por separado.

## 4. Newsletter

### 4.1. Suscripción e idioma

- Formulario nativo de Brevo, integrado en `/es/blog/` y `/en/blog/`; enlace desde el footer global. Se evita repetir un formulario completo en cada página.
- Campos: email, elección explícita de idioma `es`/`en` y aceptación específica de newsletter. No se pide nombre ni se infiere idioma por IP.
- Interfaz ES/EN. La ruta puede preseleccionar el idioma, pero el visitante puede cambiarlo.
- Un atributo de contacto exclusivo, `PORTFOLIO_LANGUAGE`, guarda una sola preferencia. No hay fallback de un idioma al otro.
- Double opt-in de Brevo. Una solicitud pendiente no pertenece a la audiencia enviable. La prueba debe incluir también un email que ya exista en la cuenta por otro motivo.
- Una lista `portfolio-newsletter-production` y otra `portfolio-newsletter-test`. Nombres propuestos; IDs reales pendientes.
- Un segmento enviable por entorno: pertenencia a su lista, consentimiento confirmado, idioma válido y ausencia de baja/bloqueo. Producción excluye además miembros de la lista de pruebas.
- La pertenencia al segmento debe revisarse explícitamente; no basta con que el contacto exista o tenga un consentimiento ajeno al portfolio.
- Confirmaciones y páginas de resultado propias, localizadas: `/{lang}/newsletter/pendiente/` y `/{lang}/newsletter/confirmacion/`. Mostrar la página no demuestra por sí solo una suscripción: la evidencia está en Brevo.
- Baja y cambio de idioma mediante enlaces de gestión personales de Brevo. Repetir un formulario público no debe permitir alterar una preferencia confirmada de otra persona ni reactivar una baja sin nueva confirmación.

Brevo documenta elección de idioma en formularios y double opt-in. Debe validarse la configuración concreta del cambio de preferencia y de las confirmaciones antes de integrar el formulario. [Formularios Brevo](https://help.brevo.com/hc/en-us/articles/208771869-Create-a-sign-up-form-in-Brevo).

### 4.2. Una campaña, un idioma por destinatario

Propuesta V1: **una campaña por publicación y entorno**, con HTML generado en el portfolio y bloques condicionales según `PORTFOLIO_LANGUAGE`. Cada destinatario recibe únicamente su versión: título, entradilla, fecha, enlace localizado, privacidad y baja. No recibe un correo bilingüe ni dos campañas por registrarse desde ambas rutas.

Brevo documenta condiciones por atributos dentro del contenido. Su aplicación a nuestro HTML por API es una hipótesis que se comprobará con destinatarios de prueba ES/EN antes de automatizar. [Contenido condicional](https://help.brevo.com/hc/en-us/articles/360001030599--Manual-Show-or-hide-content-using-if-statements).

El asunto inicial será neutro: `Guillermo Anta Alonso · {fecha ISO de publicación}`; no habrá preheader añadido sin localizar. El título traducido aparecerá dentro del mensaje. Esto evita depender de condiciones en el asunto no verificadas. Localizar también el asunto con el título se podrá aprobar tras validar soporte real, sin introducir otra campaña por idioma.

Solo los valores `es` y `en` son enviables. Un idioma vacío o inválido bloquea la inclusión en la audiencia; no genera un correo vacío ni usa castellano por defecto. El idioma vigente al procesar el envío en Brevo determina la versión; un cambio posterior afecta a publicaciones siguientes, sin reenvío.

Se usa una campaña real sobre el segmento de pruebas para comprobar personalización, exclusión, baja y recepción. Una previsualización o `sendTest` aislado no sustituye esta prueba. Si falla la personalización por API, se revisará esta decisión antes de continuar; no se activará un fallback bilingüe.

### 4.3. Publicación elegible y disponibilidad web

Añadir posteriormente `sendNewsletter` al documento `post`, con valor inicial `false`; su ausencia también significa `false`. No activar masivamente publicaciones existentes.

Un envío requiere:

1. Documento publicado actual, recuperado de Sanity con perspectiva publicada, sin drafts ni versiones pendientes.
2. `publishedAt <= ahora`, slug válido y ambas traducciones completas: título, entradilla y cuerpo.
3. `sendNewsletter=true` y modo de envío habilitado para ese entorno.
4. Ambas URLs canónicas ES/EN disponibles en el origen público configurado del portfolio.
5. Ningún envío anterior aceptado para la misma publicación y entorno.

Un webhook firmado de Sanity, limitado a create/update de `post`, inicia la evaluación. Se verifica la firma sobre el cuerpo original y después se recupera el documento actual; el payload no decide destinatarios ni URLs. Activar el checkbox antes o después de publicar debe funcionar. [Webhooks Sanity](https://www.sanity.io/docs/content-lake/webhook-best-practices).

**Publicación en Sanity y despliegue son estados distintos.** Antes de enviar, comprobar HTTP 200, canonical exacto, idioma y título/entradilla publicados en las dos páginas. No aceptar redirecciones a la portada, previews ni una respuesta 200 de una página de error. Las URLs se construyen con `PUBLIC_SITE_URL` y el slug validado; no se siguen destinos externos.

Si el artículo aún no está desplegado, queda `waiting_publication`. Revisar cada cinco minutos, durante un máximo de una hora; después detener y avisar para revisar el despliegue. Esta espera no consume los intentos de envío de Brevo. Reanudar requiere una acción operativa explícita o una nueva actualización editorial elegible.

El envío ocurre al verificar disponibilidad, no necesariamente en el instante de publicar en Sanity. El build no manda emails. La integración de publicación con el build de Netlify debe quedar comprobada en la validación; si el artículo no llega a producción, no hay envío.

Fechas futuras no programan newsletters en V1: una actualización editorial posterior, cuando la fecha ya sea válida y el artículo esté desplegado, vuelve a evaluar. Editar, republicar, cambiar slug o reconstruir después de un envío aceptado no reenvía. Retirar la publicación o desmarcar el checkbox cancela trabajo aún no aceptado por Brevo.

### 4.4. Envío, estado y fallos

Crear campaña con `htmlContent`, remitente verificado, `replyTo` del portfolio y únicamente el segmento del entorno; después solicitar `sendNow`. No combinar ese segmento con una lista sin filtros que amplíe la audiencia. Brevo devuelve un ID al crear la campaña; solicitar envío es una operación posterior. [Crear campaña](https://developers.brevo.com/reference/create-email-campaign), [enviar campaña](https://developers.brevo.com/reference/send-email-campaign-now).

Escapar texto y atributos dinámicos, validar URLs y neutralizar delimitadores de plantilla introducidos en el contenido editorial. Solo el renderer puede definir condiciones de Brevo. El mensaje debe entenderse sin imágenes y contener baja y gestión de preferencias funcionales; su HTML se versionará en el portfolio.

Identidad estable: `portfolio-newsletter:{environment}:{postId}`. No usar `_rev`, slug ni ID de lista como identidad lógica: una edición o cambio de lista no debe reabrir un envío realizado. Producción y test tienen registros diferentes.

Estado mínimo en Netlify Blobs: `postId`, entorno, `campaignId`, nombre/tag determinista, estado, intentos, siguiente intento, lease y error sanitizado. Estados: `waiting_publication`, `pending`, `processing`, `accepted`, `failed`, `needs_review`, `cancelled`.

- Reclamar el trabajo mediante escritura condicional atómica y leer con consistencia fuerte. Netlify documenta `onlyIfNew` y `onlyIfMatch`; un lock basado solo en leer y luego escribir no basta.
- Guardar `campaignId` antes de solicitar envío. Ante repetición, reconciliar campaña existente y su estado antes de otra operación.
- Un timeout al crear o enviar puede ocultar una operación completada. Nunca recrear o reenviar solo porque faltó respuesta; si Brevo no permite resolverlo con certeza, pasar a `needs_review`.
- Reintentar únicamente fallos transitorios de resultado conocido como no aceptado: máximo tres intentos, inicial, +5 y +15 minutos, respetando `Retry-After` si exige más espera. Configuración, autenticación o contenido inválidos son terminales.
- Una Scheduled Function revisa pendientes cada cinco minutos. Los webhooks duplicados y la función programada comparten la reclamación atómica.
- `accepted` significa que Brevo aceptó el envío; no prueba entrega al buzón. La validación guarda por separado recepción y resultado de baja.
- Sin Blobs disponible, no enviar sin registro. Si persiste una ambigüedad, detener antes que arriesgar duplicación.

El estado se conserva entre despliegues, con stores distintos para producción y pruebas. Los stores de sitio de Netlify son accesibles entre contextos: el nombre de la rama no los aísla. Las escrituras condicionales coordinan el estado local, pero no convierten la API de Brevo en una transacción distribuida. [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).

Alertas internas a un destinatario personal configurado, mediante la credencial transaccional del portfolio y con etiqueta propia. Se podrán emitir aunque el formulario esté desactivado. Si Brevo no funciona, la alerta también puede fallar: conservar estado y logs sanitizados, sin recursión ni reintentos ilimitados de alertas.

## 5. Formulario de contacto

### 5.1. Experiencia y contrato

Integrar en `#contacto` de `/es/` y `/en/`, manteniendo email y LinkedIn. Campos: nombre (1–100 caracteres), email (máximo 254), mensaje (10–5.000), aviso de privacidad y honeypot no interactivo. No incluir alta de newsletter, adjuntos, selección de destinatario ni acuse automático al visitante.

Formulario HTML funcional sin JavaScript. JavaScript solo mejora estados y evita dobles clics. Etiquetas, errores y confirmaciones ES/EN; foco visible, errores asociados a campos, estado anunciado y contenido conservado cuando falla. Sin guardar el mensaje en `localStorage` ni incluirlo en URLs.

Proponer `POST /.netlify/functions/contact`, atendido por una Function del portfolio. El cliente aporta únicamente nombre, email, mensaje, idioma y campos de validación. El servidor selecciona el destinatario fijo según entorno; nunca acepta `to`, `cc`, `bcc`, `sender`, lista ni remitente desde el navegador.

### 5.2. Validación y entrega

- Solo POST y el tipo de formulario admitido; límite de cuerpo de 16 KiB antes de procesarlo. Validación de tipos, email, longitudes e idioma en servidor.
- Rechazar CR/LF en campos de cabecera; cuerpo como texto plano o HTML escapado. No interpretar instrucciones, HTML ni plantillas aportadas por el visitante.
- Comprobar origen del propio sitio; rechazar orígenes ajenos y no habilitar CORS abierto. El origen y honeypot no sustituyen un límite de abuso.
- Límite inicial propuesto: cinco solicitudes por diez minutos e IP mediante control de plataforma; devolver 429. Verificar soporte en el plan antes de activación; no usar un contador en memoria de una sola instancia. [Functions de Netlify](https://docs.netlify.com/build/functions/api/).
- Enviar por `POST /v3/smtp/email`, con sender verificado del portfolio, `to` fijo y `replyTo` del visitante validado. Asunto fijo del portfolio; incluir nombre, email, idioma y mensaje en el cuerpo. [Email transaccional Brevo](https://developers.brevo.com/reference/send-transac-email).
- Mostrar éxito solo tras aceptación de Brevo; conservar `messageId` en evidencia técnica. No afirmar que Guillermo ya lo recibió o leyó.
- Ante error conocido, devolver error controlado y permitir reintento. Ante timeout ambiguo, indicar que no se pudo confirmar y ofrecer el enlace de email; no reenviar automáticamente.
- No crear contactos de marketing, añadir a listas ni modificar idioma o consentimiento newsletter. Comprobarlo también usando un email ya suscrito.

La Function no guarda mensajes en Sanity, Blobs ni una base de datos. Solo logs mínimos de fecha, resultado y referencia técnica; sin email, IP íntegra, cuerpo ni secretos. La conservación en el buzón y en Brevo se documentará en privacidad y se revisará antes de activación. Una baja de newsletter no deshabilita este formulario.

## 6. Variables y entornos propuestos

Todos los valores reales están pendientes. Los nombres siguientes son exclusivos de esta integración; no se añaden todavía a `.env.example`.

| Variable | Uso |
| --- | --- |
| `PORTFOLIO_BREVO_NEWSLETTER_API_KEY` | Secreto para campañas, solo Functions |
| `PORTFOLIO_BREVO_CONTACT_API_KEY` | Secreto transaccional para contacto y alertas, solo Functions |
| `PORTFOLIO_NEWSLETTER_MODE` | `off` por defecto, `test` o `production` |
| `PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED` | `false` por defecto; visibilidad de captación, independiente del envío |
| `PORTFOLIO_CONTACT_MODE` | `off` por defecto, `test` o `production` |
| `PORTFOLIO_BREVO_NEWSLETTER_LIST_ID` | Lista de producción, validada en la cuenta del portfolio |
| `PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID` | Lista de pruebas, distinta de producción |
| `PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID` | Segmento enviable de producción definido en §4.1 |
| `PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID` | Segmento enviable de pruebas |
| `PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL` | Remitente verificado de newsletter |
| `PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME` | Identidad pública del portfolio |
| `PORTFOLIO_NEWSLETTER_REPLY_TO` | Correo personal confirmado para respuestas |
| `PORTFOLIO_NEWSLETTER_ALERT_TO` | Destinatario operativo confirmado |
| `PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET` | Secreto propio para validar firma Sanity |
| `PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL` | Remitente verificado de contacto/alertas |
| `PORTFOLIO_BREVO_CONTACT_SENDER_NAME` | Identidad del formulario del portfolio |
| `PORTFOLIO_CONTACT_TO` | Correo personal fijo de producción |
| `PORTFOLIO_CONTACT_TEST_TO` | Destinatario de pruebas autorizado |
| `PORTFOLIO_NEWSLETTER_FORM_URL_ES` / `_EN` | Formularios públicos correspondientes al contexto; no contienen API keys |
| `PUBLIC_SITE_URL` | Origen canónico existente; obligatorio para envío de producción |
| `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` | Variables existentes; también disponibles explícitamente para las Functions |

Las URLs de formularios son información pública aunque las variables no lleven `PUBLIC_`. No serializar bloques enteros de configuración. Usar configuración de Brevo para URLs personales de baja/preferencias; no inventarlas ni aceptar destinos del cliente.

| Entorno | Newsletter | Contacto | Credenciales y estado |
| --- | --- | --- | --- |
| Local / CI normal | `off`; proveedor simulado | `off`; proveedor simulado | Sin secretos ni envíos reales |
| Preview de validación autorizada | `test`, formulario/lista/segmento de test | `test`, destinatario de test fijo | Keys de prueba del portfolio; store de test aislado |
| Producción antes del gate | `off`, captación oculta | `off`, enlace de email disponible | No se habilita por defecto al desplegar |
| Producción aprobada | Solo segmento de producción y suscriptores confirmados | Solo correo personal confirmado | Configuración exclusiva del contexto production |

Los previews ordinarios no heredan envío ni formularios productivos. El contexto de despliegue se valida junto con el modo; un contexto no productivo nunca admite modo `production`. Test no promueve su registro a producción ni consume la identidad del envío productivo. Si la configuración es incompleta, contradictoria o carece de idioma/audiencia válidos, se bloquea la acción.

Configurar secretos en Netlify con alcance Functions; flags/URLs que necesita Astro también en Builds. Las variables declaradas solo en `netlify.toml` no están disponibles para Functions. Los cambios de variables requieren nuevo deploy para aplicarse. [Variables de Functions](https://docs.netlify.com/build/functions/environment-variables/).

## 7. Validación y gates independientes

### Antes de cualquier prueba real

Confirmar cuenta personal del portfolio, identidades de envío y dominio autenticado según Brevo; revisar DNS existente sin tocar registros de Ecooperación. Registrar IDs propios, destinatarios de prueba autorizados, cuotas disponibles y configuración de privacidad. No dar por vigente el plan Free ni trasladar límites o presupuestos desde otra cuenta.

Preparar privacidad ES/EN con responsable, finalidad diferenciada, proveedores, conservación, ejercicio de derechos y baja. Aprobación de textos pendiente; esta spec no certifica cumplimiento legal. El contacto no está condicionado a aceptar marketing.

### Matriz de aceptación

| Flujo | Prueba | Resultado exigido |
| --- | --- | --- |
| Aislamiento | Modos desactivados, configuración ausente, lista incorrecta y preview con modo productivo | Ninguna llamada de envío; captación productiva ausente |
| Suscripción | Email nuevo y email ya existente; solicitud sin confirmar | No reciben campañas |
| Suscripción | DOI ES/EN confirmado, repetición de alta y cambio de idioma | Una preferencia válida; un correo por publicación en el idioma elegido |
| Suscripción | Idioma vacío/inválido, contacto solo de test, baja y nuevo intento sin DOI | Exclusión de producción; sin reactivación silenciosa |
| Newsletter | Draft, traducción incompleta, fecha futura o checkbox desactivado | Ninguna campaña |
| Newsletter | Checkbox antes/después de publicar; URLs aún ausentes o desactualizadas | Espera hasta disponibilidad válida de ambas rutas |
| Newsletter | Dos webhooks simultáneos, scheduler concurrente, edición y rebuild | Una campaña lógica; sin segundo envío automático |
| Newsletter | Timeout al crear/enviar, caída de Blobs, 429, 5xx y error de credencial | Reconciliación o pausa; reintentos acotados; sin duplicación ciega |
| Newsletter | Campaña real a test con destinatarios ES y EN | Solo contenido elegido, enlace correcto, privacidad y baja operativas; recepción comprobada |
| Contacto | ES/EN con y sin JS, teclado y móvil | Formulario usable; estados claros y contenido conservado ante error |
| Contacto | Email/longitud inválidos, cuerpo excesivo, honeypot, origen ajeno y abuso | Sin envío; rechazo controlado |
| Contacto | Intentar inyectar `to`, `cc`, HTML o cabeceras | No altera destinatario/remitente ni ejecuta contenido |
| Contacto | Envío válido de test, respuesta desde el buzón | Recibe el destinatario autorizado; responder apunta al visitante |
| Contacto | Fallo Brevo o timeout | Sin falso éxito ni reenvío automático |
| Independencia | Contactar con email ya suscrito y con email nuevo; newsletter apagada | Sin cambios de listas/consentimiento; contacto funciona por separado |

Pruebas automatizadas con proveedor simulado, sin credenciales reales. Reutilizar Playwright para formularios y añadir comprobaciones de Functions con `node:test` si hace falta; cualquier nuevo comando se documentará en `package.json`, README y AGENTS.md. No hace falta otro framework de pruebas.

En implementación: `pnpm typegen` si cambia schema/query, `pnpm build`, `pnpm build:studio` si cambia Studio, `pnpm audit:a11y`, pruebas nuevas y `git diff --check`. Los tests existentes usan servidor estático; la integración con Functions requiere un entorno que las ejecute. Revisar manualmente el formulario Brevo embebido: axe de la página no certifica contenido de terceros ni entrega.

**Gate newsletter:** cuenta/listas/segmentos, consentimiento, idioma, baja, plantilla real de test, firma, disponibilidad pública, concurrencia y recuperación comprobados; después aprobación explícita para activar captación y envío productivos.

**Gate contacto:** destinatario personal confirmado, recepción y `replyTo` comprobados, privacidad, accesibilidad, abuso y fallos validados; después aprobación explícita para activar contacto. No depende de que newsletter esté activada.

Registrar commit, entorno, deploy, variables verificadas sin valores secretos, IDs de campaña/mensaje, hora, resultado de recepción y incidencias. No adjuntar listas de emails ni contenido privado a GitHub. Un build correcto, CI verde, un envío aceptado y una recepción comprobada son evidencias distintas.

Desactivación: bloquear captación en Brevo y el webhook de newsletter cuando proceda; apagar modos y redesplegar. Las variables no son un interruptor inmediato. Eliminar/ocultar un formulario del sitio no deshabilita su URL en Brevo. Un envío ya aceptado puede continuar; no prometer deshacerlo. No borrar registros de idempotencia al hacer rollback.

## 8. Desglose propuesto de issues — todavía no creadas

Los identificadores siguientes son locales, no números de GitHub. Tras aprobación se crearán únicamente en `Antazx/portfolio`, con esta spec como referencia. `ready-for-agent` se aplicará solo cuando estén resueltas sus dependencias y decisiones.

| ID | Título propuesto y alcance | Dependencias | Cierre verificable |
| --- | --- | --- | --- |
| PB-01 | Validar recursos Brevo y configuración del portfolio. Cuenta, keys por flujo/contexto, sender, destinatarios, listas, segmento, formularios, idioma, cuotas y textos de privacidad | Aprobación de spec/desglose; inicialmente `ready-for-agent` | Inventario propio sin secretos, destinatarios confirmados y prueba de capacidad ES/EN. No activa captación pública |
| PB-02 | Integrar suscripción newsletter ES/EN. Formulario Brevo, preferencia, DOI, páginas de estado y privacidad, enlace en footer, flags | Recursos de newsletter de PB-01 | Alta, baja, idioma, exclusión test y accesibilidad validados; productivo apagado |
| PB-03 | Automatizar newsletter por publicación. Campo editorial, consulta publicada, disponibilidad web, HTML localizado, webhook, campañas, estado, reconciliación, reintentos y alertas | Recursos de newsletter de PB-01; contrato de PB-02 | Pruebas de elegibilidad, concurrencia, ambigüedad y aislamiento pasan; ningún envío productivo |
| PB-04 | Añadir formulario de contacto personal ES/EN. Function, sender fijo, `replyTo`, validaciones, control de abuso y estados accesibles | Recursos de contacto de PB-01; textos de privacidad aprobados | Pruebas de validación y entrega a test; no modifica contactos de marketing; productivo apagado |
| PB-05 | Validar y activar newsletter del portfolio | PB-02 y PB-03; autorización de pruebas y después activación | Campaña test recibida en ES/EN, baja y recuperación probadas, deploy verificado y gate newsletter aprobado |
| PB-06 | Validar y activar contacto del portfolio | PB-04; autorización de pruebas y después activación | Mensaje recibido en correo personal, respuesta correcta, producción y gate contacto verificados |

PB-01 tendrá dos listas de comprobación independientes: newsletter y contacto. Completar una habilita su flujo sin esperar al cierre global de PB-01. PB-04 puede avanzar sin terminar la configuración de newsletter ni PB-02/PB-03. PB-05 y PB-06 no se bloquean entre sí. Cada issue de implementación tendrá su rama `agent/...` y PR; merge y activación se distinguirán de implementación. No se cierran por tener únicamente código o CI verde.

## 9. Decisiones pendientes de aprobación

- Aceptar el diseño de campaña única con contenido condicionado y asunto neutro, sujeto a la validación de Brevo descrita.
- Aceptar formulario newsletter en blog y enlace en footer, sin formulario repetido globalmente.
- Confirmar `guillermoantataz@gmail.com` como destino de contacto o indicar otro correo personal. Remitentes, alertas y destinatarios de test se fijan por separado.
- Confirmar cuenta Brevo personal, dominio de envío y origen público real del portfolio. Ninguno se deduce de la referencia de Ecooperación.
- Aprobar límites iniciales de contacto, espera de despliegue y reintentos; verificar compatibilidad del plan en PB-01.
- Aprobar esta spec y las seis issues propuestas antes de crearlas o implementar.

Fuera de V1: digest, sincronización con Ecooperación, importación de contactos sin consentimiento del portfolio, campañas a toda la cuenta, automatizaciones comerciales adicionales, imágenes de portada nuevas, panel propio, SQL, reenvíos editoriales automáticos y acuse al visitante.
