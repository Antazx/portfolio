const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const MAX_BODY_BYTES = 16 * 1024
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 5000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const localeCopy = {
  es: {
    pageTitle: 'Contacto | Guillermo Anta Alonso',
    successTitle: 'Mensaje enviado',
    successMessage: 'Gracias por escribir. La consulta se ha aceptado para entrega.',
    errorTitle: 'No se ha podido enviar',
    errorMessage: 'Revisa los datos y vuelve a intentarlo.',
    unknownMessage: 'No se pudo confirmar la entrega. Puedes continuar por email.',
    emailFallbackLabel: 'Escribirme por email',
    unavailableMessage: 'El formulario no está disponible ahora. Puedes escribirme por email.',
    rateLimitMessage: 'Has alcanzado el límite temporal. Espera unos minutos e inténtalo de nuevo.',
    backLink: 'Volver al contacto',
    nameLabel: 'Nombre',
    emailLabel: 'Email',
    messageLabel: 'Mensaje',
    privacyLabel: 'He leído el aviso de privacidad y acepto el tratamiento de esta consulta.',
    submitLabel: 'Enviar mensaje',
  },
  en: {
    pageTitle: 'Contact | Guillermo Anta Alonso',
    successTitle: 'Message sent',
    successMessage: 'Thanks for writing. Your message has been accepted for delivery.',
    errorTitle: 'Message not sent',
    errorMessage: 'Check the details and try again.',
    unknownMessage: 'Delivery could not be confirmed. You can continue by email.',
    emailFallbackLabel: 'Email me instead',
    unavailableMessage: 'The form is unavailable right now. You can email me instead.',
    rateLimitMessage: 'The temporary limit has been reached. Wait a few minutes and try again.',
    backLink: 'Back to contact',
    nameLabel: 'Name',
    emailLabel: 'Email',
    messageLabel: 'Message',
    privacyLabel: 'I have read the privacy notice and accept the processing of this enquiry.',
    submitLabel: 'Send message',
  },
}

const jsonHeaders = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
}

const htmlHeaders = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'content-type': 'text/html; charset=utf-8',
  'x-content-type-options': 'nosniff',
}

function jsonResponse(statusCode, body) {
  return {statusCode, headers: {...jsonHeaders}, body: JSON.stringify(body)}
}

function htmlResponse(statusCode, body) {
  return {statusCode, headers: {...htmlHeaders}, body}
}

function header(headers, name) {
  const wanted = name.toLowerCase()
  const entry = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === wanted)
  return typeof entry?.[1] === 'string' ? entry[1] : ''
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isEmail(value) {
  const email = normalizeValue(value)
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email)
}

function mailto(value) {
  const email = normalizeValue(value)
  return isEmail(email) ? `mailto:${email}` : ''
}

function getContentType(event) {
  return header(event.headers, 'content-type').split(';', 1)[0].trim().toLowerCase()
}

function bodyBytes(event) {
  const rawBody = typeof event.body === 'string' ? event.body : ''
  if (event.isBase64Encoded) return Buffer.from(rawBody, 'base64')
  return Buffer.from(rawBody, 'utf8')
}

function parseBody(event) {
  const lengthHeader = header(event.headers, 'content-length')
  if (lengthHeader && Number.isFinite(Number(lengthHeader)) && Number(lengthHeader) > MAX_BODY_BYTES) {
    return {error: {code: 'body_too_large', status: 413}}
  }

  const rawBody = typeof event.body === 'string' ? event.body : ''
  if (event.isBase64Encoded && rawBody.length > Math.ceil(MAX_BODY_BYTES * 4 / 3) + 4) {
    return {error: {code: 'body_too_large', status: 413}}
  }

  const bytes = bodyBytes(event)
  if (bytes.byteLength > MAX_BODY_BYTES) return {error: {code: 'body_too_large', status: 413}}

  let params
  try {
    params = new URLSearchParams(bytes.toString('utf8'))
  } catch {
    return {error: {code: 'invalid_body', status: 400}}
  }

  const fields = {}
  for (const name of ['name', 'email', 'message', 'locale', 'privacy', 'website']) {
    const values = params.getAll(name)
    if (values.length > 1) return {error: {code: 'duplicate_field', status: 400}}
    fields[name] = values[0] ?? ''
  }

  return {fields}
}

