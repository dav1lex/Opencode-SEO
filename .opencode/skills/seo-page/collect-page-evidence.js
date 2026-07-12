({
  document = globalThis.document,
  location = globalThis.location,
  performance = globalThis.performance,
  getComputedStyle = globalThis.getComputedStyle,
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
  const links = allLinks.slice(0, 500).map((node) => {
    const url = new URL(node.href, location.href)
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
  })

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
      truncated: allLinks.length > links.length,
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
    images: list("img").slice(0, 300).map((node) => {
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        src: text(node.currentSrc || node.src),
        alt: node.hasAttribute("alt") ? node.getAttribute("alt") : null,
        attributes: {
          width: node.getAttribute("width"),
          height: node.getAttribute("height"),
          loading: node.getAttribute("loading"),
        },
        intrinsic: { width: node.naturalWidth, height: node.naturalHeight },
        rendered: { width: box.width, height: box.height },
        aspectRatio: style.aspectRatio,
        visible:
          box.width > 0 &&
          box.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden",
      }
    }),
    structuredData: { jsonLd },
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
    counts: {
      words: (visibleText || "").split(/\s+/).filter(Boolean).length,
      forms: list("form").length,
      buttons: list("button").length,
    },
  }
}
