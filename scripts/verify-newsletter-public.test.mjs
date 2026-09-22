import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNewsletterPublic} from './verify-newsletter-public.mjs'

test('public verification checks both localized routes without following redirects', async () => {
  const result = await verifyNewsletterPublic({
    origin: 'https://portfolio.example/',
    slug: 'publicacion',
    fetcher: async (input, options) => {
      assert.equal(options.redirect, 'manual')
      const url = String(input)
      const locale = url.includes('/en/') ? 'en' : 'es'
      return new Response(`<html lang="${locale}"><head><link rel="canonical" href="${url}"></head></html>`, {status: 200})
    },
  })
  assert.deepEqual(result.results.map(({locale, status}) => ({locale, status})), [
    {locale: 'es', status: 200},
    {locale: 'en', status: 200},
  ])
})

test('public verification rejects redirects, wrong language and wrong canonical', async () => {
  await assert.rejects(
    verifyNewsletterPublic({
      origin: 'https://portfolio.example',
      slug: 'publicacion',
      fetcher: async () => new Response(null, {status: 301}),
    }),
    /HTTP 200/,
  )
  await assert.rejects(
    verifyNewsletterPublic({
      origin: 'https://portfolio.example',
      slug: 'publicacion',
      fetcher: async (input) => new Response(`<html lang="en"><head><link rel="canonical" href="${String(input)}"></head></html>`, {status: 200}),
    }),
    /lang=en, esperado es/,
  )
  await assert.rejects(
    verifyNewsletterPublic({
      origin: 'https://portfolio.example',
      slug: 'publicacion',
      fetcher: async () => new Response('<html lang="es"><head><link rel="canonical" href="https://portfolio.example/"></head></html>', {status: 200}),
    }),
    /canonical distinto/,
  )
})
