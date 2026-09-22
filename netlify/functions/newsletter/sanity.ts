import type {NewsletterConfig} from './config.ts'
import type {LocalizedPost} from './core.ts'

// Netlify Functions are outside the web typegen pipeline, so this runtime query stays a string.
export const newsletterPostQuery = `*[
  _type == "post" &&
  !(_id in path("drafts.**")) &&
  _id == $postId &&
  defined(publishedAt) &&
  publishedAt <= now() &&
  defined(slug.current) &&
  sendNewsletter == true &&
  defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0 &&
  defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0
][0]{
  _id,
  "slug": slug.current,
  publishedAt,
  "sendNewsletter": coalesce(sendNewsletter, false),
  "spanishTitle": spanish.title,
  "spanishExcerpt": spanish.excerpt,
  "englishTitle": english.title,
  "englishExcerpt": english.excerpt
}`

export class SanityError extends Error {
  readonly status: number | undefined
  readonly transient: boolean

  constructor(status: number | undefined, transient: boolean) {
    super('Sanity query failed')
    this.status = status
    this.transient = transient
  }
}

export async function fetchNewsletterPost(
  postId: string,
  config: NewsletterConfig,
  fetcher: typeof fetch = fetch,
): Promise<LocalizedPost | null> {
  if (!config.sanityProjectId || !config.sanityDataset) throw new SanityError(undefined, false)
  const url = `https://${config.sanityProjectId}.api.sanity.io/v2026-09-18/data/query/${encodeURIComponent(config.sanityDataset)}?perspective=published`
  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: {'content-type': 'application/json', accept: 'application/json'},
      body: JSON.stringify({query: newsletterPostQuery, params: {postId}}),
    })
  } catch {
    throw new SanityError(undefined, true)
  }
  if (!response.ok) throw new SanityError(response.status, response.status >= 500 || response.status === 429)
  try {
    const payload = await response.json() as {result?: (Omit<LocalizedPost, 'spanish' | 'english'> & {spanishTitle?: string; spanishExcerpt?: string; englishTitle?: string; englishExcerpt?: string}) | null}
    if (!payload.result) return null
    const result = payload.result
    return {
      _id: result._id,
      slug: result.slug,
      publishedAt: result.publishedAt,
      sendNewsletter: result.sendNewsletter,
      spanish: {title: result.spanishTitle ?? '', excerpt: result.spanishExcerpt ?? ''},
      english: {title: result.englishTitle ?? '', excerpt: result.englishExcerpt ?? ''},
    }
  } catch {
    throw new SanityError(undefined, false)
  }
}
