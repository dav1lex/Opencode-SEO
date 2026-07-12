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
  expect(result.images).toEqual({ total: 0, items: [], truncated: false })
  expect(result.structuredData).toEqual({ jsonLd: [] })
  expect(result.hreflang.hasSelfRef).toBe(false)
  expect(result.links.nonHttp).toBe(0)
  expect(result.navigation).toBeNull()
})

test("SVG <a> resolves from its href attribute, not the SVGAnimatedString property", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)

  const htmlLink = {
    href: "https://example.com/page",
    textContent: "HTML link",
    getAttribute: (name) => (name === "href" ? "https://example.com/page" : null),
  }
  // On a real SVGAElement, `.href` is an SVGAnimatedString that stringifies to
  // "[object SVGAnimatedString]", while getAttribute("href") returns the real value.
  const svgLink = {
    href: { toString: () => "[object SVGAnimatedString]" },
    textContent: "SVG link",
    getAttribute: (name) => (name === "href" ? "/svg-target" : null),
  }
  // Unparseable href: skipped rather than emitted as junk.
  const brokenLink = {
    href: "",
    textContent: "broken",
    getAttribute: (name) => (name === "href" ? "http://[bad" : null),
  }

  const document = {
    title: "Test",
    documentElement: { lang: "en" },
    body: {
      innerText: "Test",
      cloneNode: () => ({ textContent: "Test", querySelectorAll: () => [] }),
    },
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === "a[href]" ? [htmlLink, svgLink, brokenLink] : []),
  }
  const location = { href: "https://example.com/", origin: "https://example.com" }
  const performance = { getEntriesByType: () => [] }
  const getComputedStyle = () => ({ aspectRatio: "auto" })

  const result = collector({ document, location, performance, getComputedStyle })

  expect(result.links.total).toBe(3)
  expect(result.links.items.map((link) => link.href)).toEqual([
    "https://example.com/page",
    "https://example.com/svg-target",
  ])
  // Skipped links must not be mistaken for a cap overflow.
  expect(result.links.truncated).toBe(false)
})

test("hasSelfRef is true only when hreflang tag resolves to current page", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)

  const currentUrl = "https://example.com/page/"

  const tagXDefault = { getAttribute: (n) => n === "hreflang" ? "x-default" : "https://example.com/other" }
  const tagForeignLang = { getAttribute: (n) => n === "hreflang" ? "fr" : "https://example.com/fr/" }
  const tagSelfRef = { getAttribute: (n) => n === "hreflang" ? "en" : currentUrl }

  const document = {
    title: "Test",
    documentElement: { lang: "en" },
    body: { innerText: "Test", cloneNode: () => ({ textContent: "Test", querySelectorAll: () => [] }) },
    querySelector: () => null,
    querySelectorAll: (sel) => sel === 'link[rel="alternate"][hreflang]' ? [tagXDefault, tagForeignLang, tagSelfRef] : [],
  }
  const location = { href: currentUrl, origin: "https://example.com" }
  const performance = { getEntriesByType: () => [] }
  const getComputedStyle = () => ({ aspectRatio: "auto" })

  const result = collector({ document, location, performance, getComputedStyle })

  expect(result.hreflang.hasXDefault).toBe(true)
  expect(result.hreflang.hasSelfRef).toBe(true)
})

test("images object includes total, items, and truncated flag", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)

  const mockImage = (i) => ({
    currentSrc: null,
    src: `/img${i}.jpg`,
    hasAttribute: () => true,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 100, height: 100 }),
    naturalWidth: 100,
    naturalHeight: 100,
  })

  const images = Array.from({ length: 350 }, (_, i) => mockImage(i))

  const document = {
    title: "Test",
    documentElement: { lang: "en" },
    body: { innerText: "Test", cloneNode: () => ({ textContent: "Test", querySelectorAll: () => [] }) },
    querySelector: () => null,
    querySelectorAll: (sel) => sel === "img" ? images : [],
  }
  const location = { href: "https://example.com/", origin: "https://example.com" }
  const performance = { getEntriesByType: () => [] }
  const getComputedStyle = () => ({ aspectRatio: "auto" })

  const result = collector({ document, location, performance, getComputedStyle })

  expect(result.images.total).toBe(350)
  expect(result.images.items.length).toBe(300)
  expect(result.images.truncated).toBe(true)
})

