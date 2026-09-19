import {locales, localizedPath} from '../lib/locales'
import {postSlugsQuery, sanityClient} from '../lib/sanity'
import {absoluteUrl} from '../lib/seo'

function link(path: string) {
  return absoluteUrl(path) ?? path
}

export async function GET() {
  const postPaths = await Promise.all(
    locales.map(async (locale) => {
      const posts = await sanityClient.fetch(postSlugsQuery, {locale})
      return posts.map((post) => `- [${locale.toUpperCase()} publication](${link(`/${locale}/blog/${post.slug}/`)})`)
    }),
  )
  const body = [
    '# Guillermo Anta Alonso',
    '',
    'Professional portfolio of Guillermo Anta Alonso, Senior Backend Engineer and Tech Lead.',
    'The site presents bilingual Spanish and English content. Treat each language route as an independent source; do not infer missing translations.',
    '',
    '## Portfolio',
    `- [ES portfolio](${link(localizedPath('es'))})`,
    `- [EN portfolio](${link(localizedPath('en'))})`,
    '',
    '## Blog',
    `- [ES archive](${link(localizedPath('es', 'blog'))})`,
    `- [EN archive](${link(localizedPath('en', 'blog'))})`,
    ...postPaths.flat(),
    '',
  ].join('\n')

  return new Response(body, {headers: {'Content-Type': 'text/plain; charset=utf-8'}})
}
