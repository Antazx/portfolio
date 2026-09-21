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

## Registro de evidencia

Cuando el acceso humano esté disponible, completar el registro en la issue PB-01
con fecha, entorno, nombres/IDs propios sin secretos, resultado de cada prueba,
cuota observada y bloqueo restante. No adjuntar listas de emails, mensajes ni
claves a GitHub.
