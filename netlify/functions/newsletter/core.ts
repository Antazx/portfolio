import {createHmac, timingSafeEqual} from 'node:crypto'

export type NewsletterEnvironment = 'test' | 'production'
export type NewsletterStatus =
  | 'waiting_publication'
  | 'pending'
  | 'processing'
  | 'accepted'
  | 'failed'
  | 'needs_review'
  | 'cancelled'

export type LocalizedPost = {
  _id: string
  slug: string
  publishedAt: string
  sendNewsletter: boolean
  spanish: {title: string; excerpt: string}
  english: {title: string; excerpt: string}
}

export type NewsletterJob = {
  version: 1
  postId: string
  environment: NewsletterEnvironment
  identity: string
  status: NewsletterStatus
  attempts: number
  nextAttemptAt?: string
  waitingSince?: string
  leaseUntil?: string
  campaignId?: number
  errorCode?: string
  errorStatus?: number
  updatedAt: string
}

export const jobKey = (environment: NewsletterEnvironment, postId: string) =>
  `job/${environment}/${encodeURIComponent(postId)}`

export const identityFor = (environment: NewsletterEnvironment, postId: string) =>
  `portfolio-newsletter:${environment}:${postId}`

export function isEligiblePost(post: LocalizedPost | null | undefined, now = new Date()) {
  if (!post || !post.sendNewsletter || !post._id || !post.slug || !/^[a-z0-9-]+$/.test(post.slug)) return false
  const date = Date.parse(post.publishedAt)
  if (!Number.isFinite(date) || date > now.getTime()) return false
  return [post.spanish, post.english].every(
    (locale) => Boolean(locale?.title?.trim() && locale?.excerpt?.trim()),
  )
}

export function isValidWebhookSignature(rawBody: string, header: string | null | undefined, secret: string) {
  if (!header || !secret) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const candidates = header
    .split(',')
    .map((part) => part.trim())
    .flatMap((part) => {
      const value = /^(?:v1|sig|signature|sha256)(?:=|:)/i.test(part) ? part.slice(part.indexOf('=') >= 0 ? part.indexOf('=') + 1 : part.indexOf(':') + 1) : part
      return [value.replace(/^s:/, '')]
    })
  return candidates.some((candidate) => {
    const decoded = decodeSignature(candidate)
    return decoded ? decoded.length === expected.length && timingSafeEqual(decoded, expected) : false
  })
}

function decodeSignature(value: string) {
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex')
  try {
    return Buffer.from(value, 'base64')
  } catch {
    return null
  }
}

export function normalizePostId(value: unknown) {
  if (typeof value !== 'string') return undefined
  const id = value.trim().replace(/^drafts\./, '')
  return /^[A-Za-z0-9._-]+$/.test(id) ? id : undefined
}

export type WebhookOperation = 'create' | 'update' | 'delete'

export function webhookOperation(payload: unknown, header?: string | null): WebhookOperation | undefined {
  const value = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const candidate = header ?? value.operation ?? value.transition
  if (typeof candidate === 'string') {
    const operation = candidate.trim().toLowerCase()
    if (operation === 'create' || operation === 'update' || operation === 'delete') return operation
    if (operation === 'appear') return 'create'
    if (operation === 'disappear') return 'delete'
  }
  const ids = value.ids && typeof value.ids === 'object' ? value.ids as Record<string, unknown> : undefined
  const hasId = (candidate: unknown) => Array.isArray(candidate) ? candidate.length > 0 : Boolean(candidate)
  if (hasId(ids?.deleted)) return 'delete'
  if (hasId(ids?.created)) return 'create'
  if (hasId(ids?.updated)) return 'update'
  return undefined
}

export function postIdFromWebhook(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined
  const value = payload as Record<string, unknown>
  const ids = value.ids && typeof value.ids === 'object' ? (value.ids as Record<string, unknown>) : undefined
  const candidates = [value.documentId, value._id, value.id, ids?.updated, ids?.created]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const id = candidate.map(normalizePostId).find(Boolean)
      if (id) return id
    } else {
      const id = normalizePostId(candidate)
      if (id) return id
    }
  }
  return undefined
}

export function escapeHtml(value: string) {
  return value
    .replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character] ?? character))
    .replaceAll('{{', '&#123;&#123;')
    .replaceAll('}}', '&#125;&#125;')
}

export function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function renderNewsletterHtml(post: LocalizedPost, urls: {es: string; en: string; privacyEs: string; privacyEn: string}) {
  const block = (locale: 'es' | 'en') => {
    const content = post[locale === 'es' ? 'spanish' : 'english']
    const labels = locale === 'es'
      ? {date: 'Publicado', read: 'Leer la publicación', privacy: 'Privacidad', manage: 'Gestionar preferencias', unsubscribe: 'Darse de baja'}
      : {date: 'Published', read: 'Read the publication', privacy: 'Privacy', manage: 'Manage preferences', unsubscribe: 'Unsubscribe'}
    const date = new Date(post.publishedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {dateStyle: 'long'})
    const privacy = locale === 'es' ? urls.privacyEs : urls.privacyEn
    const articleUrl = locale === 'es' ? urls.es : urls.en
    return `<section lang="${locale}"><p>${labels.date}: ${escapeHtml(date)}</p><h1>${escapeHtml(content.title)}</h1><p>${escapeHtml(content.excerpt)}</p><p><a href="${escapeHtml(articleUrl)}">${labels.read}</a></p><p><a href="${escapeHtml(privacy)}">${labels.privacy}</a> · <a href="{{ update_profile }}">${labels.manage}</a> · <a href="{{ unsubscribe }}">${labels.unsubscribe}</a></p></section>`
  }
  return `<!doctype html><html><body>{{ if contact.PORTFOLIO_LANGUAGE == "es" }}${block('es')}{{ endif }}{{ if contact.PORTFOLIO_LANGUAGE == "en" }}${block('en')}{{ endif }}</body></html>`
}

export function sanitizedError(code: string, status?: number) {
  return {errorCode: code.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80), ...(status ? {errorStatus: status} : {})}
}

export function nextRetry(attempts: number, now = new Date()) {
  const delayMinutes = attempts <= 1 ? 5 : 15
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString()
}
