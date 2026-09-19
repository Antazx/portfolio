const configuredOrigin = process.env.PUBLIC_SITE_URL

if (!configuredOrigin) {
  throw new Error('PUBLIC_SITE_URL is required to verify production')
}

const origin = new URL(configuredOrigin).origin
const checks = [
  {path: '/', status: [301, 302, 307, 308], location: '/es/'},
  {path: '/es/', status: [200], includes: ['<html lang="es"', '<main']},
  {path: '/en/', status: [200], includes: ['<html lang="en"', '<main']},
  {path: '/es/blog/', status: [200], includes: ['<html lang="es"', 'Blog']},
  {path: '/en/blog/', status: [200], includes: ['<html lang="en"', 'Blog']},
  {path: '/sitemap.xml', status: [200], includes: [`${origin}/es/`, `${origin}/en/`]},
  {path: '/robots.txt', status: [200], includes: [`Sitemap: ${origin}/sitemap.xml`]},
  {path: '/llms.txt', status: [200], includes: ['Guillermo Anta Alonso', `${origin}/es/`]},
]

for (const check of checks) {
  const response = await fetch(new URL(check.path, origin), {redirect: 'manual'})
  const body = await response.text()

  if (!check.status.includes(response.status)) {
    throw new Error(`${check.path}: expected ${check.status.join('/')} got ${response.status}`)
  }

  if (check.location) {
    const location = response.headers.get('location')
    if (!location || new URL(location, origin).pathname !== check.location) {
      throw new Error(`${check.path}: expected Location ${check.location} got ${location ?? 'missing'}`)
    }
  }

  for (const value of check.includes ?? []) {
    if (!body.includes(value)) throw new Error(`${check.path}: missing ${value}`)
  }

  console.log(`${check.path} ${response.status}`)
}

console.log(`Production checks passed for ${origin}`)
