import {defineArrayMember, defineField, defineType} from 'sanity'

const articleImage = defineArrayMember({
  name: 'articleImage',
  title: 'Article image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      validation: (rule) => rule.required().max(180),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      validation: (rule) => rule.max(240),
    }),
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'string',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'creditUrl',
      title: 'Credit URL',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
  ],
  preview: {
    select: {
      title: 'caption',
      subtitle: 'credit',
      media: 'image',
    },
    prepare({title, subtitle, media}) {
      return {
        title: title || 'Article image',
        subtitle: subtitle || 'Alternative text required',
        media,
      }
    },
  },
})

const localizedFields = (language: string) => [
  defineField({
    name: 'title',
    title: `Title (${language})`,
    type: 'string',
    validation: (rule) => rule.required().max(120),
  }),
  defineField({
    name: 'excerpt',
    title: `Summary (${language})`,
    type: 'text',
    rows: 3,
    validation: (rule) => rule.required().max(280),
  }),
  defineField({
    name: 'body',
    title: `Body (${language})`,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        marks: {
          annotations: [
            defineField({
              name: 'link',
              title: 'Link',
              type: 'object',
              fields: [
                defineField({
                  name: 'href',
                  title: 'URL',
                  type: 'url',
                  validation: (rule) => rule.uri({scheme: ['http', 'https']}),
                }),
              ],
            }),
          ],
        },
      }),
      articleImage,
    ],
    validation: (rule) => rule.required().min(1),
  }),
]

export const post = defineType({
  name: 'post',
  title: 'Publication',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Stable slug',
      type: 'slug',
      options: {source: 'spanish.title'},
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return 'Required'
          return /^[a-z0-9-]+$/.test(slug.current) ? true : 'Use lowercase letters, numbers and hyphens'
        }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication date',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sendNewsletter',
      title: 'Send in newsletter',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'spanish',
      title: 'Castellano',
      type: 'object',
      fields: localizedFields('Spanish'),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'english',
      title: 'English',
      type: 'object',
      fields: localizedFields('English'),
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'spanish.title',
      subtitle: 'english.title',
      publishedAt: 'publishedAt',
    },
    prepare({title, subtitle, publishedAt}) {
      return {
        title: title || 'Untitled publication',
        subtitle: `${subtitle || 'Missing English title'}${publishedAt ? ` · ${publishedAt}` : ''}`,
      }
    },
  },
})
