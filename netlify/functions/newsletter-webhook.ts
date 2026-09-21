import {getNewsletterConfig} from './newsletter/config.ts'
import {isValidWebhookSignature, postIdFromWebhook} from './newsletter/core.ts'
import {processNewsletterPost} from './newsletter/process.ts'

export default async function handler(request: Request) {
  const config = getNewsletterConfig()
  if (!config.enabled) return Response.json({status: 'disabled', missing: config.missing}, {status: 202})
  if (request.method !== 'POST') return Response.json({error: 'method_not_allowed'}, {status: 405, headers: {allow: 'POST'}})
  if (!config.webhookSecret) return Response.json({error: 'webhook_not_configured'}, {status: 503})
  const rawBody = await request.text()
  const signature = request.headers.get('sanity-webhook-signature') ?? request.headers.get('x-sanity-signature')
  if (!isValidWebhookSignature(rawBody, signature, config.webhookSecret)) return Response.json({error: 'invalid_signature'}, {status: 401})
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({error: 'invalid_json'}, {status: 400})
  }
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>
    const type = value._type ?? value.documentType
    if (typeof type === 'string' && type !== 'post') return Response.json({status: 'ignored'}, {status: 202})
  }
  const postId = postIdFromWebhook(payload)
  if (!postId) return Response.json({error: 'post_id_missing'}, {status: 400})
  const result = await processNewsletterPost(postId)
  return Response.json(result, {status: result.status === 'needs_review' ? 503 : 202})
}

export const config = {path: '/.netlify/functions/newsletter-webhook'}
