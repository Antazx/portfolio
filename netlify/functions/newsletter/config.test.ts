import test from 'node:test'
import assert from 'node:assert/strict'
import {getNewsletterConfig} from './config.ts'

test('newsletter automation stays disabled without an explicit complete environment', () => {
  const off = getNewsletterConfig({PORTFOLIO_NEWSLETTER_MODE: 'off'})
  assert.equal(off.enabled, false)
  assert.deepEqual(off.missing, [])

  const incomplete = getNewsletterConfig({PORTFOLIO_NEWSLETTER_MODE: 'test', PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID: 'not-an-id'})
  assert.equal(incomplete.enabled, false)
  assert.ok(incomplete.missing.includes('PORTFOLIO_BREVO_NEWSLETTER_API_KEY'))
  assert.ok(incomplete.missing.includes('PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID'))
})

test('test and production modes select independent segments', () => {
  const base = {
    PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'key',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: 'sender@example.com',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: 'Portfolio',
    PORTFOLIO_NEWSLETTER_REPLY_TO: 'reply@example.com',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: 'https://portfolio.example/es/privacidad/',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: 'https://portfolio.example/en/privacy/',
    PUBLIC_SITE_URL: 'https://portfolio.example',
    PUBLIC_SANITY_PROJECT_ID: 'project',
    PUBLIC_SANITY_DATASET: 'production',
    PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID: '11',
    PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID: '22',
  }
  assert.equal(getNewsletterConfig({...base, PORTFOLIO_NEWSLETTER_MODE: 'test'}).segmentId, '11')
  assert.equal(getNewsletterConfig({...base, PORTFOLIO_NEWSLETTER_MODE: 'production', CONTEXT: 'production'}).segmentId, '22')
})

test('production stays disabled outside its deploy context', () => {
  const config = getNewsletterConfig({
    PORTFOLIO_NEWSLETTER_MODE: 'production',
    PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'key',
    PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID: '22',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: 'sender@example.com',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: 'Portfolio',
    PORTFOLIO_NEWSLETTER_REPLY_TO: 'reply@example.com',
    PUBLIC_SITE_URL: 'https://portfolio.example',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: 'https://portfolio.example/es/privacidad/',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: 'https://portfolio.example/en/privacy/',
    PUBLIC_SANITY_PROJECT_ID: 'project',
    PUBLIC_SANITY_DATASET: 'production',
  })
  assert.equal(config.enabled, false)
  assert.ok(config.missing.includes('CONTEXT'))
})

test('production stays disabled until the human activation flag and both audiences are configured', () => {
  const base = {
    PORTFOLIO_NEWSLETTER_MODE: 'production',
    PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'key',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: 'sender@example.com',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: 'Portfolio',
    PORTFOLIO_NEWSLETTER_REPLY_TO: 'reply@example.com',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: 'https://portfolio.example/es/privacidad/',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: 'https://portfolio.example/en/privacy/',
    PUBLIC_SITE_URL: 'https://portfolio.example',
    PUBLIC_SANITY_PROJECT_ID: 'project',
    PUBLIC_SANITY_DATASET: 'production',
    PORTFOLIO_BREVO_NEWSLETTER_LIST_ID: '22',
    PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID: '11',
    PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID: '22',
    PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID: '11',
    PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED: 'true',
    PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET: 'secret',
  }
  const blocked = getNewsletterConfig(base)
  assert.equal(blocked.enabled, false)
  assert.ok(blocked.missing.includes('PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED'))

  const evidenceMissing = getNewsletterConfig({...base, PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED: 'true'})
  assert.equal(evidenceMissing.enabled, false)
  assert.ok(evidenceMissing.missing.includes('PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED'))

  const enabled = getNewsletterConfig({
    ...base,
    PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED: 'true',
    PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED: 'true',
  })
  assert.equal(enabled.enabled, true)
})
