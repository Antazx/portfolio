import type {Locale} from './locales'

type NewsletterMode = 'off' | 'test' | 'production'

export type NewsletterSignupConfig = {
  enabled: boolean
  formUrl?: string
}

const mode = (import.meta.env.PORTFOLIO_NEWSLETTER_MODE ?? 'off').trim() as NewsletterMode
const signupEnabled = import.meta.env.PORTFOLIO_NEWSLETTER_SIGNUP_ENABLED === 'true'
const testListId = (import.meta.env.PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID ?? '').trim()
const formUrls: Record<Locale, string> = {
  es: (import.meta.env.PORTFOLIO_NEWSLETTER_FORM_URL_ES ?? '').trim(),
  en: (import.meta.env.PORTFOLIO_NEWSLETTER_FORM_URL_EN ?? '').trim(),
}

function isBrevoFormUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (
      url.hostname === 'sibforms.com' ||
      url.hostname.endsWith('.sibforms.com') ||
      url.hostname === 'brevo.com' ||
      url.hostname.endsWith('.brevo.com') ||
      url.hostname === 'sendinblue.com' ||
      url.hostname.endsWith('.sendinblue.com')
    )
  } catch {
    return false
  }
}

const hasTestResources = mode === 'test' && signupEnabled && Boolean(testListId) && Object.values(formUrls).every(isBrevoFormUrl)

export function newsletterSignupConfig(locale: Locale): NewsletterSignupConfig {
  if (!hasTestResources) return {enabled: false}

  return {enabled: true, formUrl: formUrls[locale]}
}
