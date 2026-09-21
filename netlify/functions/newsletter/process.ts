import {getNewsletterConfig, type NewsletterConfig} from './config.ts'
import {BrevoError, createCampaign, getCampaignStatus, sendAlert, sendCampaignNow} from './brevo.ts'
import {identityFor, isEligiblePost, jobKey, nextRetry, renderNewsletterHtml, sanitizedError, type NewsletterEnvironment, type NewsletterJob} from './core.ts'
import {checkPublicPost, type PublicCheck} from './public.ts'
import {fetchNewsletterPost, SanityError} from './sanity.ts'
import {getNewsletterStore, type NewsletterStore} from './storage.ts'

type JobRecord = {data: NewsletterJob; etag?: string}
type Dependencies = {
  storeFactory?: (environment: NewsletterEnvironment) => NewsletterStore
  fetchPost?: typeof fetchNewsletterPost
  checkPublic?: typeof checkPublicPost
  createCampaign?: typeof createCampaign
  getCampaignStatus?: typeof getCampaignStatus
  sendCampaignNow?: typeof sendCampaignNow
  sendAlert?: typeof sendAlert
  fetcher?: typeof fetch
  now?: () => Date
}

const acceptedCampaignStatuses = new Set(['sent', 'queued', 'processing', 'scheduled', 'running', 'archive'])
const terminalStatuses = new Set(['accepted', 'failed', 'needs_review', 'cancelled'])
const leaseMs = 2 * 60_000
const publicationWaitMs = 60 * 60_000

async function readJob(store: NewsletterStore, key: string): Promise<JobRecord | null> {
  const result = await store.getWithMetadata(key, {type: 'json', consistency: 'strong'}) as {data?: NewsletterJob; etag?: string} | null
  return result?.data ? {data: result.data, etag: result.etag} : null
}

async function claimJob(store: NewsletterStore, environment: NewsletterEnvironment, postId: string, now: Date) {
  const key = jobKey(environment, postId)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readJob(store, key)
    if (current && terminalStatuses.has(current.data.status)) return {key, current, claimed: false as const}
    if (current?.data.status === 'processing' && current.data.leaseUntil && Date.parse(current.data.leaseUntil) > now.getTime()) {
      return {key, current, claimed: false as const}
    }
    const base = current?.data ?? {
      version: 1 as const,
      postId,
      environment,
      identity: identityFor(environment, postId),
      status: 'pending' as const,
      attempts: 0,
      updatedAt: now.toISOString(),
    }
    const state: NewsletterJob = {...base, status: 'processing', leaseUntil: new Date(now.getTime() + leaseMs).toISOString(), updatedAt: now.toISOString()}
    const result = await store.setJSON(key, state, current?.etag ? {onlyIfMatch: current.etag} : {onlyIfNew: true})
    if (result.modified) return {key, current: {data: state, etag: result.etag}, claimed: true as const}
  }
  return {key, current: null, claimed: false as const}
}

async function saveJob(store: NewsletterStore, key: string, state: NewsletterJob, etag?: string) {
  const currentEtag = etag ?? (await store.getWithMetadata(key, {type: 'json', consistency: 'strong'}))?.etag
  if (!currentEtag) return false
  const result = await store.setJSON(key, state, {onlyIfMatch: currentEtag})
  return result.modified ? result.etag : false
}

async function finish(store: NewsletterStore, key: string, current: JobRecord, patch: Partial<NewsletterJob>) {
  const state = {...current.data, ...patch, leaseUntil: undefined, updatedAt: new Date().toISOString()}
  return saveJob(store, key, state, current.etag)
}

