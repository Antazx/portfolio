import {safeHttpsUrl, type NewsletterEnvironment} from './core.ts'

export type NewsletterConfig = {
  enabled: boolean
  environment?: NewsletterEnvironment
  apiKey?: string
  segmentId?: string
  senderEmail?: string
  senderName?: string
  replyTo?: string
  alertTo?: string
  alertApiKey?: string
  alertSenderEmail?: string
  alertSenderName?: string
  siteOrigin?: string
  privacyEs?: string
  privacyEn?: string
  sanityProjectId?: string
  sanityDataset?: string
  webhookSecret?: string
  missing: string[]
}

const nonEmpty = (value: string | undefined) => value?.trim() || undefined
const numericId = (value: string | undefined) => value && /^\d+$/.test(value.trim()) && Number(value) > 0 ? value.trim() : undefined
const enabled = (value: string | undefined) => nonEmpty(value) === 'true'

export function getNewsletterConfig(env: Record<string, string | undefined> = process.env): NewsletterConfig {
  const mode = nonEmpty(env.PORTFOLIO_NEWSLETTER_MODE)
  if (mode !== 'test' && mode !== 'production') return {enabled: false, missing: mode === 'off' || !mode ? [] : ['PORTFOLIO_NEWSLETTER_MODE']}

  const environment = mode as NewsletterEnvironment
  const required: Record<string, string | undefined> = {
    PORTFOLIO_BREVO_NEWSLETTER_API_KEY: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_API_KEY),
    [environment === 'test' ? 'PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID' : 'PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID']:
      numericId(environment === 'test' ? env.PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID : env.PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID),
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL),
    PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME),
    PORTFOLIO_NEWSLETTER_REPLY_TO: nonEmpty(env.PORTFOLIO_NEWSLETTER_REPLY_TO),
    PUBLIC_SITE_URL: safeHttpsUrl(nonEmpty(env.PUBLIC_SITE_URL) ?? '')?.replace(/\/$/, ''),
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES: safeHttpsUrl(nonEmpty(env.PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES) ?? ''),
    PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN: safeHttpsUrl(nonEmpty(env.PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN) ?? ''),
    PUBLIC_SANITY_PROJECT_ID: nonEmpty(env.PUBLIC_SANITY_PROJECT_ID),
    PUBLIC_SANITY_DATASET: nonEmpty(env.PUBLIC_SANITY_DATASET),
    PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET: nonEmpty(env.PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET),
  }
  if (environment === 'production') {
    required.CONTEXT = env.CONTEXT === 'production' ? 'production' : undefined
    required.PORTFOLIO_BREVO_NEWSLETTER_LIST_ID = numericId(env.PORTFOLIO_BREVO_NEWSLETTER_LIST_ID)
    required.PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID = numericId(env.PORTFOLIO_BREVO_NEWSLETTER_TEST_LIST_ID)
    required.PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID = numericId(env.PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID)
    required.PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED = enabled(env.PORTFOLIO_NEWSLETTER_TEST_EVIDENCE_CONFIRMED) ? 'true' : undefined
    required.PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED = enabled(env.PORTFOLIO_NEWSLETTER_PRODUCTION_APPROVED) ? 'true' : undefined
  }
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key)
  return {
    enabled: missing.length === 0,
    environment,
    apiKey: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_API_KEY),
    segmentId: numericId(environment === 'test' ? env.PORTFOLIO_BREVO_NEWSLETTER_TEST_SEGMENT_ID : env.PORTFOLIO_BREVO_NEWSLETTER_SEGMENT_ID),
    senderEmail: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_SENDER_EMAIL),
    senderName: nonEmpty(env.PORTFOLIO_BREVO_NEWSLETTER_SENDER_NAME),
    replyTo: nonEmpty(env.PORTFOLIO_NEWSLETTER_REPLY_TO),
    alertTo: nonEmpty(env.PORTFOLIO_NEWSLETTER_ALERT_TO),
    alertApiKey: nonEmpty(env.PORTFOLIO_BREVO_CONTACT_API_KEY),
    alertSenderEmail: nonEmpty(env.PORTFOLIO_BREVO_CONTACT_SENDER_EMAIL),
    alertSenderName: nonEmpty(env.PORTFOLIO_BREVO_CONTACT_SENDER_NAME),
    siteOrigin: required.PUBLIC_SITE_URL,
    privacyEs: required.PORTFOLIO_NEWSLETTER_PRIVACY_URL_ES,
    privacyEn: required.PORTFOLIO_NEWSLETTER_PRIVACY_URL_EN,
    sanityProjectId: nonEmpty(env.PUBLIC_SANITY_PROJECT_ID),
    sanityDataset: nonEmpty(env.PUBLIC_SANITY_DATASET),
    webhookSecret: nonEmpty(env.PORTFOLIO_SANITY_NEWSLETTER_WEBHOOK_SECRET),
    missing,
  }
}