function validateFields(fields) {
  const name = normalizeValue(fields.name)
  const email = normalizeValue(fields.email)
  const message = typeof fields.message === 'string' ? fields.message.trim() : ''
  const locale = normalizeValue(fields.locale)
  const privacy = normalizeValue(fields.privacy)
  const website = normalizeValue(fields.website)
  const errors = {}

  if (!name || name.length > MAX_NAME_LENGTH || /[\r\n]/u.test(name)) errors.name = 'invalid_name'
  if (!email || email.length > MAX_EMAIL_LENGTH || /[\r\n]/u.test(email) || !isEmail(email)) {
    errors.email = 'invalid_email'
  }
  if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) errors.message = 'invalid_message'
  if (!Object.hasOwn(localeCopy, locale)) errors.locale = 'invalid_locale'
  if (!['on', 'true', '1'].includes(privacy.toLowerCase())) errors.privacy = 'privacy_required'
  if (website) errors.website = 'invalid_request'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {name, email, message, locale},
  }
}

function isAllowedOrigin(event, env) {
  const configuredSite = normalizeValue(env.PUBLIC_SITE_URL)
  if (!configuredSite) return false

  let siteOrigin
  try {
    siteOrigin = new URL(configuredSite).origin
  } catch {
    return false
  }

  const origin = normalizeValue(header(event.headers, 'origin'))
  const referer = normalizeValue(header(event.headers, 'referer'))
  if (origin) return origin === siteOrigin
  if (referer) {
    try {
      return new URL(referer).origin === siteOrigin
    } catch {
      return false
    }
  }
  return false
}

function clientIp(event, context) {
  if (typeof context?.ip === 'string' && context.ip) return context.ip
  return header(event.headers, 'x-nf-client-connection-ip') || 'unknown'
}

function createMemoryRateLimiter({now = () => Date.now(), max = RATE_LIMIT_MAX_REQUESTS, windowMs = RATE_LIMIT_WINDOW_MS} = {}) {
  const attempts = new Map()

  return async (key) => {
    const current = now()
    const recent = (attempts.get(key) ?? []).filter((timestamp) => current - timestamp < windowMs)
    if (recent.length >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - current) / 1000))
      attempts.set(key, recent)
      return {allowed: false, retryAfterSeconds}
    }
    recent.push(current)
    attempts.set(key, recent)
    return {allowed: true}
  }
}

function configuration(env, mode, rateLimiterType) {
  if (mode === 'off') return {ok: false, status: 503, code: 'contact_disabled'}
  if (!['test', 'production'].includes(mode)) return {ok: false, status: 503, code: 'invalid_mode'}

  if (mode === 'production' && env.CONTEXT !== 'production') {
    return {ok: false, status: 503, code: 'production_context_required'}
  }

  const required = {
    apiKey: env.PORTFOLIO_BREVO_CONTACT_API_KEY,
    senderEmail: env.PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL,
    senderName: env.PORTFOLIO_BREVO_CONTACT_SENDER_NAME,
    to: mode === 'production' ? env.PORTFOLIO_CONTACT_TO : env.PORTFOLIO_CONTACT_TEST_TO,
  }
  if (
    !normalizeValue(required.apiKey) ||
    !isEmail(required.senderEmail) ||
    !normalizeValue(required.senderName) ||
    !isEmail(required.to)
  ) {
    return {ok: false, status: 503, code: 'contact_not_configured'}
  }

  if (
    mode === 'production' &&
    (env.PORTFOLIO_CONTACT_RATE_LIMIT_CONFIGURED !== 'true' ||
      env.PORTFOLIO_CONTACT_RATE_LIMIT_PROVIDER !== 'external' ||
      rateLimiterType !== 'distributed')
  ) {
    return {ok: false, status: 503, code: 'contact_rate_limit_not_configured'}
  }

  if (mode === 'production' && env.PORTFOLIO_CONTACT_TEST_EVIDENCE_CONFIRMED !== 'true') {
    return {ok: false, status: 503, code: 'contact_test_evidence_required'}
  }

  if (mode === 'production' && env.PORTFOLIO_CONTACT_PRIVACY_APPROVED !== 'true') {
    return {ok: false, status: 503, code: 'contact_privacy_not_approved'}
  }

  if (mode === 'production' && env.PORTFOLIO_CONTACT_PRODUCTION_APPROVED !== 'true') {
    return {ok: false, status: 503, code: 'contact_production_not_approved'}
  }

  return {
    ok: true,
    ...Object.fromEntries(Object.entries(required).map(([key, value]) => [key, normalizeValue(value)])),
    fallbackUrl: mailto(required.to),
  }
}

