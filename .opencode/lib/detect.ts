import type { HttpEvidence } from "./http"

/**
 * Deterministic findings.
 *
 * Every rule below is a pure function of collected evidence: a filter, a comparison, or a
 * null check. Asking a model to spot them is asking it to run `.filter()` by eye — it will
 * be right most of the time and quietly miss one on a page with eighty images. These are
 * computed here instead, so they are exhaustive, repeatable, and testable.
 *
 * Rules that need judgment (CONTENT-*, SCHEMA-CONTENT-MISMATCH, TECH-HEADING-CLARITY,
 * SCHEMA-REQUIRED) are deliberately NOT here. They stay with the specialists.
 */

// ponytail: fixed thresholds, tuned against real pages. Move to config only if a real
// site proves them wrong — a knob nobody turns is just a bigger surface area.
const GENERIC_ANCHOR_FLOOR = 3 // below this, generic anchors are noise, not a pattern
const BYTES_PER_PIXEL_CEILING = 3 // a well-compressed photo lands far under 1
const IMAGE_WEIGHT_FLOOR = 100_000 // never flag an image under 100 KB, whatever its box
const JS_DEPENDENT_RATIO = 0.1 // server text under 10% of rendered text
const JS_DEPENDENT_FLOOR = 500 // ...and under 500 chars outright

export type Detected = {
  rule: string
  issue: string
  evidence: string
  fix: string
  priority: "low" | "medium" | "high" | "critical"
  confidence: "low" | "medium" | "high"
  page?: string
}

type Image = {
  src: string | null
  alt: string | null
  attributes: { width: string | null; height: string | null; loading: string | null }
  rendered: { width: number; height: number }
  reservesSpace: boolean
  aboveFold: boolean
  transferSize: number | null
  visible: boolean
}

export type PageEvidence = {
  finalUrl: string
  title: string | null
  description: string | null
  canonical: string | null
  robots: string | null
  language: string | null
  viewport: string | null
  social: { openGraph: Record<string, string>; twitter: Record<string, string> }
  links: {
    anchorQuality: {
      genericAnchors: { text: string | null; href: string }[]
      anchorConflicts: { text: string; urls: string[] }[]
    }
  }
  images: { items: Image[] }
  structuredData: { jsonLd: ({ index: number; error?: string; data?: unknown })[] }
  hreflang: { tags: { lang: string | null; href: string }[]; hasSelfRef: boolean; hasXDefault: boolean }
  domText: string | null
}

const NOINDEX = /\b(noindex|none)\b/i

