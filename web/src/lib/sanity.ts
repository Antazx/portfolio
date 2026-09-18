import {sanityClient} from 'sanity:client'
import {defineQuery} from 'groq'

export const postSlugsQuery = defineQuery(
  `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`
)

export const postsQuery = defineQuery(
  `*[_type == "post" && defined(slug.current)] | order(_createdAt desc){ _id, title, slug }`
)

export const postQuery = defineQuery(
  `*[_type == "post" && slug.current == $slug][0]{ _id, title, slug, body }`
)

export {sanityClient}
