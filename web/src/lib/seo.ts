import type {Locale} from './locales'

const configuredOrigin = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')

export const siteOrigin = configuredOrigin ? new URL(configuredOrigin).origin : undefined

export function absoluteUrl(path: string) {
  return siteOrigin ? new URL(path, `${siteOrigin}/`).toString() : undefined
}

export function localeTag(locale: Locale) {
  return locale === 'es' ? 'es_ES' : 'en_US'
}

export function serializeJsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
