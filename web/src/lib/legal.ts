export const legalPaths = {
  es: {
    privacy: '/es/privacidad/',
    legalNotice: '/es/aviso-legal/',
  },
  en: {
    privacy: '/en/privacy/',
    legalNotice: '/en/legal-notice/',
  },
} as const

export type LegalDocument = keyof typeof legalPaths.es
