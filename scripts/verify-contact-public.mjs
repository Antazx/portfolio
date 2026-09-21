const locales = ['es', 'en']
const requiredFields = ['name', 'email', 'message', 'privacy']

function publicUrl(siteUrl, locale) {
  const origin = new URL(siteUrl)
  if (origin.protocol !== 'https:') throw new Error('PUBLIC_SITE_URL debe usar HTTPS')
  return new URL(`/${locale}/`, origin)
}

function assertPublicContactForm(html, locale) {
  const checks = [
    [`<html lang="${locale}"`, 'idioma de la página'],
    ['action="/.netlify/functions/contact"', 'action del formulario'],
    ['method="post"', 'método POST'],
    [`name="locale" value="${locale}"`, 'locale del formulario'],
    ...requiredFields.map((field) => [`name="${field}"`, `campo ${field}`]),
  ]
  const missing = checks.filter(([needle]) => !html.includes(needle)).map(([, label]) => label)
  if (missing.length > 0) throw new Error(`${locale}: faltan ${missing.join(', ')}`)
}

export async function verifyContactPublic({siteUrl, fetchImpl = fetch} = {}) {
  if (!siteUrl) throw new Error('Falta PUBLIC_SITE_URL')

  const checkedRoutes = []
  for (const locale of locales) {
    const url = publicUrl(siteUrl, locale)
    const response = await fetchImpl(url, {redirect: 'manual'})
    if (response.status >= 300 && response.status < 400) throw new Error(`${locale}: no se admiten redirecciones`)
    if (!response.ok) throw new Error(`${locale}: HTTP ${response.status}`)
    assertPublicContactForm(await response.text(), locale)
    checkedRoutes.push(url.pathname)
  }

  return {status: 'ok', checkedRoutes}
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await verifyContactPublic({siteUrl: process.env.PUBLIC_SITE_URL})
    console.log(`Contacto público: ${result.status}`)
    for (const route of result.checkedRoutes) console.log(`PASS ${route}`)
  } catch (error) {
    console.error(`Contacto público: bloqueado (${error instanceof Error ? error.message : 'error desconocido'})`)
    process.exitCode = 1
  }
}
