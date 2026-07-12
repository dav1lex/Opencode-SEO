({
  document = globalThis.document,
  location = globalThis.location,
  performance = globalThis.performance,
  getComputedStyle = globalThis.getComputedStyle,
  viewportHeight = globalThis.innerHeight ?? 0,
} = {}) => {
  const text = (value) => value?.trim().replace(/\s+/g, " ") || null
  const content = (selector) =>
    text(document.querySelector(selector)?.getAttribute("content"))
  const attr = (selector, name) =>
    text(document.querySelector(selector)?.getAttribute(name))
  const list = (selector) => [...document.querySelectorAll(selector)]

  const jsonLd = list('script[type="application/ld+json"]').map(
    (node, index) => {
      try {
        return { index, data: JSON.parse(node.textContent || "") }
      } catch (error) {
        return { index, error: String(error) }
      }
    },
  )

  const allLinks = list("a[href]")
  const LINK_CAP = 500
  const links = allLinks.slice(0, LINK_CAP).map((node) => {
    try {
      const href = node.getAttribute("href")
      const url = new URL(href, location.href)
      const kind =
        url.protocol === "http:" || url.protocol === "https:"
          ? url.origin === location.origin
            ? "internal"
            : "external"
          : url.protocol.replace(":", "")
      return {
        href: url.href,
        text: text(node.textContent),
        kind,
        rel: text(node.getAttribute("rel")),
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  const normalizeUrl = (urlStr) => {
    try {
      const u = new URL(urlStr, location.href)
      let pathname = u.pathname
      if (pathname !== "/" && pathname.endsWith("/")) pathname = pathname.slice(0, -1)
      return u.origin + pathname + u.search
    } catch {
      return null
    }
  }
  const currentUrlNorm = normalizeUrl(location.href)

  const hreflangRaw = list('link[rel="alternate"][hreflang]').map((node) => ({
    lang: node.getAttribute("hreflang")?.toLowerCase() || null,
    href: node.getAttribute("href"),
  }))
  const hreflang = hreflangRaw
    .map((h) => {
      const resolvedHref = normalizeUrl(h.href)
      return resolvedHref ? { lang: h.lang, href: resolvedHref } : null
    })
    .filter(Boolean)

  const hasSelfRef = hreflang.some((h) => h.href === currentUrlNorm)
  const hasXDefault = hreflangRaw.some((h) => h.lang === "x-default")

  // Per-resource byte weight, so image weight is measured rather than guessed from a
  // network log. transferSize is 0 on a cache hit and for cross-origin responses that
  // send no Timing-Allow-Origin header; treat 0 as unknown, never as "small".
  const resourceBytes = new Map(
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.initiatorType === "img" && entry.transferSize > 0)
      .map((entry) => [entry.name, entry.transferSize]),
  )

  const visibleText = text(document.body?.innerText)
  const bodyClone = document.body?.cloneNode(true)
  bodyClone
    ?.querySelectorAll("script, style, noscript, template, svg")
    .forEach((node) => node.remove())
  const domText = text(bodyClone?.textContent)
  const navigation = performance.getEntriesByType("navigation")[0]

  return {
    finalUrl: location.href,
    title: text(document.title),
    description: content('meta[name="description"]'),
    canonical: attr('link[rel="canonical"]', "href"),
    robots: content('meta[name="robots"]'),
    language: text(document.documentElement.lang),
    viewport: content('meta[name="viewport"]'),
    social: {
      openGraph: Object.fromEntries(
        list('meta[property^="og:"]').map((node) => [
          node.getAttribute("property"),
          text(node.getAttribute("content")),
        ]),
      ),
      twitter: Object.fromEntries(
        list('meta[name^="twitter:"]').map((node) => [
          node.getAttribute("name"),
          text(node.getAttribute("content")),
        ]),
      ),
    },
    headings: list("h1, h2, h3, h4, h5, h6").map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: text(node.textContent),
    })),
    links: {
      total: allLinks.length,
      internal: links.filter((link) => link.kind === "internal").length,
      external: links.filter((link) => link.kind === "external").length,
      nonHttp: links.filter(
        (link) => link.kind !== "internal" && link.kind !== "external",
      ).length,
      items: links,
      truncated: allLinks.length > LINK_CAP,
      anchorQuality: (() => {
        const internalLinks = links.filter((l) => l.kind === "internal")
        const generic = /^(click here|here|read more|learn more|more|details|link|this|go|visit|page|click|submit|download|continue|next|previous|back|home|enter|follow us)$/i
        const genericAnchors = internalLinks.filter((l) => generic.test(l.text || "")).map((l) => ({ text: l.text, href: l.href }))
        const byText = new Map()
        for (const l of internalLinks) {
          if (!l.text) continue
          const key = l.text.toLowerCase()
          if (!byText.has(key)) byText.set(key, [])
          byText.get(key).push(l.href)
        }
        const conflicts = [...byText.entries()]
          .filter(([, urls]) => new Set(urls).size > 1)
          .map(([text, urls]) => ({ text, urls: [...new Set(urls)] }))
        return { genericAnchors, anchorConflicts: conflicts }
      })(),
    },
    images: (() => {
      const allImages = list("img")
      const items = allImages.slice(0, 300).map((node) => {
        const box = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        const src = text(node.currentSrc || node.src)
        // A width/height attribute pair or a CSS aspect-ratio reserves the box before
        // the bytes land. Without either, the image shifts the layout when it loads.
        const reservesSpace =
          (!!node.getAttribute("width") && !!node.getAttribute("height")) ||
          (style.aspectRatio !== "auto" && !!style.aspectRatio)
        return {
          src,
          alt: node.hasAttribute("alt") ? node.getAttribute("alt") : null,
          attributes: {
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            loading: node.getAttribute("loading"),
          },
          intrinsic: { width: node.naturalWidth, height: node.naturalHeight },
          rendered: { width: box.width, height: box.height },
          aspectRatio: style.aspectRatio,
          reservesSpace,
          aboveFold: box.top < viewportHeight && box.bottom > 0,
          transferSize: src ? (resourceBytes.get(src) ?? null) : null,
          visible:
            box.width > 0 &&
            box.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden",
        }
      })
      return {
        total: allImages.length,
        items,
        truncated: allImages.length > 300,
      }
    })(),
    structuredData: { jsonLd },
    hreflang: { tags: hreflang, hasSelfRef, hasXDefault },
    visibleText: visibleText?.slice(0, 50000) || null,
    domText: domText?.slice(0, 50000) || null,
    navigation: navigation
      ? {
          status: navigation.responseStatus || null,
          protocol: navigation.nextHopProtocol || null,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize,
          ttfb: Math.round(navigation.responseStart),
        }
      : null,
  }
}