function fieldMessage(locale, field) {
  const messages = {
    es: {
      name: 'Escribe tu nombre.',
      email: 'Escribe un email válido.',
      message: `El mensaje debe tener entre ${MIN_MESSAGE_LENGTH} y ${MAX_MESSAGE_LENGTH} caracteres.`,
      locale: 'Elige un idioma válido.',
      privacy: 'Necesitamos tu aceptación para responder.',
      website: 'Solicitud no válida.',
    },
    en: {
      name: 'Enter your name.',
      email: 'Enter a valid email.',
      message: `The message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`,
      locale: 'Choose a valid language.',
      privacy: 'We need your consent to reply.',
      website: 'Invalid request.',
    },
  }
  return messages[locale]?.[field] ?? messages.en[field] ?? messages.en.website
}

function localizedValidation(locale, errors) {
  return Object.fromEntries(Object.keys(errors).map((field) => [field, fieldMessage(locale, field)]))
}

function htmlForm(locale, values, errors) {
  const copy = localeCopy[locale] ?? localeCopy.en
  const field = (name, type, label, value, attributes = '') => `
    <label for="contact-${name}">${copy[label]}</label>
    <input id="contact-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${attributes} aria-invalid="${errors[name] ? 'true' : 'false'}" />
    ${errors[name] ? `<p role="alert">${escapeHtml(errors[name])}</p>` : ''}`
  return `<form action="/.netlify/functions/contact" method="post">
    <input type="hidden" name="locale" value="${escapeHtml(locale)}" />
    ${field('name', 'text', 'nameLabel', values.name, 'maxlength="100" autocomplete="name" required')}
    ${field('email', 'email', 'emailLabel', values.email, 'maxlength="254" autocomplete="email" required')}
    <label for="contact-message">${copy.messageLabel}</label>
    <textarea id="contact-message" name="message" maxlength="5000" minlength="10" required aria-invalid="${errors.message ? 'true' : 'false'}">${escapeHtml(values.message)}</textarea>
    ${errors.message ? `<p role="alert">${escapeHtml(errors.message)}</p>` : ''}
    <label><input type="checkbox" name="privacy" value="on" required ${values.privacy ? 'checked' : ''} /> ${copy.privacyLabel}</label>
    ${errors.privacy ? `<p role="alert">${escapeHtml(errors.privacy)}</p>` : ''}
    <label style="position:absolute;left:-10000px" aria-hidden="true">Company <input name="website" tabindex="-1" autocomplete="off" /></label>
    <button type="submit">${copy.submitLabel}</button>
  </form>`
}

function renderResult(locale, status, success, message, values = {}, errors = {}, fallbackUrl = '', fallbackLabel = '') {
  const copy = localeCopy[locale] ?? localeCopy.en
  const heading = success ? copy.successTitle : copy.errorTitle
  const body = success ? message : message || copy.errorMessage
  const form = success ? '' : htmlForm(locale, values, errors)
  const fallback = !success && fallbackUrl && fallbackLabel ? `<p><a href="${escapeHtml(fallbackUrl)}">${escapeHtml(fallbackLabel)}</a></p>` : ''
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${copy.pageTitle}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:48rem;margin:4rem auto;padding:0 1rem}label{display:block;margin-top:1rem}input,textarea{display:block;width:100%;max-width:32rem;padding:.6rem;margin-top:.25rem}textarea{min-height:10rem}button{margin-top:1rem;padding:.7rem 1rem}p[role=alert]{color:#a00}</style></head><body><main><h1>${heading}</h1><p>${escapeHtml(body)}</p>${fallback}${form}<p><a href="/${locale}/#contacto">${copy.backLink}</a></p></main></body></html>`
}

function wantsHtml(event) {
  const accept = header(event.headers, 'accept').toLowerCase()
  return accept.includes('text/html') && !accept.includes('application/json')
}

function clientResponse(event, locale, status, body, values = {}, errors = {}) {
  if (wantsHtml(event)) {
    const success = status >= 200 && status < 300
    return htmlResponse(status, renderResult(locale, status, success, body.message, values, errors, body.fallbackUrl, body.fallbackLabel))
  }
  return jsonResponse(status, body)
}

