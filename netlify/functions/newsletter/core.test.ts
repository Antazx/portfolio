import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {escapeHtml, identityFor, isEligiblePost, isValidWebhookSignature, jobKey, normalizePostId, renderNewsletterHtml, webhookOperation} from './core.ts'

const post = {
  _id: 'post-1',
  slug: 'mi-publicacion',
  publishedAt: '2026-09-20T10:00:00.000Z',
  sendNewsletter: true,
  spanish: {title: 'Título <seguro>', excerpt: 'Resumen ES {{ignored}}'},
  english: {title: 'Safe title', excerpt: 'EN summary'},
}

test('eligibility requires the editorial flag, valid date and both translations', () => {
  assert.equal(isEligiblePost(post, new Date('2026-09-21T00:00:00Z')), true)
  assert.equal(isEligiblePost({...post, sendNewsletter: false}, new Date('2026-09-21T00:00:00Z')), false)
  assert.equal(isEligiblePost({...post, publishedAt: '2026-09-22T00:00:00Z'}, new Date('2026-09-21T00:00:00Z')), false)
  assert.equal(isEligiblePost({...post, english: {title: '', excerpt: 'summary'}}, new Date('2026-09-21T00:00:00Z')), false)
})

test('webhook signature accepts Sanity style and rejects tampering', () => {
  const body = JSON.stringify({documentId: 'post-1'})
  const digest = createHmac('sha256', 'secret').update(body).digest('base64')
  assert.equal(isValidWebhookSignature(body, `s:${digest}`, 'secret'), true)
  assert.equal(isValidWebhookSignature(`${body} `, `s:${digest}`, 'secret'), false)
})

test('webhook operation accepts Sanity headers and ignores deletes', () => {
  assert.equal(webhookOperation({_id: 'post-1'}, 'create'), 'create')
  assert.equal(webhookOperation({_id: 'post-1'}, 'update'), 'update')
  assert.equal(webhookOperation({_id: 'post-1'}, 'delete'), 'delete')
  assert.equal(webhookOperation({ids: {deleted: ['post-1']}}), 'delete')
  assert.equal(webhookOperation({ids: {created: ['post-1']}}), 'create')
  assert.equal(webhookOperation({ids: {updated: ['post-1']}}), 'update')
  assert.equal(webhookOperation({ids: {deleted: []}}), undefined)
})

test('newsletter HTML escapes editorial content and keeps one locale block per preference', () => {
  const html = renderNewsletterHtml(post, {
    es: 'https://portfolio.example/es/blog/mi-publicacion/',
    en: 'https://portfolio.example/en/blog/mi-publicacion/',
    privacyEs: 'https://portfolio.example/es/privacidad/',
    privacyEn: 'https://portfolio.example/en/privacy/',
  })
  assert.match(html, /Título &lt;seguro&gt;/)
  assert.doesNotMatch(html, /\{\{ignored\}\}/)
  assert.match(html, /contact\.PORTFOLIO_LANGUAGE == "es"/)
  assert.match(html, /contact\.PORTFOLIO_LANGUAGE == "en"/)
  assert.match(html, /\{\{ unsubscribe \}\}/)
})

test('identity and ids remain stable and bounded', () => {
  assert.equal(identityFor('test', 'post-1'), 'portfolio-newsletter:test:post-1')
  assert.equal(jobKey('production', 'post/1'), 'job/production/post%2F1')
  assert.equal(normalizePostId('drafts.post-1'), 'post-1')
  assert.equal(normalizePostId('post/1'), undefined)
  assert.equal(escapeHtml('a&<b>'), 'a&amp;&lt;b&gt;')
})
