import { expect, test } from "bun:test"
import { isAllowed, parseRobots } from "../.opencode/lib/robots"

const robots = (text: string) => parseRobots(text)

test("longest matching rule wins, not the first one", () => {
  const r = robots(`
User-agent: *
Disallow: /admin
Allow: /admin/public
`)
  expect(isAllowed(r, "/admin/secret")).toBe(false)
  expect(isAllowed(r, "/admin/public/page")).toBe(true)
})

test("an equal-length tie goes to Allow", () => {
  const r = robots(`
User-agent: *
Disallow: /page
Allow: /page
`)
  expect(isAllowed(r, "/page")).toBe(true)
})

test("a named agent group beats the wildcard group entirely", () => {
  const r = robots(`
User-agent: *
Disallow: /

User-agent: Googlebot
Allow: /
`)
  expect(isAllowed(r, "/anything", "googlebot")).toBe(true)
  expect(isAllowed(r, "/anything", "bingbot")).toBe(false)
})

test("wildcards and end-of-path anchors are honoured", () => {
  const r = robots(`
User-agent: *
Disallow: /*.pdf$
Disallow: /tmp/*/private
`)
  expect(isAllowed(r, "/files/report.pdf")).toBe(false)
  expect(isAllowed(r, "/files/report.pdf.html")).toBe(true) // $ anchors the match
  expect(isAllowed(r, "/tmp/a/private")).toBe(false)
  expect(isAllowed(r, "/tmp/a/public")).toBe(true)
})

test("an empty Disallow allows everything", () => {
  const r = robots("User-agent: *\nDisallow:")
  expect(isAllowed(r, "/anything")).toBe(true)
})

test("no robots rules at all means allowed", () => {
  expect(isAllowed(robots(""), "/anything")).toBe(true)
})

test("consecutive user-agent lines share one group", () => {
  const r = robots(`
User-agent: Googlebot
User-agent: Bingbot
Disallow: /private
`)
  expect(isAllowed(r, "/private", "googlebot")).toBe(false)
  expect(isAllowed(r, "/private", "bingbot")).toBe(false)
})

test("comments and blank lines are ignored", () => {
  const r = robots(`
# keep bots out of admin
User-agent: *   # everyone
Disallow: /admin   # the admin area
`)
  expect(isAllowed(r, "/admin")).toBe(false)
  expect(isAllowed(r, "/")).toBe(true)
})

test("sitemaps are collected", () => {
  const r = robots("Sitemap: https://example.com/sitemap.xml\nUser-agent: *\nDisallow:")
  expect(r.sitemaps).toEqual(["https://example.com/sitemap.xml"])
})