async function sendBrevoEmail({fetchImpl, config, values, mode, signal}) {
  const payload = {
    sender: {email: config.senderEmail, name: config.senderName},
    to: [{email: config.to}],
    replyTo: {email: values.email, name: values.name},
    subject: mode === 'production' ? 'Portfolio contact message' : 'Portfolio contact test message',
    textContent: `Name: ${values.name}\nEmail: ${values.email}\nLanguage: ${values.locale}\n\n${values.message}`,
  }

  const response = await fetchImpl(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  const responseText = await response.text()
  if (!response.ok) return {ok: false, status: response.status, responseText}

  let responseBody = {}
  try {
    responseBody = responseText ? JSON.parse(responseText) : {}
  } catch {
    responseBody = {}
  }
  const messageId = typeof responseBody.messageId === 'string' ? responseBody.messageId : ''
  return messageId ? {ok: true, messageId} : {ok: false, ambiguous: true, status: response.status}
}

function createContactHandler({env = process.env, fetchImpl = fetch, rateLimiter, rateLimiterType = 'memory', timeoutMs = 10_000, logger = console} = {}) {
  const selectedRateLimiter = rateLimiter ?? createMemoryRateLimiter()

  return async (event = {}, context = {}) => {
    if (event.httpMethod !== 'POST') {
      return clientResponse(event, 'en', 405, {code: 'method_not_allowed', message: 'Method not allowed.'})
    }

    if (getContentType(event) !== 'application/x-www-form-urlencoded') {
      return clientResponse(event, 'en', 415, {code: 'unsupported_media_type', message: 'Unsupported form encoding.'})
    }

    if (!isAllowedOrigin(event, env)) {
      return clientResponse(event, 'en', 403, {code: 'invalid_origin', message: 'Request origin is not allowed.'})
    }

    const parsed = parseBody(event)
    if (parsed.error) return clientResponse(event, 'en', parsed.error.status, {code: parsed.error.code, message: 'Invalid request.'})

    const requestedLocale = normalizeValue(parsed.fields.locale)
    const locale = Object.hasOwn(localeCopy, requestedLocale) ? requestedLocale : 'en'
    const mode = normalizeValue(env.PORTFOLIO_CONTACT_MODE || 'off')
    const config = configuration(env, mode, rateLimiterType)
    if (!config.ok) {
      return clientResponse(event, locale, config.status, {code: config.code, message: localeCopy[locale].unavailableMessage}, parsed.fields)
    }

    const validation = validateFields(parsed.fields)
    const formValues = {...parsed.fields, ...validation.values}
    if (!validation.valid) {
      return clientResponse(
        event,
        locale,
        400,
        {code: 'validation_error', message: localeCopy[locale].errorMessage, fields: localizedValidation(locale, validation.errors)},
        formValues,
        localizedValidation(locale, validation.errors),
      )
    }

    const limit = await selectedRateLimiter(clientIp(event, context))
    if (!limit?.allowed) {
      const retryAfter = String(limit?.retryAfterSeconds ?? 60)
      const response = clientResponse(event, locale, 429, {code: 'rate_limited', message: localeCopy[locale].rateLimitMessage})
      response.headers['retry-after'] = retryAfter
      return response
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let result
    try {
      result = await sendBrevoEmail({fetchImpl, config, values: validation.values, mode, signal: controller.signal})
    } catch {
      clearTimeout(timeout)
      logger.warn(JSON.stringify({event: 'contact_email_unknown_result', mode}))
      return clientResponse(
        event,
        locale,
        502,
        {
          code: 'provider_unknown',
          message: localeCopy[locale].unknownMessage,
          fallbackUrl: config.fallbackUrl,
          fallbackLabel: localeCopy[locale].emailFallbackLabel,
        },
        formValues,
      )
    }
    clearTimeout(timeout)

    if (result.ambiguous) {
      logger.warn(JSON.stringify({event: 'contact_email_unknown_result', mode}))
      return clientResponse(
        event,
        locale,
        502,
        {
          code: 'provider_unknown',
          message: localeCopy[locale].unknownMessage,
          fallbackUrl: config.fallbackUrl,
          fallbackLabel: localeCopy[locale].emailFallbackLabel,
        },
        formValues,
      )
    }

    if (!result.ok) {
      logger.warn(JSON.stringify({event: 'contact_email_rejected', mode, providerStatus: result.status}))
      return clientResponse(event, locale, 502, {code: 'provider_error', message: localeCopy[locale].errorMessage}, formValues)
    }

    logger.info(JSON.stringify({event: 'contact_email_accepted', mode, messageId: result.messageId || undefined}))
    return clientResponse(event, locale, 200, {code: 'sent', message: localeCopy[locale].successMessage, messageId: result.messageId || undefined})
  }
}

export {createContactHandler, createMemoryRateLimiter, validateFields}

export const handler = createContactHandler()
