import test from 'node:test'
import assert from 'node:assert/strict'
import {checkContactGate} from './check-contact-gate.mjs'

const completeTest = {
  PORTFOLIO_CONTACT_MODE: 'test',
  PORTFOLIO_BREVO_CONTACT_API_KEY: 'contact-key',
  PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL: 'sender@example.com',
  PORTFOLIO_BREVO_CONTACT_SENDER_NAME: 'Portfolio',
  PORTFOLIO_CONTACT_TEST_TO: 'test-recipient@example.com',
  PORTFOLIO_CONTACT_TEST_EVIDENCE_CONFIRMED: 'true',
  PUBLIC_SITE_URL: 'https://portfolio.example',
}

test('off is safe and leaves the human gate pending', () => {
  const result = checkContactGate({PORTFOLIO_CONTACT_MODE: 'off'})

  assert.equal(result.status, 'safe_off')
  assert.deepEqual(result.blockers, [])
  assert.ok(result.humanBlockers.length > 0)
})

test('incomplete test configuration is blocked without exposing values', () => {
  const result = checkContactGate({
    PORTFOLIO_CONTACT_MODE: 'test',
    PORTFOLIO_BREVO_CONTACT_API_KEY: 'do-not-print',
  })

  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.some((blocker) => blocker.includes('PORTFOLIO_CONTACT_TEST_TO')))
  assert.doesNotMatch(JSON.stringify(result), /do-not-print/)
})

test('complete test configuration is ready only after human evidence', () => {
  const blocked = checkContactGate({...completeTest, PORTFOLIO_CONTACT_TEST_EVIDENCE_CONFIRMED: 'false'})
  assert.equal(blocked.status, 'blocked')
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('evidencia humana')))

  const ready = checkContactGate(completeTest)
  assert.equal(ready.status, 'ready')
})

test('production requires context, abuse control, privacy and explicit approval', () => {
  const base = {
    ...completeTest,
    PORTFOLIO_CONTACT_MODE: 'production',
    PORTFOLIO_CONTACT_TO: 'owner@example.com',
  }

  const blocked = checkContactGate(base)
  assert.equal(blocked.status, 'blocked')
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('CONTEXT=production')))
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('control de abuso')))
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('privacidad')))
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('aprobación humana explícita')))

  const ready = checkContactGate({
    ...base,
    CONTEXT: 'production',
    PORTFOLIO_CONTACT_RATE_LIMIT_CONFIGURED: 'true',
    PORTFOLIO_CONTACT_RATE_LIMIT_PROVIDER: 'external',
    PORTFOLIO_CONTACT_PRIVACY_APPROVED: 'true',
    PORTFOLIO_CONTACT_PRODUCTION_APPROVED: 'true',
  })
  assert.equal(ready.status, 'ready')
})

test('production and test destinations are selected independently', () => {
  const testResult = checkContactGate(completeTest)
  const productionResult = checkContactGate({
    ...completeTest,
    PORTFOLIO_CONTACT_MODE: 'production',
    PORTFOLIO_CONTACT_TO: 'owner@example.com',
    CONTEXT: 'production',
    PORTFOLIO_CONTACT_RATE_LIMIT_CONFIGURED: 'true',
    PORTFOLIO_CONTACT_RATE_LIMIT_PROVIDER: 'external',
    PORTFOLIO_CONTACT_PRIVACY_APPROVED: 'true',
    PORTFOLIO_CONTACT_PRODUCTION_APPROVED: 'true',
  })

  assert.equal(testResult.status, 'ready')
  assert.equal(productionResult.status, 'ready')
  assert.ok(productionResult.checks.some(({name, ok}) => name === 'destination' && ok))
})
