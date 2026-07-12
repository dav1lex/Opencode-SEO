import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

test("page evidence collector returns stable core fields", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)
  const document = {
    title: "  Example   Page ",
    documentElement: { lang: "en" },
    body: {
      innerText: "Useful page content",
      cloneNode: () => ({
        textContent: "Useful page content",
        querySelectorAll: () => [],
      }),
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  const location = {
    href: process.env.PAGE_EVIDENCE_TEST_URL || "",
    origin: process.env.PAGE_EVIDENCE_TEST_ORIGIN || "",
  }
  const performance = { getEntriesByType: () => [] }
  const getComputedStyle = () => ({ aspectRatio: "auto" })

  const result = collector({ document, location, performance, getComputedStyle })

  expect(result.title).toBe("Example Page")
  expect(result.language).toBe("en")
  expect(result.counts.words).toBe(3)
  expect(result.structuredData).toEqual({ jsonLd: [] })
  expect(result.links.nonHttp).toBe(0)
  expect(result.navigation).toBeNull()
})
