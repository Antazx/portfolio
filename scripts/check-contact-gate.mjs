const modes = new Set(['off', 'test', 'production'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const value = (env, name) => env[name]?.trim() || ''
const isTrue = (env, name) => value(env, name) === 'true'

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

function createResult(mode, checks, blockers) {
  return {
    mode,
    status: blockers.length === 0 ? (mode === 'off' ? 'safe_off' : 'ready') : 'blocked',
    checks,
    blockers,
    humanBlockers: [
      'Confirmar cuenta Brevo, dominio y sender propios del portfolio.',
      'Confirmar destinatario de pruebas, recepción, replyTo, privacidad y ausencia de cambios de marketing.',
      'Registrar deploy, control de abuso y aprobación explícita sin guardar secretos ni mensajes en Git.',
    ],
  }
}

export function checkContactGate(env = process.env) {
  const mode = value(env, 'PORTFOLIO_CONTACT_MODE') || 'off'
  const checks = []
  const blockers = []
  const check = (name, ok, reason) => {
    checks.push({name, ok})
    if (!ok) blockers.push(reason)
  }

  check('mode', modes.has(mode), 'PORTFOLIO_CONTACT_MODE debe ser off, test o production')
  if (!modes.has(mode)) return createResult(mode, checks, blockers)

  if (mode === 'off') return createResult(mode, checks, blockers)

  const destinationVariable = mode === 'production' ? 'PORTFOLIO_CONTACT_TO' : 'PORTFOLIO_CONTACT_TEST_TO'
  const required = [
    ['contact-api-key', 'PORTFOLIO_BREVO_CONTACT_API_KEY', (candidate) => Boolean(candidate)],
    ['sender-email', 'PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL', isEmail],
    ['sender-name', 'PORTFOLIO_BREVO_CONTACT_SENDER_NAME', (candidate) => Boolean(candidate)],
    ['destination', destinationVariable, isEmail],
    ['site-origin', 'PUBLIC_SITE_URL', isHttpsUrl],
  ]
  for (const [name, variable, validate] of required) {
    check(name, validate(value(env, variable)), `${variable} falta o no tiene un formato válido`)
  }

  check(
    'test-evidence',
    isTrue(env, 'PORTFOLIO_CONTACT_TEST_EVIDENCE_CONFIRMED'),
    'Falta confirmar la evidencia humana del contacto de prueba, recepción, replyTo y separación de marketing',
  )

  if (mode === 'production') {
    check('production-context', value(env, 'CONTEXT') === 'production', 'El contacto de producción requiere CONTEXT=production')
    check(
      'rate-limit',
      isTrue(env, 'PORTFOLIO_CONTACT_RATE_LIMIT_CONFIGURED') && value(env, 'PORTFOLIO_CONTACT_RATE_LIMIT_PROVIDER') === 'external',
      'Falta configurar y verificar un control de abuso externo/distribuido para producción',
    )
    check(
      'privacy-approval',
      isTrue(env, 'PORTFOLIO_CONTACT_PRIVACY_APPROVED'),
      'Falta aprobar los textos de privacidad del contacto',
    )
    check(
      'production-approval',
      isTrue(env, 'PORTFOLIO_CONTACT_PRODUCTION_APPROVED'),
      'Falta la aprobación humana explícita del gate contacto',
    )
  }

  return createResult(mode, checks, blockers)
}

function printResult(result) {
  console.log(`Contact gate: ${result.status}`)
  console.log(`Mode: ${result.mode}`)
  for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'BLOCK'} ${check.name}`)
  if (result.status === 'safe_off') console.log('No se realizan llamadas de proveedor mientras el modo sea off.')
  if (result.blockers.length > 0) {
    console.error('Bloqueos:')
    for (const blocker of result.blockers) console.error(`- ${blocker}`)
  }
  console.error('Validación humana pendiente: cuenta, sender, recepción, replyTo, marketing, abuso y aprobación explícita.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkContactGate()
  printResult(result)
  process.exitCode = result.status === 'blocked' ? 1 : 0
}
