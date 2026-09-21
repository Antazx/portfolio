function cleanOrigin(candidate) {
  const url = new URL(candidate)
  if (url.protocol !== 'https:') throw new Error('PUBLIC_SITE_URL debe usar HTTPS')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function expectedUrl(origin, locale, slug) {
  return `${origin}/${locale}/blog/${encodeURIComponent(slug)}/`
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
}

function canonical(html) {
  const tag = html.match(/<link\b[^>]*\brel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0]
  return tag ? attribute(tag, 'href') : undefined
}

export async function verifyNewsletterPublic({origin, slug, fetcher = fetch}) {
  const safeOrigin = cleanOrigin(origin)
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('PORTFOLIO_NEWSLETTER_VERIFY_SLUG no es válido')
  const results = []
  for (const locale of ['es', 'en']) {
    const url = expectedUrl(safeOrigin, locale, slug)
    let response
    try {
      response = await fetcher(url, {redirect: 'manual'})
    } catch {
      throw new Error(`${url}: no se pudo consultar la ruta pública`)
    }
    if (response.status !== 200) throw new Error(`${url}: se esperaba HTTP 200 y se recibió ${response.status}`)
    const html = await response.text()
    const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (lang !== locale) throw new Error(`${url}: lang=${lang ?? 'ausente'}, esperado ${locale}`)
    if (canonical(html) !== url) throw new Error(`${url}: canonical distinto de la ruta comprobada`)
    results.push({locale, url, status: response.status})
  }
  return {origin: safeOrigin, slug, results}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const origin = process.env.PUBLIC_SITE_URL
  const slug = process.env.PORTFOLIO_NEWSLETTER_VERIFY_SLUG
  if (!origin || !slug) throw new Error('PUBLIC_SITE_URL y PORTFOLIO_NEWSLETTER_VERIFY_SLUG son obligatorios')
  const result = await verifyNewsletterPublic({origin, slug})
  for (const route of result.results) console.log(`${route.locale} ${route.status} ${route.url}`)
  console.log(`Public newsletter routes passed for ${result.origin}`)
}
