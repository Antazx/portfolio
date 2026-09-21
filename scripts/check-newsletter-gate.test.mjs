import test from 'node:test'
import assert from 'node:assert/strict'
import {checkNewsletterGate} from './check-newsletter-gate.mjs'

const complete = {
  PORTFOLIO_NEWSLETTER_MODE: 'test',
  PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED: 'true',
  PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'key',
  PORTFOLIO_BREVO_NEWSLETTER_LIST_ID: '22',
  PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID: '11',
  PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID: '222',
  PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID: '111',
  PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: 'sender@example.com',
  PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: 'Portfolio',
  PORTFOLIO_NEWSLETTER_REPLY_TO: 'reply@example.com',
  PORTFOLIO_NEWSLETTER_ALERT_TO: 'alerts@example.com',
  PORTFOLIO_BREVO_CONTACT_API_KEY: 'contact-key',
  PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL: 'alerts@example.com',
  PORTFOLIO_BREVO_CONTACT_SENDER_NAME: 'Portfolio alerts',
  PUBLIC_SITE_URL: 'https://portfolio.example',
  PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: 'https://portfolio.example/es/privacidad/',
  PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: 'https://portfolio.example/en/privacy/',
  PUBLIC_SANITY_PROJECT_ID: 'project',
  PUBLIC_SANITY_DATASET: 'production',
  PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET: 'secret',
  PORTFOLIO_NEWSLETTER_FORM_URL_ES: 'https://sibforms.com/es',
  PORTFOLIO_NEWSLETTER_FORM_URL_EN: 'https://sibforms.com/en',
}

test('off is safe and never claims the external gate passed', () => {
  const result = checkNewsletterGate({PORTFOLIO_NEWSLETTER_MODE: 'off', PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED: 'false'})
  assert.equal(result.status, 'safe_off')
  assert.equal(result.blockers.length, 0)
  assert.ok(result.humanBlockers.length > 0)
})

test('incomplete test configuration is blocked without exposing values', () => {
  const result = checkNewsletterGate({PORTFOLIO_NEWSLETTER_MODE: 'test', PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'do-not-print'})
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.some((blocker) => blocker.includes('PORTFOLIO_NEWSLETTER_FORM_URL_ES')))
  assert.doesNotMatch(JSON.stringify(result), /do-not-print/)
})

test('complete test configuration still needs human evidence', () => {
  const result = checkNewsletterGate(complete)
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.some((blocker) => blocker.includes('evidencia humana')))
})

test('production requires explicit approval and keeps test audiences separate', () => {
  const blocked = checkNewsletterGate({...complete, PORTFOLIO_NEWSLETTER_MODE: 'production'})
  assert.equal(blocked.status, 'blocked')
  assert.ok(blocked.blockers.some((blocker) => blocker.includes('aprobación humana')))

  const ready = checkNewsletterGate({
    ...complete,
    PORTFOLIO_NEWSLETTER_MODE: 'production',
    PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED: 'true',
    PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED: 'true',
    CONTEXT: 'production',
  })
  assert.equal(ready.status, 'ready')
})

test('automatic sending stays independent from signup visibility', () => {
  const result = checkNewsletterGate({
    ...complete,
    PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED: 'false',
    PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED: 'true',
    PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED: 'true',
    PORTFOLIO_NEWSLETTER_MODE: 'production',
    CONTEXT: 'production',
  })
  assert.equal(result.status, 'ready')
})

test('test and production IDs cannot be reused', () => {
  const result = checkNewsletterGate({...complete, PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID: '22'})
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.some((blocker) => blocker.includes('lista de pruebas')))
})
