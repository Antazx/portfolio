import type {NewsletterConfig} from './config.ts'
import type {LocalizedPost} from './core.ts'

export type PublicCheck = {available: true; urls: {es: string; en: string}} | {available: false; transient: boolean; reason: string}

function expectedUrl(origin: string, locale: 'es' | 'en', slug: string) {
  return new URL(`/${locale}/blog/${encodeURIComponent(slug)}/`, `${origin}/`).toString()
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return match?.[1]
}

function canonical(html: string) {
  const tag = html.match(/<link\b[^>]*\brel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0]
  return tag ? attribute(tag, 'href') : undefined
}

function containsText(html: string, text: string) {
  const escaped = text.replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character] ?? character))
  return html.includes(escaped) || html.includes(text)
}

async function checkPage(url: string, locale: 'es' | 'en', post: LocalizedPost, fetcher: typeof fetch) {
  let response: Response
  try {
    response = await fetcher(url, {redirect: 'manual'})
  } catch {
    return {available: false as const, transient: true, reason: 'public_network'}
  }
  if (response.status >= 300 && response.status < 400) return {available: false as const, transient: true, reason: 'public_redirect'}
  if (response.status !== 200) return {available: false as const, transient: response.status >= 500 || response.status === 429, reason: `public_http_${response.status}`}
  let html: string
  try {
    html = (await response.text()).slice(0, 512_000)
  } catch {
    return {available: false as const, transient: true, reason: 'public_read'}
  }
  const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
  const content = post[locale === 'es' ? 'spanish' : 'english']
  if (lang !== locale || canonical(html) !== url || !containsText(html, content.title) || !containsText(html, content.excerpt)) {
    return {available: false as const, transient: true, reason: 'public_content_not_ready'}
  }
  return {available: true as const}
}

export async function checkPublicPost(post: LocalizedPost, config: NewsletterConfig, fetcher: typeof fetch = fetch): Promise<PublicCheck> {
  if (!config.siteOrigin) return {available: false, transient: false, reason: 'site_origin_missing'}
  const urls = {es: expectedUrl(config.siteOrigin, 'es', post.slug), en: expectedUrl(config.siteOrigin, 'en', post.slug)}
  for (const locale of ['es', 'en'] as const) {
    const result = await checkPage(urls[locale], locale, post, fetcher)
    if (!result.available) return result
  }
  return {available: true, urls}
}
