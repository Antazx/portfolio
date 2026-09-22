import test from 'node:test'
import assert from 'node:assert/strict'
import {BrevoError} from './brevo.ts'
import {processNewsletterPost} from './process.ts'

const post = {
  _id: 'post-1',
  slug: 'mi-publicacion',
  publishedAt: '2026-09-20T10:00:00.000Z',
  sendNewsletter: true,
  spanish: {title: 'Título', excerpt: 'Resumen ES'},
  english: {title: 'Title', excerpt: 'EN summary'},
}

class MemoryStore {
  values = new Map<string, {data: unknown; etag: string}>()
  sequence = 0

  async getWithMetadata(key: string) {
    const value = this.values.get(key)
    return value ? {data: value.data, etag: value.etag} : null
  }

  async setJSON(key: string, data: unknown, conditions: {onlyIfNew?: boolean; onlyIfMatch?: string} = {}) {
    const current = this.values.get(key)
    if (conditions.onlyIfNew && current) return {modified: false}
    if (conditions.onlyIfMatch && (!current || current.etag !== conditions.onlyIfMatch)) return {modified: false}
    const etag = String(++this.sequence)
    this.values.set(key, {data, etag})
    return {modified: true, etag}
  }

  async list() {
    return {blobs: [...this.values.keys()].map((key) => ({key, etag: this.values.get(key)!.etag})), directories: []}
  }
}

function configure() {
  Object.assign(process.env, {
    PORTFOLIO_NEWSLETTER_MODE: 'test',
    PORTFOLIO_BREVO_NEWSLETTER_API_KEY: 'test-key',
    PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID: '123',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: 'newsletter@example.com',
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: 'Portfolio',
    PORTFOLIO_NEWSLETTER_REPLY_TO: 'hello@example.com',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: 'https://portfolio.example/es/privacidad/',
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: 'https://portfolio.example/en/privacy/',
    PUBLIC_SITE_URL: 'https://portfolio.example',
    PUBLIC_SANITY_PROJECT_ID: 'project',
    PUBLIC_SANITY_DATASET: 'production',
    PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET: 'secret',
  })
}

test('campaign identity is idempotent and concurrent claims send once', async () => {
  configure()
  const store = new MemoryStore()
  let creates = 0
  let sends = 0
  const dependencies = {
    storeFactory: () => store,
    now: () => new Date('2026-09-21T00:00:00Z'),
    fetchPost: async () => post,
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { creates += 1; return 88 },
    getCampaignStatus: async () => 'draft',
    sendCampaignNow: async () => { sends += 1 },
    sendAlert: async () => true,
  }
  const results = await Promise.all([
    processNewsletterPost('post-1', dependencies),
    processNewsletterPost('post-1', dependencies),
  ])
  assert.equal(creates, 1)
  assert.equal(sends, 1)
  assert.equal(results.filter((result) => result.status === 'accepted').length, 1)
  const again = await processNewsletterPost('post-1', dependencies)
  assert.equal(again.status, 'accepted')
  assert.equal(sends, 1)
})

test('unavailable public pages wait without creating a campaign', async () => {
  configure()
  const store = new MemoryStore()
  let creates = 0
  const result = await processNewsletterPost('post-2', {
    storeFactory: () => store,
    now: () => new Date('2026-09-21T00:00:00Z'),
    fetchPost: async () => ({...post, _id: 'post-2'}),
    checkPublic: async () => ({available: false as const, transient: true, reason: 'public_content_not_ready'}),
    createCampaign: async () => { creates += 1; return 1 },
    sendAlert: async () => true,
  })
  assert.equal(result.status, 'waiting_publication')
  assert.equal(creates, 0)
})

test('publication wait stops after one hour for manual review', async () => {
  configure()
  const store = new MemoryStore()
  const dependencies = {
    storeFactory: () => store,
    fetchPost: async () => ({...post, _id: 'post-timeout'}),
    checkPublic: async () => ({available: false as const, transient: true, reason: 'public_content_not_ready'}),
    sendAlert: async () => true,
  }
  const first = await processNewsletterPost('post-timeout', {...dependencies, now: () => new Date('2026-09-21T00:00:00Z')})
  assert.equal(first.status, 'waiting_publication')
  const second = await processNewsletterPost('post-timeout', {...dependencies, now: () => new Date('2026-09-21T01:01:00Z')})
  assert.equal(second.status, 'needs_review')
})

test('known Brevo rate limits retry and ambiguous failures stop for review', async () => {
  configure()
  const rateStore = new MemoryStore()
  const rateLimited = await processNewsletterPost('post-3', {
    storeFactory: () => rateStore,
    now: () => new Date('2026-09-21T00:00:00Z'),
    fetchPost: async () => ({...post, _id: 'post-3'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { throw new BrevoError('create_campaign', 429) },
    sendAlert: async () => true,
  })
  assert.equal(rateLimited.status, 'pending')
  const secondRateLimit = await processNewsletterPost('post-3', {
    storeFactory: () => rateStore,
    now: () => new Date('2026-09-21T00:06:00Z'),
    fetchPost: async () => ({...post, _id: 'post-3'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { throw new BrevoError('create_campaign', 429) },
    sendAlert: async () => true,
  })
  assert.equal(secondRateLimit.status, 'pending')
  const exhaustedRateLimit = await processNewsletterPost('post-3', {
    storeFactory: () => rateStore,
    now: () => new Date('2026-09-21T00:22:00Z'),
    fetchPost: async () => ({...post, _id: 'post-3'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { throw new BrevoError('create_campaign', 429) },
    sendAlert: async () => true,
  })
  assert.equal(exhaustedRateLimit.status, 'failed')

  const reviewStore = new MemoryStore()
  let ambiguousCreates = 0
  const ambiguous = await processNewsletterPost('post-4', {
    storeFactory: () => reviewStore,
    fetchPost: async () => ({...post, _id: 'post-4'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { ambiguousCreates += 1; throw new BrevoError('create_campaign', undefined, true) },
    sendAlert: async () => true,
  })
  assert.equal(ambiguous.status, 'needs_review')
  const stillReview = await processNewsletterPost('post-4', {
    storeFactory: () => reviewStore,
    fetchPost: async () => ({...post, _id: 'post-4'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { ambiguousCreates += 1; return 2 },
    sendAlert: async () => true,
  })
  assert.equal(stillReview.status, 'needs_review')
  assert.equal(ambiguousCreates, 1)
})

test('webhook entry respects a pending retry time before claiming work', async () => {
  configure()
  const store = new MemoryStore()
  const first = await processNewsletterPost('post-webhook-retry', {
    storeFactory: () => store,
    now: () => new Date('2026-09-21T00:00:00Z'),
    fetchPost: async () => ({...post, _id: 'post-webhook-retry'}),
    checkPublic: async () => ({available: true as const, urls: {es: 'https://portfolio.example/es/blog/mi-publicacion/', en: 'https://portfolio.example/en/blog/mi-publicacion/'}}),
    createCampaign: async () => { throw new BrevoError('create_campaign', 429) },
    sendAlert: async () => true,
  })
  assert.equal(first.status, 'pending')

  let fetched = false
  const second = await processNewsletterPost('post-webhook-retry', {
    storeFactory: () => store,
    now: () => new Date('2026-09-21T00:01:00Z'),
    fetchPost: async () => { fetched = true; return post },
  })
  assert.equal(second.status, 'pending')
  assert.equal(fetched, false)
})
