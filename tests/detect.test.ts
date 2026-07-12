import { expect, test } from "bun:test"
import { detectFindings, type PageEvidence } from "../.opencode/lib/detect"
import { validateFindings } from "../.opencode/lib/findings"
import type { HttpEvidence } from "../.opencode/lib/http"

const URL_ = "https://example.com/"

function evidence(overrides: Partial<PageEvidence> = {}): PageEvidence {
  return {
    finalUrl: URL_,
    title: "A title",
    description: "A description",
    canonical: URL_,
    robots: null,
    language: "en",
    viewport: "width=device-width",
    social: {
      openGraph: { "og:title": "t", "og:description": "d", "og:image": "i" },
      twitter: {},
    },
    links: { anchorQuality: { genericAnchors: [], anchorConflicts: [] } },
    images: { items: [] },
    structuredData: { jsonLd: [] },
    hreflang: { tags: [], hasSelfRef: false, hasXDefault: false },
    domText: "plenty of server rendered text here",
    ...overrides,
  }
}

function http(overrides: Partial<HttpEvidence> = {}): HttpEvidence {
  return {
    requestedUrl: URL_,
    finalUrl: URL_,
    status: 200,
    redirectChain: [],
    headers: {},
    indexing: { xRobotsTag: null, canonicalFromHeader: null, linkHeader: null, contentType: null },
    raw: { html: "x", truncated: false, byteLength: 40, textLength: 35, shellDetected: false },
    ...overrides,
  }
}

const image = (over: Partial<PageEvidence["images"]["items"][number]> = {}) => ({
  src: "https://example.com/a.png",
  alt: "a",
  attributes: { width: "10", height: "10", loading: null },
  rendered: { width: 10, height: 10 },
  reservesSpace: true,
  aboveFold: false,
  transferSize: 1000,
  visible: true,
  ...over,
})

test("a clean page yields no findings", () => {
  expect(detectFindings(evidence(), http())).toEqual([])
})

test("everything it emits survives the validator untouched", () => {
  const found = detectFindings(
    evidence({
      title: null,
      robots: "noindex",
      images: { items: [image({ alt: null, reservesSpace: false })] },
      structuredData: { jsonLd: [{ index: 0, error: "Unexpected token" }] },
      hreflang: { tags: [{ lang: "fr", href: "https://example.com/fr" }], hasSelfRef: false, hasXDefault: false },
      social: { openGraph: {}, twitter: {} },
    }),
    http(),
  )
  expect(found.length).toBeGreaterThan(5)
  expect(() => validateFindings(found, URL_)).not.toThrow()
})

test("an X-Robots-Tag noindex is caught even when the meta tag is clean", () => {
  const [found] = detectFindings(
    evidence({ robots: "index, follow" }),
    http({ indexing: { xRobotsTag: "noindex", canonicalFromHeader: null, linkHeader: null, contentType: null } }),
  )
  expect(found.rule).toBe("TECH-INDEX-CONFLICT")
  expect(found.priority).toBe("critical")
  expect(found.evidence).toContain("X-Robots-Tag")
})

test("a single http-to-https hop is not a redirect finding", () => {
  const found = detectFindings(
    evidence(),
    http({
      requestedUrl: "http://example.com/",
      finalUrl: "https://example.com/",
      redirectChain: [{ url: "http://example.com/", status: 301, location: "https://example.com/" }],
    }),
  )
  expect(found.filter((f) => f.rule === "TECH-REDIRECT-CHAIN")).toEqual([])
})

test("a redirect crossing hostnames is a finding", () => {
  const found = detectFindings(
    evidence(),
    http({
      requestedUrl: "https://example.com/",
      finalUrl: "https://elsewhere.com/",
      redirectChain: [{ url: "https://example.com/", status: 301, location: "https://elsewhere.com/" }],
    }),
  )
  expect(found.some((f) => f.rule === "TECH-REDIRECT-CHAIN")).toBe(true)
})

test("an unreported transferSize never becomes an image-weight finding", () => {
  // null means the browser did not tell us (cache hit, cross-origin). Not "small".
  const found = detectFindings(
    evidence({
      images: { items: [image({ transferSize: null, rendered: { width: 10, height: 10 } })] },
    }),
    http(),
  )
  expect(found.filter((f) => f.rule === "TECH-IMAGE-WEIGHT")).toEqual([])
})