function errorPatch(error: unknown, state: NewsletterJob, now: Date): Partial<NewsletterJob> {
  if (error instanceof BrevoError && error.status === 429 && state.attempts < 2) {
    const scheduled = nextRetry(state.attempts + 1, now)
    const retryAfter = error.retryAfterMs ? new Date(now.getTime() + error.retryAfterMs).toISOString() : scheduled
    return {...sanitizedError('brevo_rate_limited', 429), status: 'pending', attempts: state.attempts + 1, nextAttemptAt: new Date(Math.max(Date.parse(scheduled), Date.parse(retryAfter))).toISOString()}
  }
  if (error instanceof BrevoError && error.ambiguous) return {...sanitizedError(`brevo_${error.operation}_ambiguous`, error.status), status: 'needs_review'}
  if (error instanceof BrevoError) return {...sanitizedError(`brevo_${error.operation}`, error.status), status: 'failed'}
  if (error instanceof SanityError) return {...sanitizedError('sanity_query', error.status), status: error.transient ? 'waiting_publication' : 'failed', ...(error.transient ? {nextAttemptAt: nextRetry(state.attempts, now)} : {})}
  return {...sanitizedError('newsletter_unexpected'), status: 'needs_review'}
}

async function notifyFailure(config: NewsletterConfig, state: NewsletterJob, patch: Partial<NewsletterJob>, sendAlertFn: typeof sendAlert, fetcher: typeof fetch) {
  if (patch.status !== 'failed' && patch.status !== 'needs_review') return
  await sendAlertFn(config, `Portfolio newsletter ${patch.status}`, `${state.identity} · ${patch.errorCode ?? 'unknown error'}`, fetcher)
}

