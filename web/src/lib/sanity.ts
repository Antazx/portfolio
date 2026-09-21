import {sanityClient} from 'sanity:client'
import {defineQuery} from 'groq'

export const postSlugsQuery = defineQuery(
  `*[
    _type == "post" &&
    !(_id in path("drafts.**")) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    defined(slug.current) &&
    (
      ($locale == "es" && defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0) ||
      ($locale == "en" && defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0)
    )
  ]{ "slug": slug.current }`
)

export const postsQuery = defineQuery(
  `*[
    _type == "post" &&
    !(_id in path("drafts.**")) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    defined(slug.current) &&
    (
      ($locale == "es" && defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0) ||
      ($locale == "en" && defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0)
    )
  ] | order(publishedAt desc){
    _id,
    "slug": slug.current,
    "title": select($locale == "es" => spanish.title, $locale == "en" => english.title),
    "excerpt": select($locale == "es" => spanish.excerpt, $locale == "en" => english.excerpt),
    publishedAt,
    "hasSpanish": defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0,
    "hasEnglish": defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0
  }`
)

export const postQuery = defineQuery(
  `*[
    _type == "post" &&
    !(_id in path("drafts.**")) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    slug.current == $slug &&
    (
      ($locale == "es" && defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0) ||
      ($locale == "en" && defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0)
    )
  ][0]{
    _id,
    "slug": slug.current,
    "title": select($locale == "es" => spanish.title, $locale == "en" => english.title),
    "excerpt": select($locale == "es" => spanish.excerpt, $locale == "en" => english.excerpt),
    "body": select($locale == "es" => spanish.body, $locale == "en" => english.body)[]{
      ...,
      _type == "articleImage" => {
        ...,
        image {
          ...,
          "dimensions": asset->metadata.dimensions
        }
      }
    },
    publishedAt,
    "hasSpanish": defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0,
    "hasEnglish": defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0
  }`
)

export const newsletterPostQuery = defineQuery(
  `*[
    _type == "post" &&
    !(_id in path("drafts.**")) &&
    _id == $postId &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    defined(slug.current) &&
    sendNewsletter == true &&
    defined(spanish.title) && defined(spanish.excerpt) && defined(spanish.body) && count(spanish.body) > 0 &&
    defined(english.title) && defined(english.excerpt) && defined(english.body) && count(english.body) > 0
  ][0]{
    _id,
    "slug": slug.current,
    publishedAt,
    "sendNewsletter": coalesce(sendNewsletter, false),
    "spanishTitle": spanish.title,
    "spanishExcerpt": spanish.excerpt,
    "englishTitle": english.title,
    "englishExcerpt": english.excerpt
  }`,
)

export {sanityClient}
