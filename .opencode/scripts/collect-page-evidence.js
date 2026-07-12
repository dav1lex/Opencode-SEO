({ document = globalThis.document, location = globalThis.location } = {}) => {
  const text = (value) => value?.trim().replace(/\s+/g, " ") || null
  const content = (selector) =>
    text(document.querySelector(selector)?.getAttribute("content"))
  const attr = (selector, name) =>
    text(document.querySelector(selector)?.getAttribute(name))
  const list = (selector) => [...document.querySelectorAll(selector)]

  const structuredData = list('script[type="application/ld+json"]').map(
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
    return {
      href: url.href,
      text: text(node.textContent),
      internal: url.origin === location.origin,
      rel: text(node.getAttribute("rel")),
    }
  })

  const visibleText = text(document.body?.innerText)

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
      internal: links.filter((link) => link.internal).length,
      external: links.filter((link) => !link.internal).length,
      items: links,
      truncated: allLinks.length > links.length,
    },
    images: list("img").slice(0, 300).map((node) => ({
      src: text(node.currentSrc || node.src),
      alt: node.hasAttribute("alt") ? node.getAttribute("alt") : null,
      width: node.getAttribute("width"),
      height: node.getAttribute("height"),
      loading: node.getAttribute("loading"),
    })),
    structuredData,
    visibleText: visibleText?.slice(0, 50000) || null,
    counts: {
      words: (visibleText || "").split(/\s+/).filter(Boolean).length,
      forms: list("form").length,
      buttons: list("button").length,
    },
  }
}
