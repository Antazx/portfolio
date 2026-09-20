import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import type {Page} from '@playwright/test'

async function publicPaths(page: Page) {
  const response = await page.request.get('/sitemap.xml')
  const xml = await response.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url, 'http://127.0.0.1:4321').pathname)
}

test('public HTML has no WCAG 2.2 A/AA violations', async ({page}) => {
  for (const route of await publicPaths(page)) {
    await page.goto(route)
    const results = await new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, `${route}: ${JSON.stringify(results.violations)}`).toEqual([])
  }
})

test('keyboard focus, themes, reduced motion, and responsive layout work', async ({page}) => {
  await page.goto('/es/')
  await page.keyboard.press('Tab')

  await expect(page.locator('.skip-link')).toBeFocused()
  await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px')

  await page.locator('[data-theme-toggle]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.emulateMedia({reducedMotion: 'reduce'})
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')

  for (const width of [375, 1280]) {
    await page.setViewportSize({width, height: 800})
    await page.goto('/es/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('navigation and content remain available with JavaScript disabled', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false})
  const page = await context.newPage()

  await page.goto('/es/')
  await expect(page.locator('h1')).toHaveText('Guillermo Anta Alonso')
  await expect(page.locator('a[href="/en/"]')).toBeVisible()
  await expect(page.locator('a[href="#experiencia"]')).toBeVisible()
  await expect(page.locator('main')).toBeVisible()

  await context.close()
})

test('approved branding assets are used by localized layouts', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800})

  for (const route of await publicPaths(page)) {
    await page.goto(route)

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/gaa-favicon-final.png')
    await expect(page.locator('.wordmark')).toHaveAttribute('aria-label', 'Guillermo Anta Alonso')
    await expect(page.locator('.wordmark-image')).toHaveAttribute('src', '/gaa-header-final.png')
    await expect(page.locator('.wordmark-image')).toHaveAttribute('alt', '')
  }
})

test('localized project and contact details keep the public rhythm', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800})

  for (const route of ['/es/', '/en/']) {
    await page.goto(route)

    const project = page.locator('#proyecto .project-item')
    const projectLink = project.locator('a.project-link')

    await expect(project.locator('.project-status')).toHaveText('Beta')
    await expect(project.locator('img.project-link-icon')).toHaveAttribute('src', '/favicon-ring.png')
    await expect(project.locator('img.project-link-icon')).toHaveAttribute('alt', '')
    await expect(projectLink).toHaveText(route === '/es/' ? 'Visitar nupzi.com' : 'Visit nupzi.com')
    await expect(projectLink).toHaveAttribute('target', '_blank')
    await expect(projectLink).toHaveAttribute('rel', 'noreferrer')
    await expect(project.locator('.project-copy')).toHaveCSS('margin-bottom', '24px')
    await expect(page.locator('#contacto .contact-copy-block')).toHaveCSS('gap', '16px')
    const contactColumns = await page.locator('#contacto .contact-layout').evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)
    expect(contactColumns).toBe(1)
  }
})

test('portable text lists keep their markers', async ({page}) => {
  await page.goto('/es/blog/home-server/')

  const list = page.locator('.portable-text ul').first()
  await expect(list.locator('li').first()).toBeVisible()
  await expect(list).toHaveCSS('list-style-type', 'disc')
})

test('discovery endpoints expose the public contract', async ({request}) => {
  const [robots, llms, sitemap] = await Promise.all([
    request.get('/robots.txt'),
    request.get('/llms.txt'),
    request.get('/sitemap.xml'),
  ])

  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain('Sitemap:')
  expect(llms.ok()).toBe(true)
  expect(await llms.text()).toContain('Guillermo Anta Alonso')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain('<urlset')
})
