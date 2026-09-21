import type {NewsletterConfig} from './config.ts'
import type {LocalizedPost} from './core.ts'

const apiBase = 'https://api.brevo.com/v3'

export class BrevoError extends Error {
  readonly operation: string
  readonly status?: number
  readonly ambiguous: boolean
  readonly retryAfterMs?: number

  constructor(operation: string, status?: number, ambiguous = false, retryAfterMs?: number) {
    super(`Brevo ${operation} failed`)
    this.operation = operation
    this.status = status
    this.ambiguous = ambiguous
    this.retryAfterMs = retryAfterMs
  }
}

async function request(path: string, init: RequestInit, config: NewsletterConfig, operation: string, fetcher: typeof fetch) {
  if (!config.apiKey) throw new BrevoError(operation)
  let response: Response
  try {
    response = await fetcher(`${apiBase}${path}`, {
      ...init,
      headers: {'api-key': config.apiKey, accept: 'application/json', 'content-type': 'application/json', ...init.headers},
    })
  } catch {
    throw new BrevoError(operation, undefined, true)
  }
  if (!response.ok) throw new BrevoError(operation, response.status, response.status >= 500, retryAfter(response.headers.get('retry-after')))
  return response
}

function retryAfter(value: string | null) {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

export async function createCampaign(config: NewsletterConfig, post: LocalizedPost, htmlContent: string, identity: string, fetcher: typeof fetch = fetch) {
  if (!config.segmentId || !config.senderEmail || !config.senderName || !config.replyTo) throw new BrevoError('create_campaign')
  const response = await request('/emailCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: identity,
      subject: `Guillermo Anta Alonso · ${post.publishedAt.slice(0, 10)}`,
      sender: {name: config.senderName, email: config.senderEmail},
      replyTo: config.replyTo,
      recipients: {segmentIds: [Number(config.segmentId)]},
      htmlContent,
      tags: [identity],
    }),
  }, config, 'create_campaign', fetcher)
  const payload = await response.json().catch(() => ({})) as {id?: number}
  if (!Number.isInteger(payload.id)) throw new BrevoError('create_campaign', response.status, true)
  return payload.id
}

export async function getCampaignStatus(config: NewsletterConfig, campaignId: number, fetcher: typeof fetch = fetch) {
  const response = await request(`/emailCampaigns/${campaignId}`, {method: 'GET'}, config, 'get_campaign', fetcher)
  const payload = await response.json().catch(() => ({})) as {status?: string}
  return payload.status?.toLowerCase()
}

export async function sendCampaignNow(config: NewsletterConfig, campaignId: number, fetcher: typeof fetch = fetch) {
  await request(`/emailCampaigns/${campaignId}/sendNow`, {method: 'POST', body: '{}'}, config, 'send_campaign', fetcher)
}

export async function sendAlert(config: NewsletterConfig, subject: string, text: string, fetcher: typeof fetch = fetch) {
  if (!config.alertApiKey || !config.alertTo || !config.alertSenderEmail || !config.alertSenderName) return false
  try {
    const response = await fetcher(`${apiBase}/smtp/email`, {
      method: 'POST',
      headers: {'api-key': config.alertApiKey, accept: 'application/json', 'content-type': 'application/json'},
      body: JSON.stringify({sender: {email: config.alertSenderEmail, name: config.alertSenderName}, to: [{email: config.alertTo}], subject, textContent: text.slice(0, 1000)}),
    })
    return response.ok
  } catch {
    return false
  }
}
