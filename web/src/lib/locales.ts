export const locales = ['es', 'en'] as const

export type Locale = (typeof locales)[number]

type SiteCopy = {
  navigationLabel: string
  languageLabel: string
  skipToContent: string
  homeLabel: string
  educationLabel: string
  blogLabel: string
  newsletterLabel: string
  contactLabel: string
  theme: {
    toLight: string
    toDark: string
  }
  social: {
    label: string
    linkedin: string
    github: string
  }
  footerRole: string
}

export const siteCopy: Record<Locale, SiteCopy> = {
  es: {
    navigationLabel: 'Navegación principal',
    languageLabel: 'Idioma',
    skipToContent: 'Saltar al contenido',
    homeLabel: 'Inicio',
    educationLabel: 'Estudios',
    blogLabel: 'Blog',
    newsletterLabel: 'Newsletter',
    contactLabel: 'Contacto',
    theme: {
      toLight: 'Cambiar a tema claro',
      toDark: 'Cambiar a tema oscuro',
    },
    social: {
      label: 'Redes sociales',
      linkedin: 'LinkedIn',
      github: 'GitHub',
    },
    footerRole: 'Senior Backend Engineer / Tech Lead',
  },
  en: {
    navigationLabel: 'Main navigation',
    languageLabel: 'Language',
    skipToContent: 'Skip to content',
    homeLabel: 'Home',
    educationLabel: 'Education',
    blogLabel: 'Blog',
    newsletterLabel: 'Newsletter',
    contactLabel: 'Contact',
    theme: {
      toLight: 'Switch to light theme',
      toDark: 'Switch to dark theme',
    },
    social: {
      label: 'Social links',
      linkedin: 'LinkedIn',
      github: 'GitHub',
    },
    footerRole: 'Senior Backend Engineer / Tech Lead',
  },
}

export function localizedPath(locale: Locale, path = '') {
  const suffix = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : ''
  return `/${locale}${suffix}/`
}
