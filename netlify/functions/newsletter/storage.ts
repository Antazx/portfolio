import {getStore} from '@netlify/blobs'
import type {NewsletterEnvironment} from './core.ts'

export type NewsletterStore = {
  getWithMetadata: (key: string, options?: {type?: 'json'; consistency?: 'strong' | 'eventual'}) => Promise<{data: unknown; etag?: string} | null>
  setJSON: (key: string, data: unknown, options?: {onlyIfNew?: boolean; onlyIfMatch?: string}) => Promise<{modified: boolean; etag?: string}>
  list: (options?: {prefix?: string}) => Promise<{blobs: Array<{key: string; etag: string}>; directories: string[]}>
}

export function getNewsletterStore(environment: NewsletterEnvironment): NewsletterStore {
  return getStore({name: `portfolio-newsletter-${environment}`, consistency: 'strong'}) as unknown as NewsletterStore
}
