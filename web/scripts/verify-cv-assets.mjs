import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))
const files = [
  'cv-guillermo-anta-alonso-es.pdf',
  'cv-guillermo-anta-alonso-en.pdf',
]
const missing = files.filter((file) => !existsSync(`${publicDirectory}${file}`))

if (missing.length) {
  throw new Error(`Missing CV assets: ${missing.join(', ')}`)
}

console.log(`CV assets verified: ${files.join(', ')}`)
