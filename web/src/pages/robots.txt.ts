import {absoluteUrl} from '../lib/seo'

export function GET() {
  const sitemap = absoluteUrl('/sitemap.xml') ?? '/sitemap.xml'
  const body = ['User-agent: *', 'Allow: /', `Sitemap: ${sitemap}`, ''].join('\n')

  return new Response(body, {headers: {'Content-Type': 'text/plain; charset=utf-8'}})
}