export async function processNewsletterPost(postId: string, dependencies: Dependencies = {}) {
  const config = getNewsletterConfig()
  if (!config.enabled || !config.environment) return {status: 'disabled', missing: config.missing}
  const now = dependencies.now?.() ?? new Date()
  const fetcher = dependencies.fetcher ?? fetch
  const store = (dependencies.storeFactory ?? getNewsletterStore)(config.environment)
  const claim = await claimJob(store, config.environment, postId, now)
  if (!claim.claimed || !claim.current) return {status: claim.current?.data.status ?? 'busy', key: claim.key}
  const current = claim.current
  const deps = {
    fetchPost: dependencies.fetchPost ?? fetchNewsletterPost,
    checkPublic: dependencies.checkPublic ?? checkPublicPost,
    createCampaign: dependencies.createCampaign ?? createCampaign,
    getCampaignStatus: dependencies.getCampaignStatus ?? getCampaignStatus,
    sendCampaignNow: dependencies.sendCampaignNow ?? sendCampaignNow,
    sendAlert: dependencies.sendAlert ?? sendAlert,
  }
  let etag = current.etag
  let state = current.data

  try {
    const post = await deps.fetchPost(postId, config, fetcher)
    if (!post) {
      const patch = {...sanitizedError('post_not_eligible'), status: 'cancelled' as const, nextAttemptAt: undefined, waitingSince: undefined}
      await finish(store, claim.key, current, patch)
      return patch
    }
    if (!isEligiblePost(post, now)) {
      const patch = {...sanitizedError('post_not_eligible'), status: 'cancelled' as const, nextAttemptAt: undefined, waitingSince: undefined}
      await finish(store, claim.key, current, patch)
      return patch
    }
    const publicPost: PublicCheck = await deps.checkPublic(post, config, fetcher)
    if (!publicPost.available) {
      const waitingSince = current.data.waitingSince ?? now.toISOString()
      const timedOut = now.getTime() - Date.parse(waitingSince) >= publicationWaitMs
      const patch = publicPost.transient && !timedOut
        ? {...sanitizedError(publicPost.reason), status: 'waiting_publication' as const, waitingSince, nextAttemptAt: nextRetry(current.data.attempts, now)}
        : {...sanitizedError(timedOut ? 'publication_timeout' : publicPost.reason), status: 'needs_review' as const, waitingSince}
      await finish(store, claim.key, current, patch)
      await notifyFailure(config, state, patch, deps.sendAlert, fetcher)
      return patch
    }

    let campaignId = state.campaignId
    if (campaignId) {
      const status = await deps.getCampaignStatus(config, campaignId, fetcher)
      if (status && acceptedCampaignStatuses.has(status)) {
        const patch = {status: 'accepted' as const, errorCode: undefined, errorStatus: undefined, nextAttemptAt: undefined, waitingSince: undefined}
        await finish(store, claim.key, current, patch)
        return patch
      }
      if (status !== 'draft') {
        const patch = {...sanitizedError('campaign_status_unknown'), status: 'needs_review' as const}
        await finish(store, claim.key, current, patch)
        await notifyFailure(config, state, patch, deps.sendAlert, fetcher)
        return patch
      }
    } else {
      const html = renderNewsletterHtml(post, {es: publicPost.urls.es, en: publicPost.urls.en, privacyEs: config.privacyEs!, privacyEn: config.privacyEn!})
      campaignId = await deps.createCampaign(config, post, html, state.identity, fetcher)
      const persisted = await saveJob(store, claim.key, {...state, campaignId, status: 'processing', updatedAt: now.toISOString()}, etag)
      if (!persisted) {
        const patch = {...sanitizedError('campaign_id_not_persisted'), status: 'needs_review' as const}
        await notifyFailure(config, state, patch, deps.sendAlert, fetcher)
        return patch
      }
      etag = persisted
      state = {...state, campaignId}
    }
    if (!campaignId) throw new BrevoError('send_campaign')
    await deps.sendCampaignNow(config, campaignId, fetcher)
    const accepted = {status: 'accepted' as const, campaignId, errorCode: undefined, errorStatus: undefined, nextAttemptAt: undefined, waitingSince: undefined}
    const persisted = await saveJob(store, claim.key, {...state, ...accepted, leaseUntil: undefined, updatedAt: new Date().toISOString()}, etag)
    if (!persisted) {
      const patch = {...sanitizedError('accepted_state_not_persisted'), status: 'needs_review' as const, campaignId}
      await notifyFailure(config, state, patch, deps.sendAlert, fetcher)
      return patch
    }
    return accepted
  } catch (error) {
    let patch = errorPatch(error, state, now)
    if (patch.status === 'waiting_publication') {
      const waitingSince = state.waitingSince ?? now.toISOString()
      if (now.getTime() - Date.parse(waitingSince) >= publicationWaitMs) {
        patch = {...patch, ...sanitizedError('publication_timeout'), status: 'needs_review'}
      } else {
        patch = {...patch, waitingSince}
      }
    }
    const persisted = await saveJob(store, claim.key, {...state, ...patch, leaseUntil: undefined, updatedAt: new Date().toISOString()}, etag)
    if (!persisted) await notifyFailure(config, state, {...sanitizedError('error_state_not_persisted'), status: 'needs_review' as const}, deps.sendAlert, fetcher)
    await notifyFailure(config, state, patch, deps.sendAlert, fetcher)
    return patch
  }
}

export async function runNewsletterScheduler(dependencies: Pick<Dependencies, 'storeFactory' | 'now'> = {}) {
  const config = getNewsletterConfig()
  if (!config.enabled || !config.environment) return {status: 'disabled', missing: config.missing}
  const store = (dependencies.storeFactory ?? getNewsletterStore)(config.environment)
  const now = dependencies.now?.() ?? new Date()
  const listed = await store.list({prefix: 'job/'})
  const results = []
  for (const blob of listed.blobs) {
    const job = await readJob(store, blob.key)
    if (!job || (job.data.nextAttemptAt && Date.parse(job.data.nextAttemptAt) > now.getTime()) || terminalStatuses.has(job.data.status)) continue
    results.push(await processNewsletterPost(job.data.postId, {...dependencies, storeFactory: dependencies.storeFactory ?? (() => store), now: () => now}))
  }
  return {status: 'ok', processed: results.length, results}
}
