import { validateTargetUrl } from "./url-safety"

const MAX_HOPS = 10
const RAW_HTML_CAP = 200_000
const USER_AGENT = "opencode-seo/1.0 (+https://github.com/dav1lex/opencode-seo)"

// Hydration-shell signatures. Any single match flips isJsDependent to true.
const SPA_SHELL = /<(?:div|main)[^>]+id=["'](?:root|app|__next|__nuxt|svelte|q-app)["']/i
const TAG_STRIP = /<(?:script|style|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template)>|<[^>]+>/gi

export type Hop = { url: string; status: number; location: string | null }

export type HttpEvidence = {
  requestedUrl: string
  finalUrl: string
  status: number
  redirectChain: Hop[]
  headers: Record<string, string>
  indexing: {
    xRobotsTag: string | null
    canonicalFromHeader: string | null
    linkHeader: string | null
    contentType: string | null
  }
  raw: {
    html: string | null
    truncated: boolean
    byteLength: number
    textLength: number
    shellDetected: boolean
  }
}

function rawTextLength(html: string): number {
  return html.replace(TAG_STRIP, " ").replace(/\s+/g, " ").trim().length
}

/**
 * A Link header carries many rel types (preconnect, preload, dns-prefetch). Only
 * rel=canonical is an indexing directive, so resolve it here rather than leaving a
 * raw header for a reader to misread as a canonical.
 */
function canonicalFromLinkHeader(header: string | null, base: string): string | null {
  if (!header) return null
  for (const entry of header.split(/,(?=\s*<)/)) {
    const target = entry.match(/<([^>]+)>/)
    const rel = entry.match(/rel\s*=\s*"?([^";]+)"?/i)
    if (!target || !rel) continue
    if (!rel[1].trim().toLowerCase().split(/\s+/).includes("canonical")) continue
    try {
      return new URL(target[1].trim(), base).toString()
    } catch {
      return null
    }
  }
  return null
}

/**
 * Fetches the document at the HTTP level: status, headers, redirect chain, and
 * server-sent HTML. Every hop is re-validated against the SSRF guard, because a
 * public URL is free to redirect into a private network.
 */
export async function fetchHttpEvidence(target: string): Promise<HttpEvidence> {
  const requestedUrl = await validateTargetUrl(target)
  const redirectChain: Hop[] = []
  let url = requestedUrl

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    })

    const location = response.headers.get("location")
    if (response.status >= 300 && response.status < 400 && location) {
      redirectChain.push({ url, status: response.status, location })
      if (hop === MAX_HOPS) throw new Error("Redirect chain exceeded 10 hops")
      url = await validateTargetUrl(new URL(location, url).toString())
      continue
    }

    const headers = Object.fromEntries(response.headers)
    const body = await response.text()
    const truncated = body.length > RAW_HTML_CAP

    return {
      requestedUrl,
      finalUrl: url,
      status: response.status,
      redirectChain,
      headers,
      indexing: {
        xRobotsTag: response.headers.get("x-robots-tag"),
        canonicalFromHeader: canonicalFromLinkHeader(response.headers.get("link"), url),
        linkHeader: response.headers.get("link"),
        contentType: response.headers.get("content-type"),
      },
      raw: {
        html: truncated ? body.slice(0, RAW_HTML_CAP) : body,
        truncated,
        byteLength: body.length,
        textLength: rawTextLength(body),
        shellDetected: SPA_SHELL.test(body),
      },
    }
  }

  throw new Error("Redirect chain exceeded 10 hops")
}
