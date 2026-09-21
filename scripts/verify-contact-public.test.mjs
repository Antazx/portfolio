import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyContactPublic} from './verify-contact-public.mjs'

const html = (locale) => `<html lang="${locale}"><form action="/.netlify/functions/contact" method="post"><input type="hidden" name="locale" value="${locale}"><input name="name"><input name="email"><textarea name="message"></textarea><input name="privacy" type="checkbox"></form>`

test('checks both localized routes and the native contact contract', async () => {
  const requested = []
  const result = await verifyContactPublic({
    siteUrl: 'https://portfolio.example',
    fetchImpl: async (url, options) => {
      requested.push({url: String(url), options})
      return new Response(html(new URL(url).pathname.split('/')[1]), {status: 200})
    },
  })

  assert.deepEqual(result.checkedRoutes, ['/es/', '/en/'])
  assert.deepEqual(requested.map(({url}) => url), ['https://portfolio.example/es/', 'https://portfolio.example/en/'])
  assert.deepEqual(requested.map(({options}) => options.redirect), ['manual', 'manual'])
})

test('rejects redirects and insecure origins', async () => {
  await assert.rejects(
    verifyContactPublic({siteUrl: 'http://portfolio.example', fetchImpl: async () => new Response('', {status: 200})}),
    /HTTPS/,
  )
  await assert.rejects(
    verifyContactPublic({siteUrl: 'https://portfolio.example', fetchImpl: async () => new Response('', {status: 302, headers: {location: '/es/'}})}),
    /redirecciones/,
  )
})

test('reports missing form fields', async () => {
  await assert.rejects(
    verifyContactPublic({siteUrl: 'https://portfolio.example', fetchImpl: async () => new Response('<html lang="es"></html>', {status: 200})}),
    /faltan/,
  )
})
