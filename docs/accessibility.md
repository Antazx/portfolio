# Accessibility evidence

The automated audit runs against the built site:

```sh
pnpm audit:a11y
```

It scans every URL listed by `sitemap.xml` with axe-core WCAG 2.2 A/AA rules and checks keyboard focus, both themes, reduced motion, responsive overflow, JavaScript-disabled HTML, and discovery endpoints.

Manual review checklist:

- [x] Tab from the document start reaches the skip link and every primary control has visible focus.
- [x] Primary navigation, language links, theme control, external links, and mail links have understandable names.
- [x] Each public page has one main landmark and an ordered heading hierarchy.
- [x] Dark and light themes preserve readable text, borders, focus, and target sizes.
- [x] Reduced motion disables smooth scrolling and transition movement.
- [x] The generated HTML contains the portfolio and blog empty state without JavaScript.
- [x] The responsive layout was checked at 375px and desktop width with no horizontal overflow.

Known exceptions: none recorded. A production check is still required after deployment because browser, CDN, and real Sanity content can add states not present in the local dataset.
