import {locales, localizedPath} from '../lib/locales'
import {postSlugsQuery, sanityClient} from '../lib/sanity'
import {absoluteUrl} from '../lib/seo'

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character)
}

export async function GET() {
  const postPaths = await Promise.all(
    locales.map(async (locale) => {
      const posts = await sanityClient.fetch(postSlugsQuery, {locale})
      return posts.map((post) => `/${locale}/blog/${post.slug}/`)
    }),
  )
  const paths = [
    ...locales.map((locale) => localizedPath(locale)),
    ...locales.map((locale) => localizedPath(locale, 'blog')),
    ...postPaths.flat(),
  ]
  const urls = [...new Set(paths)].map((path) => absoluteUrl(path) ?? path)
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
  ].join('\n')

  return new Response(body, {headers: {'Content-Type': 'application/xml; charset=utf-8'}})
}
