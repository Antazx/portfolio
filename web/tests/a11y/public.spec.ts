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

    if (width === 375) {
      const headerRows = await page.evaluate(() => {
        const logo = document.querySelector('.wordmark')?.getBoundingClientRect()
        const utility = document.querySelector('.utility-group')?.getBoundingClientRect()
        const nav = document.querySelector('.nav-links')?.getBoundingClientRect()
        return {
          logoAndControlsShareRow: Boolean(logo && utility && logo.bottom > utility.top && utility.bottom > logo.top),
          navIsSecondRow: Boolean(logo && utility && nav && nav.top >= Math.max(logo.bottom, utility.bottom)),
        }
      })

      expect(headerRows).toEqual({logoAndControlsShareRow: true, navIsSecondRow: true})
    }
  }
})

test('theme preference persists across public navigation and reloads', async ({page}) => {
  await page.goto('/es/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.locator('[data-theme-toggle]').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const homeServerLink = page.locator('#proyecto .project-item').filter({hasText: 'Home Server'}).locator('a.project-link')
  await homeServerLink.click()
  await expect(page).toHaveURL('/es/blog/home-server/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Cambiar a tema oscuro')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.back-link').click()
  await expect(page).toHaveURL('/es/blog/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const homeServerPostLink = page.locator('.post-card').filter({hasText: 'Home Server'}).locator('a')
  await homeServerPostLink.click()
  await expect(page).toHaveURL('/es/blog/home-server/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.post-language a[lang="en"]').click()
  await expect(page).toHaveURL('/en/blog/home-server/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to dark theme')

  await page.locator('.wordmark').click()
  await expect(page).toHaveURL('/en/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.nav-links a[href="/en/blog/"]').click()
  await expect(page).toHaveURL('/en/blog/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.goto('/en/blog/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('.wordmark').click()
  await expect(page).toHaveURL('/en/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.locator('[data-theme-toggle]').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to light theme')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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

test('localized contact forms remain usable by keyboard, mobile, and without JavaScript', async ({page, browser}) => {
  await page.setViewportSize({width: 375, height: 800})

  for (const route of ['/es/', '/en/']) {
    await page.goto(route)
    const form = page.locator('[data-contact-form]')

    await expect(form).toBeVisible()
    await expect(form).toHaveAttribute('action', '/.netlify/functions/contact')
    await expect(form).toHaveAttribute('method', 'post')
    await expect(form.locator('.contact-field > label')).toHaveCount(4)
    await expect(form.locator('.contact-checkbox')).toHaveCount(1)
    await form.locator('input[name="name"]').focus()
    await expect(form.locator('input[name="name"]')).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  const context = await browser.newContext({javaScriptEnabled: false})
  const noScriptPage = await context.newPage()
  for (const route of ['/es/', '/en/']) {
    await noScriptPage.goto(route)
    const form = noScriptPage.locator('[data-contact-form]')
    await expect(form).toBeVisible()
    await expect(form.locator('input[name="privacy"]')).toHaveAttribute('required', '')
  }
  await context.close()
})

test('approved branding assets are used by localized layouts', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800})

  for (const route of await publicPaths(page)) {
    await page.goto(route)

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/gaa-favicon-final.png')
    await expect(page.locator('.wordmark')).toHaveAttribute('aria-label', 'Guillermo Anta Alonso')
    await expect(page.locator('.wordmark-image')).toHaveAttribute('src', /gaa-header-final\.png/)
    await expect(page.locator('.wordmark-image')).toHaveAttribute('alt', '')
  }
})

test('localized project and contact details keep the public rhythm', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800})

  for (const route of ['/es/', '/en/']) {
    await page.goto(route)

    const nupziProject = page.locator('#proyecto .project-item').filter({hasText: 'Nupzi'})
    const nupziLink = nupziProject.locator('a.project-link')

    await expect(nupziProject.locator('.project-status')).toHaveText('Beta')
    await expect(nupziProject.locator('img.project-link-icon')).toHaveAttribute('src', /favicon-ring\.png/)
    await expect(nupziProject.locator('img.project-link-icon')).toHaveAttribute('alt', '')
    await expect(nupziLink).toHaveText(route === '/es/' ? 'Visitar nupzi.com' : 'Visit nupzi.com')
    await expect(nupziLink).toHaveAttribute('target', '_blank')
    await expect(nupziLink).toHaveAttribute('rel', 'noreferrer')
    await expect(nupziProject.locator('.project-copy')).toHaveCSS('margin-bottom', '24px')

    const homeServerProject = page.locator('#proyecto .project-item').filter({hasText: 'Home Server'})
    const homeServerLink = homeServerProject.locator('a.project-link')

    await expect(homeServerLink).toHaveText(route === '/es/' ? 'Leer artículo' : 'Read article')
    await expect(homeServerLink).toHaveAttribute('href', route === '/es/' ? '/es/blog/home-server/' : '/en/blog/home-server/')
    await expect(homeServerLink).not.toHaveAttribute('target')
    await expect(homeServerProject.locator('img.project-link-icon')).toHaveCount(0)
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