export function detectFindings(
  evidence: PageEvidence,
  http?: HttpEvidence,
  page?: string,
): Detected[] {
  const found: Detected[] = []
  const add = (f: Omit<Detected, "page">) => found.push(page ? { ...f, page } : f)

  // --- Indexing -------------------------------------------------------------
  const headerNoindex = http?.indexing.xRobotsTag && NOINDEX.test(http.indexing.xRobotsTag)
  const metaNoindex = evidence.robots && NOINDEX.test(evidence.robots)
  if (headerNoindex || metaNoindex) {
    const source = headerNoindex
      ? `X-Robots-Tag response header: "${http!.indexing.xRobotsTag}"`
      : `meta robots: "${evidence.robots}"`
    add({
      rule: "TECH-INDEX-CONFLICT",
      issue: "The page instructs search engines not to index it",
      evidence: `page-${headerNoindex ? "http" : "evidence"}.json: ${source}`,
      fix: headerNoindex
        ? "Remove noindex from the X-Robots-Tag response header if this page should appear in search results"
        : "Remove the noindex value from the robots meta tag if this page should appear in search results",
      priority: "critical",
      confidence: "high",
    })
  }

  // --- Missing metadata -----------------------------------------------------
  const missing = (
    [
      ["title", evidence.title],
      ["meta description", evidence.description],
      ["canonical", evidence.canonical],
      ["html lang", evidence.language],
      ["viewport", evidence.viewport],
    ] as const
  ).filter(([, value]) => !value)
  if (missing.length)
    add({
      rule: "TECH-META-MISSING",
      issue: `Page is missing ${missing.map(([name]) => name).join(", ")}`,
      evidence: `page-evidence.json: ${missing.map(([name]) => `${name}=null`).join(", ")}`,
      fix: `Add ${missing.map(([name]) => name).join(", ")} to the document head`,
      priority: "high",
      confidence: "high",
    })

  // --- Redirects ------------------------------------------------------------
  if (http && http.redirectChain.length) {
    const start = new URL(http.requestedUrl)
    const end = new URL(http.finalUrl)
    const crossesHost = start.hostname !== end.hostname
    const crossesProtocol = start.protocol !== end.protocol
    // One hop for http→https or a trailing slash is normal and not worth a finding.
    if (http.redirectChain.length > 1 || crossesHost) {
      const hops = http.redirectChain.map((h) => `${h.status} ${h.url} -> ${h.location}`).join("; ")
      add({
        rule: "TECH-REDIRECT-CHAIN",
        issue: crossesHost
          ? "The audited URL redirects to a different hostname"
          : `The audited URL redirects ${http.redirectChain.length} times before resolving`,
        evidence: `page-http.json: ${hops}`,
        fix: "Point the original URL at the final destination in a single hop",
        priority: "medium",
        confidence: "high",
      })
    } else if (crossesProtocol) {
      // Single http→https hop: normal, not reported.
    }
  }

  // --- JavaScript dependency ------------------------------------------------
  if (http && evidence.domText) {
    const raw = http.raw.textLength
    const rendered = evidence.domText.length
    if (rendered > 0 && raw < JS_DEPENDENT_FLOOR && raw < rendered * JS_DEPENDENT_RATIO)
      add({
        rule: "TECH-JS-DEPENDENT",
        issue: "Main content is absent from the server response and appears only after JavaScript runs",
        evidence: `page-http.json raw.textLength=${raw} chars${http.raw.shellDetected ? " (hydration shell detected)" : ""}; page-evidence.json domText=${rendered} chars after rendering`,
        fix: "Server-render or pre-render the main content so it is present in the initial HTML response",
        priority: "medium",
        confidence: "high",
      })
  }

  // --- Structured data ------------------------------------------------------
  for (const block of evidence.structuredData.jsonLd) {
    if (!block.error) continue
    add({
      rule: "SCHEMA-PARSE",
      issue: `JSON-LD block ${block.index} does not parse`,
      evidence: `page-evidence.json: structuredData.jsonLd[${block.index}].error = ${block.error}`,
      fix: "Correct the JSON syntax in the block so it parses",
      priority: "high",
      confidence: "high",
    })
  }

  // --- Images ---------------------------------------------------------------
  const visible = evidence.images.items.filter((image) => image.visible)

  const noAlt = visible.filter((image) => image.alt === null)
  if (noAlt.length)
    add({
      rule: "TECH-IMAGE-ALT",
      issue: `${noAlt.length} visible image(s) have no alt attribute`,
      evidence: `page-evidence.json: ${noAlt.slice(0, 5).map((i) => i.src).join(", ")}${noAlt.length > 5 ? `, and ${noAlt.length - 5} more` : ""}`,
      fix: "Add descriptive alt text to meaningful images and alt=\"\" to decorative ones",
      priority: "medium",
      confidence: "high",
    })

  const unsized = visible.filter((image) => !image.reservesSpace)
  if (unsized.length)
    add({
      rule: "TECH-IMAGE-DIMENSIONS",
      issue: `${unsized.length} visible image(s) reserve no space before loading`,
      evidence: `page-evidence.json: ${unsized.slice(0, 5).map((i) => `${i.src} (rendered ${Math.round(i.rendered.width)}x${Math.round(i.rendered.height)}, no width/height attributes, no CSS aspect-ratio)`).join("; ")}`,
      fix: "Add matching width and height attributes, or a CSS aspect-ratio, to each image",
      priority: "medium",
      confidence: "high",
    })

  const lazyAboveFold = visible.filter(
    (image) => image.aboveFold && image.attributes.loading === "lazy",
  )
  if (lazyAboveFold.length)
    add({
      rule: "TECH-IMAGE-LAZY-LCP",
      issue: `${lazyAboveFold.length} image(s) above the fold are lazy-loaded`,
      evidence: `page-evidence.json: ${lazyAboveFold.map((i) => i.src).join(", ")} carry loading="lazy" while rendered inside the initial viewport`,
      fix: 'Remove loading="lazy" from above-the-fold images; add fetchpriority="high" to the largest one',
      priority: "medium",
      confidence: "high",
    })

  const heavy = visible.filter((image) => {
    if (image.transferSize === null || image.transferSize < IMAGE_WEIGHT_FLOOR) return false
    const pixels = image.rendered.width * image.rendered.height
    return pixels > 0 && image.transferSize / pixels > BYTES_PER_PIXEL_CEILING
  })
  if (heavy.length)
    add({
      rule: "TECH-IMAGE-WEIGHT",
      issue: `${heavy.length} image(s) transfer far more bytes than their rendered size justifies`,
      evidence: `page-evidence.json: ${heavy.map((i) => `${i.src} = ${Math.round(i.transferSize! / 1024)} KB for a ${Math.round(i.rendered.width)}x${Math.round(i.rendered.height)} box`).join("; ")}`,
      fix: "Re-encode as WebP or AVIF at the rendered size, and serve responsive sizes via srcset",
      priority: "medium",
      confidence: "high",
    })

  // --- Links ----------------------------------------------------------------
  const { genericAnchors, anchorConflicts } = evidence.links.anchorQuality
  if (genericAnchors.length >= GENERIC_ANCHOR_FLOOR)
    add({
      rule: "TECH-LINK-ANCHOR-GENERIC",
      issue: `${genericAnchors.length} internal links use non-descriptive anchor text`,
      evidence: `page-evidence.json: ${[...new Set(genericAnchors.map((a) => `"${a.text}"`))].slice(0, 6).join(", ")}`,
      fix: "Replace generic anchors with text naming the destination page",
      priority: "low",
      confidence: "high",
    })

  for (const conflict of anchorConflicts)
    add({
      rule: "TECH-LINK-ANCHOR-CONFLICT",
      issue: `Anchor text "${conflict.text}" points to ${conflict.urls.length} different destinations`,
      evidence: `page-evidence.json: "${conflict.text}" -> ${conflict.urls.join(", ")}`,
      fix: "Give each destination anchor text that distinguishes it from the others",
      priority: "low",
      confidence: "high",
    })

  // --- hreflang -------------------------------------------------------------
  if (evidence.hreflang.tags.length && !evidence.hreflang.hasSelfRef)
    add({
      rule: "HREFLANG-SELF-MISSING",
      issue: "The page declares hreflang alternates but none of them point back to itself",
      evidence: `page-evidence.json: ${evidence.hreflang.tags.length} hreflang tag(s), hasSelfRef=false, hasXDefault=${evidence.hreflang.hasXDefault}; page URL is ${evidence.finalUrl}`,
      fix: `Add a self-referencing hreflang tag pointing at ${evidence.finalUrl}`,
      priority: "medium",
      confidence: "high",
    })

  // --- Social preview -------------------------------------------------------
  const og = evidence.social.openGraph
  const missingOg = ["og:title", "og:description", "og:image"].filter((key) => !og[key])
  if (missingOg.length)
    add({
      rule: "TECH-SOCIAL-PREVIEW",
      issue: `Open Graph metadata is missing ${missingOg.join(", ")}`,
      evidence: `page-evidence.json: social.openGraph has ${Object.keys(og).length ? Object.keys(og).join(", ") : "no properties"}`,
      fix: `Add ${missingOg.join(", ")} to the document head`,
      priority: "low",
      confidence: "high",
    })

  return found
}
