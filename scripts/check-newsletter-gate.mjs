const modes = new Set(['off', 'test', 'production'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const formHosts = new Set(['sibforms.com', 'brevo.com', 'sendinblue.com'])

const value = (env, name) => env[name]?.trim() || ''
const isTrue = (env, name) => value(env, name) === 'true'
const isId = (candidate) => /^\d+$/.test(candidate) && Number(candidate) > 0

function isEmail(candidate) {
  return candidate.length <= 254 && emailPattern.test(candidate)
}

function isHttpsUrl(candidate) {
  try {
    return new URL(candidate).protocol === 'https:'
  } catch {
    return false
  }
}

function isBrevoFormUrl(candidate) {
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' && [...formHosts].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

function createResult(mode, checks, blockers) {
  return {
    mode,
    status: blockers.length === 0 ? (mode === 'off' ? 'safe_off' : 'ready') : 'blocked',
    checks,
    blockers,
    humanBlockers: [
      'Confirmar cuenta Brevo y dominio/senders propios del portfolio.',
      'Confirmar listas, segmentos, DOI, idiomas, destinatarios autorizados y privacidad.',
      'Registrar deploy, campaña, recepción y baja sin guardar secretos ni emails en Git.',
    ],
  }
}

export function checkNewsletterGate(env = process.env) {
  const mode = value(env, 'PORTFOLIO_NEWSLETTER_MODE') || 'off'
  const checks = []
  const blockers = []
  const check = (name, ok, reason) => {
    checks.push({name, ok})
    if (!ok) blockers.push(reason)
  }

  check('mode', modes.has(mode), 'PORTFOLIO_NEWSLETTER_MODE debe ser off, test o production')
  if (!modes.has(mode)) return createResult(mode, checks, blockers)

  if (mode === 'off') {
    check(
      'signup-disabled',
      !isTrue(env, 'PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED'),
      'La captación debe permanecer desactivada cuando PORTFOLIO_NEWSLETTER_MODE=off',
    )
    return createResult(mode, checks, blockers)
  }

  check('signup-enabled', isTrue(env, 'PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED'), 'La captación debe estar habilitada para ejecutar el gate')

  const required = [
    ['newsletter-api-key', 'PORTFOLIO_BREVO_NEWSLETTER_API_KEY', (candidate) => Boolean(candidate)],
    ['sender-email', 'PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL', isEmail],
    ['sender-name', 'PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME', (candidate) => Boolean(candidate)],
    ['reply-to', 'PORTFOLIO_NEWSLETTER_REPLY_TO', isEmail],
    ['alert-api-key', 'PORTFOLIO_BREVO_CONTACT_API_KEY', (candidate) => Boolean(candidate)],
    ['alert-to', 'PORTFOLIO_NEWSLETTER_ALERT_TO', isEmail],
    ['alert-sender-email', 'PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL', isEmail],
    ['alert-sender-name', 'PORTFOLIO_BREVO_CONTACT_SENDER_NAME', (candidate) => Boolean(candidate)],
    ['site-origin', 'PUBLIC_SITE_URL', isHttpsUrl],
    ['privacy-es', 'PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES', isHttpsUrl],
    ['privacy-en', 'PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN', isHttpsUrl],
    ['sanity-project', 'PUBLIC_SANITY_PROJECT_ID', (candidate) => Boolean(candidate)],
    ['sanity-dataset', 'PUBLIC_SANITY_DATASET', (candidate) => Boolean(candidate)],
    ['webhook-secret', 'PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET', (candidate) => Boolean(candidate)],
    ['form-es', 'PORTFOLIO_NEWSLETTER_FORM_URL_ES', isBrevoFormUrl],
    ['form-en', 'PORTFOLIO_NEWSLETTER_FORM_URL_EN', isBrevoFormUrl],
  ]
  for (const [name, variable, validate] of required) {
    check(name, validate(value(env, variable)), `${variable} falta o no tiene un formato válido`)
  }

  const productionList = value(env, 'PORTFOLIO_BREVO_NEWSLETTER_LIST_ID')
  const testList = value(env, 'PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID')
  const productionSegment = value(env, 'PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID')
  const testSegment = value(env, 'PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID')
  check('production-list', isId(productionList), 'La lista de producción falta o no es numérica')
  check('test-list', isId(testList), 'La lista de pruebas falta o no es numérica')
  check('production-segment', isId(productionSegment), 'El segmento de producción falta o no es numérico')
  check('test-segment', isId(testSegment), 'El segmento de pruebas falta o no es numérico')
  check('list-isolation', Boolean(productionList && testList && productionList !== testList), 'La lista de pruebas debe ser distinta de la de producción')
  check('segment-isolation', Boolean(productionSegment && testSegment && productionSegment !== testSegment), 'El segmento de pruebas debe ser distinto del de producción')
  check('test-evidence', isTrue(env, 'PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED'), 'Falta confirmar la evidencia humana de la campaña de pruebas ES/EN')

  if (mode === 'production') {
    check('production-approval', isTrue(env, 'PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED'), 'Falta la aprobación humana explícita del gate newsletter')
  }

  return createResult(mode, checks, blockers)
}

function printResult(result) {
  console.log(`Newsletter gate: ${result.status}`)
  console.log(`Mode: ${result.mode}`)
  for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'BLOCK'} ${check.name}`)
  if (result.status === 'safe_off') console.log('No se realizan llamadas de proveedor mientras el modo sea off.')
  if (result.blockers.length > 0) {
    console.error('Bloqueos:')
    for (const blocker of result.blockers) console.error(`- ${blocker}`)
  }
  console.error('Validación humana pendiente: cuenta, recursos, recepción, baja, deploy y aprobación explícita.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkNewsletterGate()
  printResult(result)
  process.exitCode = result.status === 'blocked' ? 1 : 0
}
