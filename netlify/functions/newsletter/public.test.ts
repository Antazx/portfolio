import test from 'node:test'
import assert from 'node:assert/strict'
import {checkPublicPost} from './public.ts'

const post = {
  _id: 'post-1',
  slug: 'mi-publicacion',
  publishedAt: '2026-09-20T10:00:00.000Z',
  sendNewsletter: true,
  spanish: {title: 'Título', excerpt: 'Resumen ES'},
  english: {title: 'Title', excerpt: 'EN summary'},
}
const config = {enabled: true, environment: 'test' as const, siteOrigin: 'https://portfolio.example', missing: []}

test('public availability requires 200, exact canonical, language and editorial text in both routes', async () => {
  const fetcher = async (input: RequestInfo | URL) => {
    const url = String(input)
    const locale = url.includes('/en/') ? 'en' : 'es'
    const content = locale === 'es' ? post.spanish : post.english
    return new Response(`<html lang="${locale}"><head><link rel="canonical" href="${url}"></head><body><h1>${content.title}</h1><p>${content.excerpt}</p></body></html>`, {status: 200, headers: {'content-type': 'text/html'}})
  }
  const result = await checkPublicPost(post, config, fetcher)
  assert.deepEqual(result, {
    available: true,
    urls: {
      es: 'https://portfolio.example/es/blog/mi-publicacion/',
      en: 'https://portfolio.example/en/blog/mi-publicacion/',
    },
  })
})

test('redirects and missing published content keep the job waiting', async () => {
  const redirect = await checkPublicPost(post, config, async () => new Response(null, {status: 301, headers: {location: 'https://portfolio.example/'}}))
  assert.deepEqual(redirect, {available: false, transient: true, reason: 'public_redirect'})

  const missingText = await checkPublicPost(post, config, async (input) => new Response(`<html lang="es"><head><link rel="canonical" href="${String(input)}"></head></html>`, {status: 200}))
  assert.deepEqual(missingText, {available: false, transient: true, reason: 'public_content_not_ready'})
})
