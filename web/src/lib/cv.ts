import type {Locale} from './locales'

export const cvAssets = {
  es: {
    href: '/cv-guillermo-anta-alonso-es.pdf',
    filename: 'Guillermo-Anta-Alonso-CV-ES.pdf',
  },
  en: {
    href: '/cv-guillermo-anta-alonso-en.pdf',
    filename: 'Guillermo-Anta-Alonso-CV-EN.pdf',
  },
} satisfies Record<Locale, {href: string; filename: string}>

export function cvAsset(locale: Locale) {
  return cvAssets[locale]
}
