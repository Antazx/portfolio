import test from 'node:test'
import assert from 'node:assert/strict'
import {BrevoError, createCampaign} from './brevo.ts'
import type {NewsletterConfig} from './config.ts'

const config: NewsletterConfig = {
  enabled: true,
  environment: 'test',
  apiKey: 'newsletter-key',
  segmentId: '42',
  senderEmail: 'sender@example.com',
  senderName: 'Portfolio',
  replyTo: 'reply@example.com',
  siteOrigin: 'https://portfolio.example',
  privacyEs: 'https://portfolio.example/es/privacidad/',
  privacyEn: 'https://portfolio.example/en/privacy/',
  missing: [],
}
const post = {
  _id: 'post-1',
  slug: 'mi-publicacion',
  publishedAt: '2026-09-20T10:00:00.000Z',
  sendNewsletter: true,
  spanish: {title: 'Título', excerpt: 'Resumen ES'},
  english: {title: 'Title', excerpt: 'EN summary'},
}

test('campaign creation uses only the configured segment and server-side sender', async () => {
  let request: RequestInit | undefined
  let url = ''
  const id = await createCampaign(config, post, '<html>localized</html>', 'portfolio-newsletter:test:post-1', async (input, init) => {
    url = String(input)
    request = init
    return new Response(JSON.stringify({id: 321}), {status: 201, headers: {'content-type': 'application/json'}})
  })
  assert.equal(id, 321)
  assert.equal(url, 'https://api.brevo.com/v3/emailCampaigns')
  assert.equal((request?.headers as Record<string, string>)['api-key'], 'newsletter-key')
  const body = JSON.parse(String(request?.body)) as Record<string, unknown>
  assert.deepEqual(body.recipients, {segmentIds: [42]})
  assert.equal('listIds' in (body.recipients as object), false)
  assert.deepEqual(body.sender, {name: 'Portfolio', email: 'sender@example.com'})
})

test('Brevo Retry-After is retained for bounded retry scheduling', async () => {
  await assert.rejects(
    createCampaign(config, post, '<html>localized</html>', 'portfolio-newsletter:test:post-1', async () => new Response(null, {status: 429, headers: {'retry-after': '3600'}})),
    (error: unknown) => error instanceof BrevoError && error.status === 429 && error.retryAfterMs === 3_600_000,
  )
})