test("a heavy image for its rendered box is a finding", () => {
  const found = detectFindings(
    evidence({
      images: {
        items: [image({ transferSize: 1_400_000, rendered: { width: 200, height: 200 } })],
      },
    }),
    http(),
  )
  expect(found.some((f) => f.rule === "TECH-IMAGE-WEIGHT")).toBe(true)
})

test("lazy loading below the fold is correct and not reported", () => {
  const found = detectFindings(
    evidence({
      images: { items: [image({ aboveFold: false, attributes: { width: "10", height: "10", loading: "lazy" } })] },
    }),
    http(),
  )
  expect(found.filter((f) => f.rule === "TECH-IMAGE-LAZY-LCP")).toEqual([])
})

test("lazy loading above the fold is reported", () => {
  const found = detectFindings(
    evidence({
      images: { items: [image({ aboveFold: true, attributes: { width: "10", height: "10", loading: "lazy" } })] },
    }),
    http(),
  )
  expect(found.some((f) => f.rule === "TECH-IMAGE-LAZY-LCP")).toBe(true)
})

test("a hydration shell with no server text is JS-dependent", () => {
  const found = detectFindings(
    evidence({ domText: "x".repeat(5000) }),
    http({ raw: { html: "<div id=__next></div>", truncated: false, byteLength: 30, textLength: 0, shellDetected: true } }),
  )
  expect(found.some((f) => f.rule === "TECH-JS-DEPENDENT")).toBe(true)
})

test("a server-rendered page is not JS-dependent", () => {
  const found = detectFindings(
    evidence({ domText: "x".repeat(5000) }),
    http({ raw: { html: "...", truncated: false, byteLength: 6000, textLength: 4800, shellDetected: false } }),
  )
  expect(found.filter((f) => f.rule === "TECH-JS-DEPENDENT")).toEqual([])
})

test("one or two generic anchors are noise, not a pattern", () => {
  const anchors = [{ text: "here", href: "https://example.com/a" }]
  const found = detectFindings(
    evidence({ links: { anchorQuality: { genericAnchors: anchors, anchorConflicts: [] } } }),
    http(),
  )
  expect(found.filter((f) => f.rule === "TECH-LINK-ANCHOR-GENERIC")).toEqual([])
})

test("hreflang tags with no self-reference are reported", () => {
  const found = detectFindings(
    evidence({
      hreflang: {
        tags: [{ lang: "fr", href: "https://example.com/fr" }],
        hasSelfRef: false,
        hasXDefault: true,
      },
    }),
    http(),
  )
  expect(found.some((f) => f.rule === "HREFLANG-SELF-MISSING")).toBe(true)
})

test("robots.txt is matched, not read: longest rule decides", () => {
  const blocked = detectFindings(evidence({ finalUrl: "https://example.com/admin/secret" }), http(), undefined, {
    robotsTxt: "User-agent: *\nDisallow: /admin\nAllow: /admin/public\n",
  })
  expect(blocked.some((f) => f.rule === "TECH-ROBOTS-BLOCK")).toBe(true)

  const allowed = detectFindings(evidence({ finalUrl: "https://example.com/admin/public/x" }), http(), undefined, {
    robotsTxt: "User-agent: *\nDisallow: /admin\nAllow: /admin/public\n",
  })
  expect(allowed.filter((f) => f.rule === "TECH-ROBOTS-BLOCK")).toEqual([])
})

test("an absent robots.txt is default-allow, not a defect", () => {
  const found = detectFindings(evidence(), http(), undefined, {})
  expect(found.filter((f) => f.rule === "TECH-ROBOTS-BLOCK")).toEqual([])
})

test("broken internal links are reported with their status", () => {
  const found = detectFindings(evidence(), http(), undefined, {
    linkStatuses: [
      { url: "https://example.com/ok", status: 200 },
      { url: "https://example.com/blog", status: 404 },
      { url: "https://example.com/dead", status: null, error: "ECONNREFUSED" },
    ],
  })
  const broken = found.find((f) => f.rule === "TECH-LINK-BROKEN")
  expect(broken).toBeDefined()
  expect(broken!.issue).toContain("2 internal link(s)")
  expect(broken!.evidence).toContain("/blog -> 404")
  expect(broken!.evidence).toContain("ECONNREFUSED")
  expect(broken!.priority).toBe("high")
})

test("a 3xx link is not broken", () => {
  const found = detectFindings(evidence(), http(), undefined, {
    linkStatuses: [{ url: "https://example.com/moved", status: 301 }],
  })
  expect(found.filter((f) => f.rule === "TECH-LINK-BROKEN")).toEqual([])
})