test("computes reservesSpace, aboveFold, and transferSize for images", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)

  const img = (attrs, box, style) => ({
    currentSrc: attrs.src,
    src: attrs.src,
    naturalWidth: 100,
    naturalHeight: 100,
    hasAttribute: (n) => n === "alt",
    getAttribute: (n) => (n === "alt" ? "x" : (attrs[n] ?? null)),
    getBoundingClientRect: () => box,
  })

  // Reserves space via width/height attributes; below the fold; lazy is correct here.
  const sized = img(
    { src: "https://example.com/a.png", width: "800", height: "600", loading: "lazy" },
    { width: 800, height: 600, top: 2000, bottom: 2600 },
  )
  // No dimensions, no aspect-ratio, above the fold, lazy-loaded: two defects.
  const unsized = img(
    { src: "https://example.com/b.png", loading: "lazy" },
    { width: 400, height: 300, top: 10, bottom: 310 },
  )

  const styles = new Map([
    [sized, { aspectRatio: "auto", display: "block", visibility: "visible" }],
    [unsized, { aspectRatio: "auto", display: "block", visibility: "visible" }],
  ])

  const document = {
    title: "T",
    documentElement: { lang: "en" },
    body: { innerText: "T", cloneNode: () => ({ textContent: "T", querySelectorAll: () => [] }) },
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === "img" ? [sized, unsized] : []),
  }
  const performance = {
    getEntriesByType: (type) =>
      type === "resource"
        ? [
            { name: "https://example.com/a.png", initiatorType: "img", transferSize: 45_000 },
            // transferSize 0 means "not reported", and must not become 0 bytes.
            { name: "https://example.com/b.png", initiatorType: "img", transferSize: 0 },
          ]
        : [],
  }

  const result = collector({
    document,
    location: { href: "https://example.com/", origin: "https://example.com" },
    performance,
    getComputedStyle: (node) => styles.get(node),
    viewportHeight: 800,
  })

  const [a, b] = result.images.items
  expect(a.reservesSpace).toBe(true)
  expect(a.aboveFold).toBe(false)
  expect(a.transferSize).toBe(45_000)

  expect(b.reservesSpace).toBe(false)
  expect(b.aboveFold).toBe(true)
  expect(b.attributes.loading).toBe("lazy")
  expect(b.transferSize).toBeNull()
})

test("a CSS aspect-ratio alone reserves space", () => {
  const source = readFileSync(
    new URL("../.opencode/skills/seo-page/collect-page-evidence.js", import.meta.url),
    "utf8",
  )
  const collector = eval(source)

  const node = {
    currentSrc: "https://example.com/c.png",
    src: "https://example.com/c.png",
    naturalWidth: 10,
    naturalHeight: 10,
    hasAttribute: () => false,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 300, height: 150, top: 0, bottom: 150 }),
  }

  const result = collector({
    document: {
      title: "T",
      documentElement: { lang: "en" },
      body: { innerText: "T", cloneNode: () => ({ textContent: "T", querySelectorAll: () => [] }) },
      querySelector: () => null,
      querySelectorAll: (sel) => (sel === "img" ? [node] : []),
    },
    location: { href: "https://example.com/", origin: "https://example.com" },
    performance: { getEntriesByType: () => [] },
    getComputedStyle: () => ({ aspectRatio: "2 / 1", display: "block", visibility: "visible" }),
    viewportHeight: 800,
  })

  expect(result.images.items[0].reservesSpace).toBe(true)
})
