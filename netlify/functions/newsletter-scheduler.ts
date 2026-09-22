import {runNewsletterScheduler} from './newsletter/process.ts'

export default async function handler() {
  const result = await runNewsletterScheduler()
  return Response.json(result, {status: result.status === 'disabled' ? 202 : 200})
}

export const config = {schedule: '*/5 * * * *'}
