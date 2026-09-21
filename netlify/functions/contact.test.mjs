import {test} from 'node:test'
import assert from 'node:assert/strict'

import {createContactHandler} from './contact.mjs'

const baseEnv = {
  PORTFOLIO_CONTACT_MODE: 'test',
  PORTFOLIO_BREVO_CONTACT_API_KEY: 'test-key',
  PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL: 'hello@example.com',
  PORTFOLIO_BREVO_CONTACT_SENDER_NAME: 'Portfolio',
  PORTFOLIO_CONTACT_TEST_TO: 'test-recipient@example.com',
  PUBLIC_SITE_URL: 'https://portfolio.example.com',
}

function event(values = {}, headers = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://portfolio.example.com',
      ...headers,
    },
    body: new URLSearchParams({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'I would like to discuss a backend project.',
      locale: 'en',
      privacy: 'on',
      ...values,
    }).toString(),
  }
}

function responseBody(response) {
  return JSON.parse(response.body)
}

function successfulBrevoFetch(calls) {
  return async (url, options) => {
    calls.push({url, options, payload: JSON.parse(options.body)})
    return new Response(JSON.stringify({messageId: '<test-message-id>'}), {status: 201})
  }
}

test('accepts only POST form submissions', async () => {
  let calls = 0
  const handler = createContactHandler({
    env: baseEnv,
    fetchImpl: async () => {
      calls += 1
      return new Response('{}', {status: 201})
    },
  })

  const getResponse = await handler({...event(), httpMethod: 'GET'})
  const jsonResponse = await handler(event({}, {'content-type': 'application/json'}))

  assert.equal(getResponse.statusCode, 405)
  assert.equal(responseBody(jsonResponse).code, 'unsupported_media_type')
  assert.equal(calls, 0)
})

test('accepts a valid contact message and sends only to the server destination', async () => {
  const calls = []
  const handler = createContactHandler({env: baseEnv, fetchImpl: successfulBrevoFetch(calls), rateLimiter: async () => ({allowed: true})})

  const response = await handler(event({to: 'attacker@example.com', cc: 'attacker@example.com'}), {ip: '203.0.113.10'})
  const body = responseBody(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.code, 'sent')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(calls[0].options.headers['api-key'], 'test-key')
  assert.deepEqual(calls[0].payload.to, [{email: 'test-recipient@example.com'}])
  assert.deepEqual(calls[0].payload.replyTo, {email: 'ada@example.com', name: 'Ada Lovelace'})
  assert.equal(calls[0].payload.cc, undefined)
  assert.match(calls[0].payload.textContent, /I would like to discuss/)
})

test('rejects invalid fields, missing privacy and header injection without calling Brevo', async () => {
  let calls = 0
  const handler = createContactHandler({
    env: baseEnv,
    fetchImpl: async () => {
      calls += 1
      return new Response('{}', {status: 201})
    },
    rateLimiter: async () => ({allowed: true}),
  })

  const response = await handler(event({name: 'Bad\r\nBcc: evil@example.com', email: 'invalid', message: 'short', privacy: '', locale: 'fr'}))
  const body = responseBody(response)

  assert.equal(response.statusCode, 400)
  assert.equal(body.code, 'validation_error')
  assert.deepEqual(Object.keys(body.fields).sort(), ['email', 'locale', 'message', 'name', 'privacy'])
  assert.equal(calls, 0)
})

test('rejects foreign and missing origins', async () => {
  const handler = createContactHandler({env: baseEnv, fetchImpl: async () => new Response('{}', {status: 201})})

  const foreign = await handler(event({}, {origin: 'https://attacker.example'}))
  const missing = await handler(event({}, {origin: '', referer: ''}))

  assert.equal(foreign.statusCode, 403)
  assert.equal(responseBody(foreign).code, 'invalid_origin')
  assert.equal(missing.statusCode, 403)
})

test('rejects oversized bodies and honeypot submissions before delivery', async () => {
  let calls = 0
  const handler = createContactHandler({
    env: baseEnv,
    fetchImpl: async () => {
      calls += 1
      return new Response('{}', {status: 201})
    },
    rateLimiter: async () => ({allowed: true}),
  })

  const oversized = await handler(event({message: 'x'.repeat(5001)}))
  const honeypot = await handler(event({website: 'https://bot.example'}))
  const bodyLimit = await handler(event({}, {'content-length': String(16 * 1024 + 1)}))

  assert.equal(oversized.statusCode, 400)
  assert.equal(responseBody(honeypot).code, 'validation_error')
  assert.equal(bodyLimit.statusCode, 413)
  assert.equal(calls, 0)
})

test('returns 429 without delivery when the abuse limiter rejects the request', async () => {
  let calls = 0
  const handler = createContactHandler({
    env: baseEnv,
    fetchImpl: async () => {
      calls += 1
      return new Response('{}', {status: 201})
    },
    rateLimiter: async () => ({allowed: false, retryAfterSeconds: 42}),
  })

  const response = await handler(event(), {ip: '203.0.113.10'})

  assert.equal(response.statusCode, 429)
  assert.equal(response.headers['retry-after'], '42')
  assert.equal(calls, 0)
})

test('keeps production disabled until the real rate-limit control is verified', async () => {
  const handler = createContactHandler({
    env: {...baseEnv, CONTEXT: 'production', PORTFOLIO_CONTACT_MODE: 'production', PORTFOLIO_CONTACT_TO: 'guillermoantataz@gmail.com'},
    fetchImpl: async () => {
      throw new Error('must not be called')
    },
  })

  const response = await handler(event())

  assert.equal(response.statusCode, 503)
  assert.equal(responseBody(response).code, 'contact_rate_limit_not_configured')
})

test('does not retry or report success when Brevo result is ambiguous', async () => {
  let calls = 0
  const handler = createContactHandler({
    env: baseEnv,
    fetchImpl: async () => {
      calls += 1
      throw new Error('timeout')
    },
    rateLimiter: async () => ({allowed: true}),
  })

  const response = await handler(event())
  const body = responseBody(response)

  assert.equal(response.statusCode, 502)
  assert.equal(body.code, 'provider_unknown')
  assert.equal(calls, 1)
})

test('supports a localized native form response without putting the message in the URL', async () => {
  const handler = createContactHandler({env: baseEnv, fetchImpl: async () => new Response('{}', {status: 201})})
  const response = await handler(event({locale: 'es', name: '<script>alert(1)</script>', email: 'invalid'}, {accept: 'text/html'}))

  assert.equal(response.statusCode, 400)
  assert.match(response.headers['content-type'], /^text\/html/)
  assert.match(response.body, /<form action="\/.netlify\/functions\/contact" method="post">/)
  assert.match(response.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(response.body, /<script>alert\(1\)<\/script>/)
  assert.match(response.body, /I would like to discuss a backend project/)
})

test('never calls a marketing endpoint for an email that may already be subscribed', async () => {
  const calls = []
  const handler = createContactHandler({env: baseEnv, fetchImpl: successfulBrevoFetch(calls), rateLimiter: async () => ({allowed: true})})

  await handler(event({email: 'existing-subscriber@example.com'}), {ip: '203.0.113.11'})

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(calls[0].payload.attributes, undefined)
  assert.equal(calls[0].payload.listIds, undefined)
})
